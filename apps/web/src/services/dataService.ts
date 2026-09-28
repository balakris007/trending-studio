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

  async saveProduct(product: Partial<IProduct>): Promise<IProduct> {
    try {
      const res = await api.post('/products', product);
      return res.data.data;
    } catch (apiErr) {
      // Direct Firestore
      const saved = await fsClient.saveProductToFirestore(product);
      // Cache in IndexedDB
      await offlineDb.cacheProducts([saved]);
      return saved;
    }
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
  },

  async deleteProduct(productId: string): Promise<void> {
    try {
      await api.delete(`/products/${productId}`);
    } catch (apiErr) {
      await fsClient.deleteProductFromFirestore(productId);
    }
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
    try {
      const res = await api.post('/customers', customer);
      return res.data.data;
    } catch (apiErr) {
      const saved = await fsClient.saveCustomerToFirestore(customer);
      await offlineDb.cacheCustomers([saved]);
      return saved;
    }
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
      });

      if (!finalInvoice) {
        finalInvoice = local;
      }
    }

    return finalInvoice;
  },

  async cancelInvoice(invoiceId: string, reason: string): Promise<void> {
    try {
      await api.post(`/invoices/${invoiceId}/cancel`, { reason });
    } catch (apiErr) {
      await fsClient.cancelFirestoreInvoice(invoiceId, reason);
    }
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
