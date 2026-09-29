/**
 * TRENDING STUDIO — BROWSER OFFLINE-FIRST DATABASE (IndexedDB)
 * Stores local product catalog, customers, pricing matrix, and offline queue.
 * Ensures the POS operates with 100% functionality during internet outages.
 */

const DB_NAME = 'trending_studio_offline_db';
const DB_VERSION = 1;

export interface IOfflineQueueItem {
  operationId: string;
  entity: 'invoice' | 'customer' | 'payment';
  operationType: 'CREATE' | 'UPDATE';
  payload: any;
  createdAt: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  error?: string;
}

class OfflineDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this browser'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Masters stores
        if (!db.objectStoreNames.contains('products')) {
          const store = db.createObjectStore('products', { keyPath: '_id' });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('barcode', 'barcode', { unique: false });
        }

        if (!db.objectStoreNames.contains('customers')) {
          const store = db.createObjectStore('customers', { keyPath: '_id' });
          store.createIndex('mobile', 'mobile', { unique: false });
        }

        if (!db.objectStoreNames.contains('photoPrices')) {
          db.createObjectStore('photoPrices', { keyPath: 'size' });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Transactions & Sync Queue stores
        if (!db.objectStoreNames.contains('offlineQueue')) {
          const store = db.createObjectStore('offlineQueue', { keyPath: 'operationId' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('offlineInvoices')) {
          db.createObjectStore('offlineInvoices', { keyPath: '_id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- Masters Caching ---

  public async cacheProducts(products: any[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('products', 'readwrite');
      const store = tx.objectStore('products');
      await store.clear();
      for (const p of products) {
        store.put(p);
      }
      localStorage.setItem('ts_offline_products_updated', new Date().toISOString());
    } catch (err) {
      console.warn('[OfflineDB] Failed to cache products:', err);
    }
  }

  public async getCachedProducts(): Promise<any[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('products', 'readonly');
        const store = tx.objectStore('products');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async cacheCustomers(customers: any[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('customers', 'readwrite');
      const store = tx.objectStore('customers');
      for (const c of customers) {
        store.put(c);
      }
    } catch (err) {
      console.warn('[OfflineDB] Failed to cache customers:', err);
    }
  }

  public async getCachedCustomers(search?: string): Promise<any[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('customers', 'readonly');
        const store = tx.objectStore('customers');
        const req = store.getAll();
        req.onsuccess = () => {
          let list = req.result || [];
          if (search) {
            const s = search.toLowerCase();
            list = list.filter(
              (c: any) =>
                c.name?.toLowerCase().includes(s) ||
                c.mobile?.includes(s) ||
                c.gstin?.toLowerCase().includes(s)
            );
          }
          resolve(list);
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async cachePhotoPrices(prices: any[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('photoPrices', 'readwrite');
      const store = tx.objectStore('photoPrices');
      for (const p of prices) {
        store.put(p);
      }
    } catch (err) {
      console.warn('[OfflineDB] Failed to cache photo prices:', err);
    }
  }

  public async getCachedPhotoPrices(): Promise<any[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('photoPrices', 'readonly');
        const store = tx.objectStore('photoPrices');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  // --- Offline Queue & Billing ---

  public async saveOfflineInvoice(invoiceData: any): Promise<any> {
    const db = await this.getDB();
    const offlineSeq = (parseInt(localStorage.getItem('ts_offline_seq') || '100', 10) + 1).toString();
    localStorage.setItem('ts_offline_seq', offlineSeq);

    const localId = invoiceData._id || invoiceData.id || `OFFLINE_TS_${Date.now()}_${offlineSeq}`;
    const invNumber = invoiceData.invoiceNumber || `OFFLINE-TS-${offlineSeq}`;
    const syncStatus = invoiceData.syncStatus || 'PENDING';
    const isOffline = invoiceData.isOffline ?? (syncStatus === 'PENDING');

    const fullInvoice = {
      ...invoiceData,
      _id: localId,
      id: localId,
      invoiceNumber: invNumber,
      isOffline,
      syncStatus,
      createdAt: invoiceData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Save to offlineInvoices store
    const tx = db.transaction(['offlineInvoices', 'offlineQueue'], 'readwrite');
    tx.objectStore('offlineInvoices').put(fullInvoice);

    // 2. Add to offlineQueue for background sync if pending
    if (syncStatus === 'PENDING') {
      const queueItem: IOfflineQueueItem = {
        operationId: `op_inv_${localId}`,
        entity: 'invoice',
        operationType: 'CREATE',
        payload: fullInvoice,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
      };
      tx.objectStore('offlineQueue').put(queueItem);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent('offline-queue-changed'));
        resolve(fullInvoice);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getPendingQueue(): Promise<IOfflineQueueItem[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('offlineQueue', 'readonly');
        const store = tx.objectStore('offlineQueue');
        const req = store.getAll();
        req.onsuccess = () => {
          const list = req.result || [];
          resolve(list.filter((item: IOfflineQueueItem) => item.status === 'PENDING'));
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async getPendingCount(): Promise<number> {
    const list = await this.getPendingQueue();
    return list.length;
  }

  public async getOfflineInvoices(): Promise<any[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction('offlineInvoices', 'readonly');
        const store = tx.objectStore('offlineInvoices');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async markInvoiceSynced(invoiceId: string, serverId?: string, invoiceNumber?: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['offlineInvoices', 'offlineQueue'], 'readwrite');
      const invStore = tx.objectStore('offlineInvoices');
      const queueStore = tx.objectStore('offlineQueue');

      const invReq = invStore.getAll();
      invReq.onsuccess = () => {
        for (const inv of invReq.result || []) {
          if (inv._id === invoiceId || inv.id === invoiceId || `op_inv_${inv._id}` === invoiceId) {
            inv.syncStatus = 'SYNCED';
            inv.isOffline = false;
            if (invoiceNumber) {
              inv.officialInvoiceNumber = invoiceNumber;
              inv.invoiceNumber = invoiceNumber;
            }
            invStore.put(inv);
          }
        }
      };

      const qReq = queueStore.getAll();
      qReq.onsuccess = () => {
        for (const item of qReq.result || []) {
          if (
            item.operationId === invoiceId ||
            item.operationId === `op_inv_${invoiceId}` ||
            item.payload?._id === invoiceId ||
            item.payload?.id === invoiceId
          ) {
            item.status = 'SYNCED';
            queueStore.put(item);
          }
        }
      };

      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent('offline-queue-changed'));
      };
    } catch (err) {
      console.error('[OfflineDB] Error marking invoice synced:', err);
    }
  }

  public async markQueueItemSynced(operationId: string, serverId: string, invoiceNumber?: string): Promise<void> {
    return this.markInvoiceSynced(operationId, serverId, invoiceNumber);
  }

  public async getOfflineStats(): Promise<{
    totalInvoices: number;
    pendingInvoices: number;
    totalCustomers: number;
    totalProducts: number;
    pendingQueueCount: number;
  }> {
    try {
      const [invoices, customers, products, pendingQueue] = await Promise.all([
        this.getOfflineInvoices(),
        this.getCachedCustomers(),
        this.getCachedProducts(),
        this.getPendingQueue(),
      ]);

      const pendingInvoices = invoices.filter(
        (inv: any) => inv.syncStatus !== 'SYNCED' || inv.isOffline === true
      ).length;

      return {
        totalInvoices: invoices.length,
        pendingInvoices,
        totalCustomers: customers.length,
        totalProducts: products.length,
        pendingQueueCount: pendingQueue.length,
      };
    } catch {
      return {
        totalInvoices: 0,
        pendingInvoices: 0,
        totalCustomers: 0,
        totalProducts: 0,
        pendingQueueCount: 0,
      };
    }
  }

  public async getAllIndexedDBData(): Promise<{
    invoices: any[];
    customers: any[];
    products: any[];
    photoPrices: any[];
    pendingQueue: any[];
  }> {
    const [invoices, customers, products, photoPrices, pendingQueue] = await Promise.all([
      this.getOfflineInvoices(),
      this.getCachedCustomers(),
      this.getCachedProducts(),
      this.getCachedPhotoPrices(),
      this.getPendingQueue(),
    ]);
    return { invoices, customers, products, photoPrices, pendingQueue };
  }

  public async saveCustomerLocally(customer: any): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('customers', 'readwrite');
      tx.objectStore('customers').put(customer);
    } catch (err) {
      console.warn('[OfflineDB] Failed to save customer locally:', err);
    }
  }

  public async saveProductLocally(product: any): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('products', 'readwrite');
      tx.objectStore('products').put(product);
    } catch (err) {
      console.warn('[OfflineDB] Failed to save product locally:', err);
    }
  }

  public async deleteProductLocally(productId: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('products', 'readwrite');
      tx.objectStore('products').delete(productId);
    } catch (err) {
      console.warn('[OfflineDB] Failed to delete product locally:', err);
    }
  }

  public async deleteCustomerLocally(customerId: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('customers', 'readwrite');
      tx.objectStore('customers').delete(customerId);
    } catch (err) {
      console.warn('[OfflineDB] Failed to delete customer locally:', err);
    }
  }

  public async seedDemoDataIfEmpty(): Promise<void> {
    try {
      const existing = await this.getCachedProducts();
      if (existing.length > 0) return;

      const demoProducts = [
        {
          _id: 'prod_frame_1218',
          name: '12x18 Synthetic Wooden Frame',
          category: 'FRAMES',
          sku: 'TS-FR-1218',
          barcode: '8901001',
          sellingPrice: 450,
          purchasePrice: 220,
          mrp: 550,
          gstRate: 18,
          hsnCode: '4414',
          stockQuantity: 45,
          unit: 'PCS',
        },
        {
          _id: 'prod_mug_custom',
          name: 'Customized Ceramic Photo Mug',
          category: 'GIFTS',
          sku: 'TS-MUG-001',
          barcode: '8901002',
          sellingPrice: 250,
          purchasePrice: 90,
          mrp: 350,
          gstRate: 12,
          hsnCode: '6912',
          stockQuantity: 80,
          unit: 'PCS',
        },
        {
          _id: 'prod_acrylic_3d',
          name: 'Acrylic 3D LED Cutout (8x10)',
          category: 'GIFTS',
          sku: 'TS-ACR-810',
          barcode: '8901003',
          sellingPrice: 850,
          purchasePrice: 380,
          mrp: 1100,
          gstRate: 18,
          hsnCode: '3926',
          stockQuantity: 25,
          unit: 'PCS',
        },
        {
          _id: 'prod_magic_mirror',
          name: 'Magic Mirror Photo Frame with LED',
          category: 'GIFTS',
          sku: 'TS-MM-001',
          barcode: '8901004',
          sellingPrice: 650,
          purchasePrice: 280,
          mrp: 899,
          gstRate: 18,
          hsnCode: '7009',
          stockQuantity: 30,
          unit: 'PCS',
        },
        {
          _id: 'prod_tshirt_custom',
          name: 'Personalized Cotton T-Shirt',
          category: 'GIFTS',
          sku: 'TS-TSHIRT-01',
          barcode: '8901005',
          sellingPrice: 399,
          purchasePrice: 150,
          mrp: 599,
          gstRate: 5,
          hsnCode: '6109',
          stockQuantity: 60,
          unit: 'PCS',
        },
        {
          _id: 'prod_print_46',
          name: '4x6 Instant Glossy Photo Print',
          category: 'PHOTO_PRINTS',
          sku: 'TS-PR-4X6',
          barcode: '8901006',
          sellingPrice: 20,
          purchasePrice: 5,
          mrp: 25,
          gstRate: 18,
          hsnCode: '4911',
          stockQuantity: 500,
          unit: 'PCS',
        },
      ];

      const demoCustomers = [
        {
          _id: 'cust_retail_walkin',
          name: 'Walk-in Retail Customer',
          mobile: '9999999999',
          email: 'retail@trendingstudio.com',
          city: 'Karaikudi',
          pincode: '630001',
          totalSpent: 0,
          pendingBalance: 0,
        },
        {
          _id: 'cust_muthu',
          name: 'Muthu Kumar',
          mobile: '9842123456',
          email: 'muthu@gmail.com',
          city: 'Karaikudi',
          pincode: '630001',
          totalSpent: 4500,
          pendingBalance: 0,
        },
      ];

      await this.cacheProducts(demoProducts);
      await this.cacheCustomers(demoCustomers);
    } catch (err) {
      console.warn('[OfflineDB] Demo seeding skipped:', err);
    }
  }
}

export const offlineDb = new OfflineDatabase();
