import { api } from './api';
import { offlineDb } from './offlineDb';
import * as fsClient from './firebaseClient';
import {
  IProduct,
  ICustomer,
  IBusinessSettings,
  IPhotoPrintSizePrice,
} from '@trending-studio/shared-types';

export const dataService = {
  // ----------------------------------------------------------------------
  // Products
  // ----------------------------------------------------------------------
  async getProducts(search = ''): Promise<IProduct[]> {
    let prods: IProduct[] = [];

    // 1. Try API
    try {
      const res = await api.get(`/products?search=${encodeURIComponent(search)}&limit=200`);
      prods = res.data.data?.products || res.data.data || [];
    } catch (apiErr) {
      // 2. Direct Cloud Firestore fallback
      try {
        prods = await fsClient.getFirestoreProducts();
        if (search.trim()) {
          const s = search.toLowerCase();
          prods = prods.filter(
            (p) =>
              p.name.toLowerCase().includes(s) ||
              (p.sku && p.sku.toLowerCase().includes(s)) ||
              (p.barcode && p.barcode.includes(s))
          );
        }
      } catch (fsErr) {
        // 3. IndexedDB cache fallback
        prods = (await offlineDb.getCachedProducts()) as IProduct[];
      }
    }

    if (prods.length > 0) {
      await offlineDb.cacheProducts(prods);
    }
    return prods;
  },

  async getGoogleSheetsConfig(): Promise<{ webhookUrl: string | null; apiKey: string | null }> {
    try {
      const settings: any = await this.getSettings();
      const conf = settings?.googleSheetsConfig;
      if (conf?.webhookUrl && conf.enabled !== false) {
        return {
          webhookUrl: conf.webhookUrl,
          apiKey: conf.apiKey || localStorage.getItem('ts_sheets_api_key') || null,
        };
      }
    } catch {}
    const localKey = localStorage.getItem('ts_sheets_api_key') || null;
    return { webhookUrl: null, apiKey: localKey };
  },

  async saveProduct(product: Partial<IProduct>): Promise<IProduct> {
    let saved: IProduct;
    try {
      const res = await api.post('/products', product);
      saved = res.data.data;
    } catch (apiErr) {
      // Direct Firestore
      saved = await fsClient.saveProductToFirestore(product);
      // Cache in IndexedDB
      await offlineDb.saveProductLocally(saved);
    }

    // Google Sheets Real-Time DB Upsert (INSERT / MODIFY) with API Key
    try {
      const { webhookUrl, apiKey } = await this.getGoogleSheetsConfig();
      if (webhookUrl) {
        fsClient.updateInGoogleSheets(webhookUrl, 'Products', saved, undefined, apiKey || undefined).catch((e) =>
          console.warn('[DataService] Google Sheets product update notice:', e)
        );
      }
    } catch {}

    return saved;
  },

  async adjustProductStock(productId: string, quantityChange: number, notes?: string): Promise<void> {
    try {
      await api.post(`/products/${productId}/stock`, {
        quantityChange,
        type: quantityChange > 0 ? 'STOCK_IN' : 'STOCK_OUT',
        notes,
      });
    } catch (apiErr) {
      // Direct Firestore
      await fsClient.updateProductStockInFirestore(productId, quantityChange, notes);
    }

    // Sync updated stock to Google Sheets
    try {
      const { webhookUrl, apiKey } = await this.getGoogleSheetsConfig();
      if (webhookUrl) {
        const prods = await fsClient.getFirestoreProducts();
        const p = prods.find((item) => (item._id || item.id) === productId);
        if (p) {
          fsClient.updateInGoogleSheets(webhookUrl, 'Products', p, undefined, apiKey || undefined).catch(() => {});
        }
      }
    } catch {}
  },

  async deleteProduct(productId: string): Promise<void> {
    try {
      await api.delete(`/products/${productId}`);
    } catch (apiErr) {
      await fsClient.deleteProductFromFirestore(productId);
    }
    await offlineDb.deleteProductLocally(productId);

    // Google Sheets Real-time DB Deletion with API Key
    try {
      const { webhookUrl, apiKey } = await this.getGoogleSheetsConfig();
      if (webhookUrl) {
        fsClient.deleteFromGoogleSheets(webhookUrl, 'Products', { id: productId, key: 'ID' }, apiKey || undefined).catch((e) =>
          console.warn('[DataService] Google Sheets product delete notice:', e)
        );
      }
    } catch {}
  },

  // ----------------------------------------------------------------------
  // Customers
  // ----------------------------------------------------------------------
  async getCustomers(search = ''): Promise<ICustomer[]> {
    let custs: ICustomer[] = [];

    try {
      const res = await api.get(`/customers?search=${encodeURIComponent(search)}&limit=100`);
      custs = res.data.data?.customers || res.data.data || [];
    } catch (apiErr) {
      // Direct Cloud Firestore
      try {
        custs = await fsClient.getFirestoreCustomers();
        if (search.trim()) {
          const s = search.toLowerCase();
          custs = custs.filter(
            (c) =>
              c.name.toLowerCase().includes(s) ||
              c.mobile.includes(s) ||
              (c.whatsapp && c.whatsapp.includes(s))
          );
        }
      } catch (fsErr) {
        custs = (await offlineDb.getCachedCustomers()) as ICustomer[];
      }
    }

    if (custs.length > 0) {
      await offlineDb.cacheCustomers(custs);
    }
    return custs;
  },

  async saveCustomer(customer: Partial<ICustomer>): Promise<ICustomer> {
    let saved: ICustomer;
    try {
      const res = await api.post('/customers', customer);
      saved = res.data.data;
    } catch (apiErr) {
      saved = await fsClient.saveCustomerToFirestore(customer);
      await offlineDb.saveCustomerLocally(saved);
    }

    // Google Sheets Real-Time DB Upsert (INSERT / MODIFY) with API Key
    try {
      const { webhookUrl, apiKey } = await this.getGoogleSheetsConfig();
      if (webhookUrl) {
        fsClient.updateInGoogleSheets(webhookUrl, 'Customers', saved, undefined, apiKey || undefined).catch((e) =>
          console.warn('[DataService] Google Sheets customer update notice:', e)
        );
      }
    } catch {}

    return saved;
  },

  async getCustomerLedger(customerId: string): Promise<any[]> {
    try {
      const res = await api.get(`/customers/${customerId}/ledger`);
      return res.data.data || [];
    } catch (apiErr) {
      return await fsClient.getCustomerInvoicesFromFirestore(customerId);
    }
  },

  // ----------------------------------------------------------------------
  // Invoices & Billing
  // ----------------------------------------------------------------------
  async getInvoices(search = '', status = ''): Promise<any[]> {
    let invoices: any[] = [];
    try {
      const res = await api.get(
        `/invoices?search=${encodeURIComponent(search)}&status=${status}&limit=100`
      );
      invoices = res.data.data || [];
    } catch (apiErr) {
      // Cloud Firestore + Offline DB merge
      try {
        const fsInvoices = await fsClient.getFirestoreInvoices();
        const localInvoices = await offlineDb.getOfflineInvoices();
        // Merge by _id
        const map = new Map<string, any>();
        fsInvoices.forEach((inv: any) => map.set(inv._id || inv.id, inv));
        localInvoices.forEach((inv: any) => {
          if (!map.has(inv.id)) {
            map.set(inv.id, { ...inv, _id: inv.id, isLocalOnly: true });
          }
        });
        invoices = Array.from(map.values());

        if (search.trim()) {
          const s = search.toLowerCase();
          invoices = invoices.filter(
            (i) =>
              (i.invoiceNumber && i.invoiceNumber.toLowerCase().includes(s)) ||
              (i.customerName && i.customerName.toLowerCase().includes(s)) ||
              (i.customerMobile && i.customerMobile.includes(s))
          );
        }

        if (status.trim()) {
          invoices = invoices.filter((i) => (i.status || 'PAID') === status);
        }
      } catch (fsErr) {
        invoices = await offlineDb.getOfflineInvoices();
      }
    }

    return invoices;
  },

  async saveInvoice(invoicePayload: any, calculatedData: any): Promise<any> {
    let finalInvoice: any;

    try {
      const res = await api.post('/invoices', invoicePayload);
      finalInvoice = res.data.data;
    } catch (apiErr) {
      console.log('[DataService] API invoice post failed. Saving directly to Cloud Firestore...');
      try {
        // Save to Firestore directly
        finalInvoice = await fsClient.saveInvoiceToFirestore({
          ...invoicePayload,
          ...calculatedData,
        });
      } catch (fsErr) {
        console.warn('[DataService] Firestore save error, saving locally in IndexedDB queue:', fsErr);
      }

      // Always cache in offline queue as well
      const local = await offlineDb.saveOfflineInvoice({
        ...(finalInvoice || invoicePayload),
        ...calculatedData,
        syncStatus: finalInvoice ? 'SYNCED' : 'PENDING',
        isOffline: !finalInvoice,
      });

      if (!finalInvoice) {
        finalInvoice = local;
      }
    }

    // Real-Time INSERT into Google Sheets Database (Protected with API Key)
    if (finalInvoice) {
      try {
        const { webhookUrl, apiKey } = await this.getGoogleSheetsConfig();
        if (webhookUrl) {
          fsClient.insertIntoGoogleSheets(webhookUrl, 'Invoices', finalInvoice, apiKey || undefined).catch((e) =>
            console.warn('[DataService] Auto sheet invoice insert notice:', e)
          );
        }
      } catch {}
    }

    return finalInvoice;
  },

  async cancelInvoice(invoiceId: string, reason: string): Promise<void> {
    try {
      await api.post(`/invoices/${invoiceId}/cancel`, { reason });
    } catch (apiErr) {
      await fsClient.cancelFirestoreInvoice(invoiceId, reason);
    }

    // Real-Time Google Sheets Status Update for Cancelled/Voided Invoice
    try {
      const { webhookUrl, apiKey } = await this.getGoogleSheetsConfig();
      if (webhookUrl) {
        fsClient.updateInGoogleSheets(webhookUrl, 'Invoices', {
          _id: invoiceId,
          invoiceNumber: invoiceId,
          status: 'CANCELLED',
          cancellationReason: reason,
        }, undefined, apiKey || undefined).catch((e) => console.warn('[DataService] Google Sheets invoice cancel notice:', e));
      }
    } catch {}
  },

  /**
   * PULL FROM GOOGLE SHEETS:
   * Two-way sync: Reads all Invoices, Products, and Customers from Google Sheets
   * and synchronizes them into Cloud Firestore & Browser IndexedDB.
   * Validated with API Security Key.
   */
  async pullAndSyncFromGoogleSheets(customWebhookUrl?: string, customApiKey?: string): Promise<{
    success: boolean;
    pulledCount: { invoices: number; products: number; customers: number };
    message: string;
  }> {
    const { webhookUrl: defaultUrl, apiKey: defaultKey } = await this.getGoogleSheetsConfig();
    const webhookUrl = customWebhookUrl || defaultUrl;
    const apiKey = customApiKey || defaultKey;

    if (!webhookUrl) {
      throw new Error('Google Sheets Webhook URL is not configured. Please enter your Webhook URL in the Sync Center.');
    }

    const sheetData = await fsClient.pullFromGoogleSheets(webhookUrl, 'all', apiKey || undefined);
    let invoicesCount = 0;
    let productsCount = 0;
    let customersCount = 0;

    // 1. Sync Products from Google Sheets
    if (sheetData.products && sheetData.products.length > 0) {
      for (const p of sheetData.products) {
        if (p.name || p.sku) {
          try {
            const saved = await fsClient.saveProductToFirestore(p);
            await offlineDb.saveProductLocally(saved);
            productsCount++;
          } catch {}
        }
      }
    }

    // 2. Sync Customers from Google Sheets
    if (sheetData.customers && sheetData.customers.length > 0) {
      for (const c of sheetData.customers) {
        if (c.name || c.mobile) {
          try {
            const saved = await fsClient.saveCustomerToFirestore(c);
            await offlineDb.saveCustomerLocally(saved);
            customersCount++;
          } catch {}
        }
      }
    }

    // 3. Sync Invoices from Google Sheets
    if (sheetData.invoices && sheetData.invoices.length > 0) {
      for (const inv of sheetData.invoices) {
        if (inv.invoiceNumber) {
          try {
            await fsClient.saveInvoiceToFirestore(inv);
            await offlineDb.saveOfflineInvoice({
              ...inv,
              syncStatus: 'SYNCED',
              isOffline: false,
            });
            invoicesCount++;
          } catch {}
        }
      }
    }

    return {
      success: true,
      pulledCount: {
        invoices: invoicesCount,
        products: productsCount,
        customers: customersCount,
      },
      message: `Synchronized from Google Sheets: ${productsCount} products, ${customersCount} customers, ${invoicesCount} invoices!`,
    };
  },

  // ----------------------------------------------------------------------
  // Photo Print & Frame Prices
  // ----------------------------------------------------------------------
  async getPhotoPrintPrices(): Promise<IPhotoPrintSizePrice[]> {
    try {
      const res = await api.get('/photo-prints/pricing');
      return res.data.data || [];
    } catch (apiErr) {
      return await fsClient.getFirestorePhotoPrintPrices();
    }
  },

  async savePhotoPrintPrice(size: string, basePrice: number): Promise<void> {
    try {
      await api.put('/photo-prints/pricing', { size, basePrice, isActive: true });
    } catch (apiErr) {
      await fsClient.savePhotoPrintPriceToFirestore(size, basePrice);
    }
  },

  // ----------------------------------------------------------------------
  // Business Settings
  // ----------------------------------------------------------------------
  async getSettings(): Promise<Partial<IBusinessSettings>> {
    try {
      const res = await api.get('/settings');
      return res.data.data || {};
    } catch (apiErr) {
      return await fsClient.getFirestoreSettings();
    }
  },

  async saveSettings(settings: Partial<IBusinessSettings>): Promise<void> {
    try {
      await api.put('/settings', settings);
    } catch (apiErr) {
      await fsClient.saveSettingsToFirestore(settings);
    }
  },

  // ----------------------------------------------------------------------
  // Studio Orders
  // ----------------------------------------------------------------------
  async getOrders(): Promise<any[]> {
    try {
      const res = await api.get('/orders');
      return res.data.data || [];
    } catch (apiErr) {
      return await fsClient.getFirestoreOrders();
    }
  },

  async saveOrder(order: any): Promise<any> {
    try {
      const res = await api.post('/orders', order);
      return res.data.data;
    } catch (apiErr) {
      return await fsClient.saveOrderToFirestore(order);
    }
  },

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
    } catch (apiErr) {
      await fsClient.updateOrderStatusInFirestore(orderId, status);
    }
  },

  // ----------------------------------------------------------------------
  // Device & Terminal Management
  // ----------------------------------------------------------------------
  async getDevices(): Promise<any[]> {
    try {
      const res = await api.get('/devices');
      return res.data.data || [];
    } catch (apiErr) {
      return await fsClient.getFirestoreDevices();
    }
  },

  async registerDevice(device: any): Promise<any> {
    try {
      const res = await api.post('/devices/register', device);
      return res.data.data;
    } catch (apiErr) {
      return await fsClient.registerDeviceInFirestore(device);
    }
  },

  async updateDeviceStatus(deviceId: string, isRevoked: boolean): Promise<void> {
    try {
      await api.post(`/devices/${deviceId}/${isRevoked ? 'revoke' : 'unrevoke'}`);
    } catch (apiErr) {
      await fsClient.updateDeviceStatusInFirestore(deviceId, isRevoked);
    }
  },
};
