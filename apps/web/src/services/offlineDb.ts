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

    const localId = `OFFLINE_TS_${Date.now()}_${offlineSeq}`;
    const fullInvoice = {
      ...invoiceData,
      _id: localId,
      id: localId,
      invoiceNumber: `OFFLINE-TS-${offlineSeq}`,
      isOffline: true,
      syncStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Save to offlineInvoices store
    const tx = db.transaction(['offlineInvoices', 'offlineQueue'], 'readwrite');
    tx.objectStore('offlineInvoices').put(fullInvoice);

    // 2. Add to offlineQueue for background sync
    const queueItem: IOfflineQueueItem = {
      operationId: `op_inv_${localId}`,
      entity: 'invoice',
      operationType: 'CREATE',
      payload: fullInvoice,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
    };
    tx.objectStore('offlineQueue').put(queueItem);

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

  public async markQueueItemSynced(operationId: string, serverId: string, invoiceNumber?: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['offlineQueue', 'offlineInvoices'], 'readwrite');
      const queueStore = tx.objectStore('offlineQueue');
      const invStore = tx.objectStore('offlineInvoices');

      // Update queue item
      const req = queueStore.get(operationId);
      req.onsuccess = () => {
        if (req.result) {
          req.result.status = 'SYNCED';
          queueStore.put(req.result);
        }
      };

      // If it's an invoice, update with official invoiceNumber
      if (invoiceNumber) {
        const invReq = invStore.getAll();
        invReq.onsuccess = () => {
          for (const inv of invReq.result) {
            if (`op_inv_${inv._id}` === operationId) {
              inv.officialInvoiceNumber = invoiceNumber;
              inv.syncStatus = 'SYNCED';
              invStore.put(inv);
            }
          }
        };
      }

      tx.oncomplete = () => {
        window.dispatchEvent(new CustomEvent('offline-queue-changed'));
      };
    } catch (err) {
      console.error('[OfflineDB] Error marking synced:', err);
    }
  }
}

export const offlineDb = new OfflineDatabase();
