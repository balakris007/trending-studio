/**
 * TRENDING STUDIO — CLIENT OFFLINE SYNC MANAGER
 * Seamlessly manages synchronization between IndexedDB and Firebase via API.
 */

import { api } from './api';
import { offlineDb } from './offlineDb';

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
        console.log(`[SyncManager] Pushing ${pendingItems.length} offline operations to server...`);

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
      }

      // 2. Pull latest catalog updates from server and cache locally
      try {
        const [prodRes, custRes, priceRes] = await Promise.all([
          api.get('/products?limit=200'),
          api.get('/customers?limit=100'),
          api.get('/photo-prints/pricing'),
        ]);

        if (prodRes.data?.data?.products) {
          await offlineDb.cacheProducts(prodRes.data.data.products);
        }
        if (custRes.data?.data) {
          await offlineDb.cacheCustomers(custRes.data.data);
        }
        if (priceRes.data?.data) {
          await offlineDb.cachePhotoPrices(priceRes.data.data);
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
