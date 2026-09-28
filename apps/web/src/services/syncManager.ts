import { api } from './api';
import { offlineDb } from './offlineDb';
import { dataService } from './dataService';
import * as fsClient from './firebaseClient';

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

  public async syncNow(notify = true): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (this.isSyncing) {
      return { success: false, syncedCount: 0, error: 'Sync already in progress' };
    }
    if (!navigator.onLine) {
      return { success: false, syncedCount: 0, error: 'Terminal is currently offline' };
    }

    this.isSyncing = true;
    window.dispatchEvent(new CustomEvent('sync-status-changed', { detail: { isSyncing: true } }));

    try {
      // 1. Get all pending offline operations
      const pendingItems = await offlineDb.getPendingQueue();
      let syncedCount = 0;

      if (pendingItems.length > 0) {
        console.log(`[SyncManager] Pushing ${pendingItems.length} offline operations...`);

        const customApiUrl = localStorage.getItem('ts_api_url');
        let pushedViaApi = false;

        // Option A: If a custom dedicated API server is configured, try it first
        if (customApiUrl) {
          try {
            const pushPayload = {
              deviceId: localStorage.getItem('ts_device_id') || 'web_terminal_01',
              operations: pendingItems.map((item) => ({
                operationId: item.operationId,
                localId: item.payload._id || item.operationId,
                entity: item.entity,
                operationType: item.operationType,
                payload: item.payload,
                version: 1,
                timestamp: item.createdAt,
              })),
            };

            const pushRes = await api.post('/sync/push', pushPayload);
            const results = pushRes.data.results || [];

            for (const res of results) {
              if (res.status === 'APPLIED' || res.status === 'DUPLICATE_SKIPPED') {
                await offlineDb.markQueueItemSynced(
                  res.operationId,
                  res.serverId,
                  res.assignedInvoiceNumber
                );
                syncedCount++;
              }
            }
            pushedViaApi = true;
          } catch (apiErr) {
            console.warn('[SyncManager] Custom API sync failed, falling back to direct Cloud Firestore...');
          }
        }

        // Option B: Direct Cloud Firestore upload (Default for Firebase Hosting & static deployment)
        if (!pushedViaApi) {
          for (const item of pendingItems) {
            try {
              if (item.entity === 'invoice') {
                const saved = await fsClient.saveInvoiceToFirestore(item.payload);
                await offlineDb.markQueueItemSynced(
                  item.operationId,
                  saved._id || item.payload._id,
                  saved.invoiceNumber || item.payload.invoiceNumber
                );
                syncedCount++;

                // Optional: Auto-append to Google Sheets Webhook if configured
                try {
                  const settings: any = await dataService.getSettings();
                  if (settings?.googleSheetsConfig?.webhookUrl && settings.googleSheetsConfig.enabled !== false) {
                    await fsClient.syncToGoogleSheetsWebhook(settings.googleSheetsConfig.webhookUrl, {
                      type: 'INVOICE',
                      data: saved,
                    });
                  }
                } catch (sheetErr) {
                  console.warn('[SyncManager] Auto-sheet push skipped:', sheetErr);
                }
              } else if (item.entity === 'customer') {
                const saved = await fsClient.saveCustomerToFirestore(item.payload);
                await offlineDb.markQueueItemSynced(
                  item.operationId,
                  saved._id || item.payload._id
                );
                syncedCount++;
              }
            } catch (fsErr) {
              console.error(`[SyncManager] Failed to sync item ${item.operationId}:`, fsErr);
            }
          }
        }
      }

      // 2. Pull latest catalog updates from Cloud Firestore and cache locally
      try {
        const [products, customers] = await Promise.all([
          dataService.getProducts(),
          dataService.getCustomers(),
        ]);

        if (products && products.length > 0) {
          await offlineDb.cacheProducts(products);
        }
        if (customers && customers.length > 0) {
          await offlineDb.cacheCustomers(customers);
        }
      } catch (err) {
        // Non-critical cache refresh failure
      }

      window.dispatchEvent(new CustomEvent('sync-complete', { detail: { syncedCount } }));
      return { success: true, syncedCount };
    } catch (err: any) {
      console.warn('[SyncManager] Sync failed:', err.message);
      return { success: false, syncedCount: 0, error: err.message };
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
