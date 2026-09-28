import { api } from './api';
import { offlineDb } from './offlineDb';
import { dataService } from './dataService';
import * as fsClient from './firebaseClient';

export interface ISyncResult {
  success: boolean;
  syncedCount?: number;
  syncedInvoices?: number;
  syncedCustomers?: number;
  syncedProducts?: number;
  sheetsSynced?: boolean;
  sheetsMessage?: string;
  errors?: string[];
  error?: string;
  summary?: string;
}

class SyncManager {
  private isSyncing = false;
  private syncTimer: any = null;

  public init() {
    if (typeof window === 'undefined') return;

    // Automatic sync on network reconnect
    window.addEventListener('online', () => {
      console.log('[SyncManager] Network online. Initiating background sync...');
      this.syncNow();
    });

    // Start background sync polling every 45s if online
    if (!this.syncTimer) {
      this.syncTimer = setInterval(() => {
        if (navigator.onLine) {
          this.syncNow(false);
        }
      }, 45000);
    }
  }

  /**
   * Standard sync: pushes pending queue items + any unsynced offline invoices
   */
  public async syncNow(notify = true): Promise<ISyncResult> {
    if (this.isSyncing) {
      return { success: false, syncedCount: 0, error: 'Sync already in progress' };
    }
    if (!navigator.onLine) {
      return { success: false, syncedCount: 0, error: 'Terminal is currently offline' };
    }

    this.isSyncing = true;
    window.dispatchEvent(new CustomEvent('sync-status-changed', { detail: { isSyncing: true } }));

    const syncErrors: string[] = [];
    let syncedCount = 0;

    try {
      // 1. Get all pending operations from queue
      const pendingItems = await offlineDb.getPendingQueue();

      // 2. Also check all invoices stored in offlineInvoices store
      const allLocalInvoices = await offlineDb.getOfflineInvoices();
      const unsyncedInvoices = allLocalInvoices.filter(
        (inv: any) => inv.syncStatus !== 'SYNCED' || inv.isOffline === true
      );

      console.log(`[SyncManager] Found ${pendingItems.length} queue items and ${unsyncedInvoices.length} unsynced invoices in IndexedDB.`);

      // Step A: Process pending queue items
      for (const item of pendingItems) {
        try {
          if (item.entity === 'invoice') {
            const saved = await fsClient.saveInvoiceToFirestore(item.payload);
            await offlineDb.markInvoiceSynced(
              item.payload._id || item.operationId,
              saved._id,
              saved.invoiceNumber
            );
            syncedCount++;
          } else if (item.entity === 'customer') {
            const saved = await fsClient.saveCustomerToFirestore(item.payload);
            await offlineDb.markQueueItemSynced(item.operationId, saved._id || item.payload._id);
            syncedCount++;
          }
        } catch (itemErr: any) {
          console.error(`[SyncManager] Failed queue item ${item.operationId}:`, itemErr);
          syncErrors.push(`Queue item (${item.entity}): ${itemErr.message}`);
        }
      }

      // Step B: Process any unsynced invoices in offlineInvoices store not covered by queue
      for (const inv of unsyncedInvoices) {
        // Skip if already counted
        const alreadyHandled = pendingItems.some((q) => q.payload?._id === inv._id);
        if (alreadyHandled) continue;

        try {
          const saved = await fsClient.saveInvoiceToFirestore(inv);
          await offlineDb.markInvoiceSynced(inv._id || inv.id, saved._id, saved.invoiceNumber);
          syncedCount++;
        } catch (invErr: any) {
          console.error(`[SyncManager] Failed offline invoice ${inv._id}:`, invErr);
          syncErrors.push(`Invoice ${inv.invoiceNumber || inv._id}: ${invErr.message}`);
        }
      }

      // Step C: Auto-append to Google Sheets Webhook if configured
      if (syncedCount > 0) {
        try {
          const settings: any = await dataService.getSettings();
          if (settings?.googleSheetsConfig?.webhookUrl && settings.googleSheetsConfig.enabled !== false) {
            await fsClient.syncToGoogleSheetsWebhook(settings.googleSheetsConfig.webhookUrl, {
              type: 'FULL_SYNC',
              data: {
                invoices: allLocalInvoices,
                customers: await offlineDb.getCachedCustomers(),
                products: await offlineDb.getCachedProducts(),
              },
            });
          }
        } catch (sheetErr) {
          console.warn('[SyncManager] Google Sheets webhook push skipped:', sheetErr);
        }
      }

      // Step D: Refresh local catalog cache from Firestore
      try {
        const [products, customers] = await Promise.all([
          dataService.getProducts(),
          dataService.getCustomers(),
        ]);
        if (products && products.length > 0) await offlineDb.cacheProducts(products);
        if (customers && customers.length > 0) await offlineDb.cacheCustomers(customers);
      } catch {}

      window.dispatchEvent(new CustomEvent('sync-complete', { detail: { syncedCount } }));

      if (syncedCount === 0 && syncErrors.length > 0) {
        return {
          success: false,
          syncedCount: 0,
          error: syncErrors.join('; '),
          errors: syncErrors,
        };
      }

      return {
        success: true,
        syncedCount,
        errors: syncErrors,
      };
    } catch (err: any) {
      console.warn('[SyncManager] Sync failed:', err.message);
      return { success: false, syncedCount: 0, error: err.message };
    } finally {
      this.isSyncing = false;
      window.dispatchEvent(new CustomEvent('sync-status-changed', { detail: { isSyncing: false } }));
    }
  }

  /**
   * Complete 1-Click Sync: Syncs ALL Browser IndexedDB stores (Invoices, Customers, Products)
   * directly to Cloud Firestore AND pushes to Google Sheets.
   */
  public async syncBrowserIndexedDBToCloudAndSheets(options?: {
    forceAll?: boolean;
    onProgress?: (status: string) => void;
  }): Promise<ISyncResult> {
    if (this.isSyncing) {
      return { success: false, error: 'A synchronization operation is already in progress.' };
    }
    if (!navigator.onLine) {
      return { success: false, error: 'Your internet is currently offline. Connect to Wi-Fi/Mobile Data and retry.' };
    }

    this.isSyncing = true;
    window.dispatchEvent(new CustomEvent('sync-status-changed', { detail: { isSyncing: true } }));

    const errors: string[] = [];
    let syncedInvoices = 0;
    let syncedCustomers = 0;
    let syncedProducts = 0;
    let sheetsSynced = false;
    let sheetsMessage = '';

    try {
      options?.onProgress?.('Reading local records from browser IndexedDB...');
      const dbData = await offlineDb.getAllIndexedDBData();
      const { invoices, customers, products, pendingQueue } = dbData;

      console.log(`[SyncManager] Full sync starting with ${invoices.length} invoices, ${customers.length} customers, ${products.length} products`);

      // 1. Sync Invoices to Cloud Firestore
      options?.onProgress?.(`Uploading ${invoices.length} invoices to Cloud Firestore...`);
      for (const inv of invoices) {
        try {
          const saved = await fsClient.saveInvoiceToFirestore(inv);
          await offlineDb.markInvoiceSynced(
            inv._id || inv.id,
            saved._id || inv._id,
            saved.invoiceNumber || inv.invoiceNumber
          );
          syncedInvoices++;
        } catch (invErr: any) {
          console.error(`[SyncManager] Invoice sync failed:`, invErr);
          errors.push(`Invoice ${inv.invoiceNumber || inv._id}: ${invErr.message}`);
        }
      }

      // Also mark any queue items as synced
      for (const q of pendingQueue) {
        await offlineDb.markInvoiceSynced(q.operationId);
      }

      // 2. Sync Customers to Cloud Firestore
      options?.onProgress?.(`Uploading ${customers.length} customers to Cloud Firestore...`);
      for (const cust of customers) {
        if (cust._id || cust.mobile) {
          try {
            await fsClient.saveCustomerToFirestore(cust);
            syncedCustomers++;
          } catch (custErr: any) {
            console.error(`[SyncManager] Customer sync failed:`, custErr);
            errors.push(`Customer ${cust.name || cust.mobile}: ${custErr.message}`);
          }
        }
      }

      // 3. Sync Products to Cloud Firestore if custom products exist
      if (options?.forceAll && products.length > 0) {
        options?.onProgress?.(`Synchronizing ${products.length} products...`);
        for (const prod of products) {
          try {
            await fsClient.saveProductToFirestore(prod);
            syncedProducts++;
          } catch {}
        }
      }

      // 4. Synchronize with Google Sheets
      options?.onProgress?.('Synchronizing with Google Sheets...');
      const settings: any = await dataService.getSettings();
      const webhookUrl = settings?.googleSheetsConfig?.webhookUrl;
      const spreadsheetId = settings?.googleSheetsConfig?.spreadsheetId;

      if (webhookUrl) {
        try {
          const sheetRes = await fsClient.syncToGoogleSheetsWebhook(webhookUrl, {
            type: 'FULL_SYNC',
            data: { invoices, customers, products },
          });
          sheetsSynced = sheetRes.success;
          sheetsMessage = sheetRes.message || 'Pushed to Google Sheets Webhook successfully!';
        } catch (sheetErr: any) {
          sheetsMessage = `Google Sheets webhook error: ${sheetErr.message}`;
        }
      } else if (spreadsheetId) {
        sheetsMessage = `Google Sheet connected (ID: ${spreadsheetId}). Export CSV ready for import.`;
      } else {
        sheetsMessage = 'Google Sheet not yet linked. You can export CSV or configure a Webhook in Settings.';
      }

      // Update lastSyncedAt in Firestore business settings
      try {
        await fsClient.saveSettingsToFirestore({
          googleSheetsConfig: {
            ...settings?.googleSheetsConfig,
            lastSyncedAt: new Date().toISOString(),
          },
        } as any);
      } catch {}

      // 5. Refresh local caches with latest cloud data
      options?.onProgress?.('Refreshing local browser cache...');
      try {
        const [cloudProds, cloudCusts] = await Promise.all([
          fsClient.getFirestoreProducts(),
          fsClient.getFirestoreCustomers(),
        ]);
        if (cloudProds.length > 0) await offlineDb.cacheProducts(cloudProds);
        if (cloudCusts.length > 0) await offlineDb.cacheCustomers(cloudCusts);
      } catch {}

      window.dispatchEvent(new CustomEvent('offline-queue-changed'));
      window.dispatchEvent(new CustomEvent('sync-complete', { detail: { syncedCount: syncedInvoices } }));

      const summary = `Successfully synchronized ${syncedInvoices} invoices and ${syncedCustomers} customers from Browser IndexedDB to Cloud Firestore! ${sheetsMessage}`;

      return {
        success: errors.length === 0 || syncedInvoices > 0,
        syncedCount: syncedInvoices,
        syncedInvoices,
        syncedCustomers,
        syncedProducts,
        sheetsSynced,
        sheetsMessage,
        errors,
        summary,
      };
    } catch (err: any) {
      console.error('[SyncManager] Complete IndexedDB sync failed:', err);
      return {
        success: false,
        error: err.message || 'Synchronization failed',
        errors: [err.message],
      };
    } finally {
      this.isSyncing = false;
      window.dispatchEvent(new CustomEvent('sync-status-changed', { detail: { isSyncing: false } }));
    }
  }

  public getSyncState() {
    return {
      isSyncing: this.isSyncing,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };
  }
}

export const syncManager = new SyncManager();

