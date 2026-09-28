import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { SyncRepository } from '../repositories/SyncRepository';
import { InvoiceRepository } from '../repositories/InvoiceRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';
import { ProductRepository } from '../repositories/ProductRepository';

export type SyncState = 'ONLINE' | 'SYNCING' | 'OFFLINE' | 'SYNC_ERROR';

class SyncManagerClass {
  private apiBaseUrl: string = 'http://10.0.2.2:5000/api/v1'; // Default Android emulator host loopback
  private isSyncing: boolean = false;
  private statusListeners: Array<(status: SyncState, message?: string) => void> = [];
  private currentStatus: SyncState = 'OFFLINE';

  constructor() {
    this.initNetInfo();
  }

  public setApiBaseUrl(url: string) {
    this.apiBaseUrl = url;
  }

  public addStatusListener(cb: (status: SyncState, message?: string) => void) {
    this.statusListeners.push(cb);
    cb(this.currentStatus);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== cb);
    };
  }

  private notify(status: SyncState, message?: string) {
    this.currentStatus = status;
    this.statusListeners.forEach((cb) => cb(status, message));
  }

  private initNetInfo() {
    NetInfo.addEventListener((state: any) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        this.notify('ONLINE', 'Connection active');
        this.syncNow();
      } else {
        this.notify('OFFLINE', 'Offline Mode — Changes saved locally in SQLite');
      }
    });
  }

  public async syncNow(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.notify('SYNCING', 'Synchronizing with Trending Studio server...');

    try {
      const token = await SecureStore.getItemAsync('ts_access_token');
      const deviceId = (await SecureStore.getItemAsync('ts_device_id')) || 'android_term_01';
      const userId = (await SecureStore.getItemAsync('ts_user_id')) || 'user_offline';

      const pendingOps = await SyncRepository.getPendingOperations();

      // 1. PUSH OUTBOUND OPERATIONS
      if (pendingOps.length > 0) {
        const payload = {
          deviceId,
          userId,
          appVersion: '1.0.0',
          operations: pendingOps.map((op) => ({
            ...op,
            deviceId,
            userId,
            version: 1,
          })),
        };

        const res = await axios.post(`${this.apiBaseUrl}/sync/push`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          timeout: 15000,
        });

        if (res.data.success && res.data.results) {
          for (const result of res.data.results) {
            if (result.status === 'PROCESSED' || result.status === 'DUPLICATE_SKIPPED') {
              await SyncRepository.markOperationProcessed(result.operationId);

              // If it was an offline invoice, update local SQLite with the official bill number assigned by server
              if (result.entity === 'invoice' && result.assignedInvoiceNumber) {
                await InvoiceRepository.markSynced(
                  result.localId,
                  result.serverId,
                  result.assignedInvoiceNumber
                );
              }
            } else if (result.status === 'REJECTED') {
              await SyncRepository.markOperationFailed(
                result.operationId,
                result.conflictDetails?.reason || 'Sync rejected'
              );
            }
          }
        }
      }

      // 2. PULL INBOUND DELTAS
      const lastSyncedAt = (await SecureStore.getItemAsync('ts_last_synced_at')) || new Date(0).toISOString();
      const pullRes = await axios.post(
        `${this.apiBaseUrl}/sync/pull`,
        {
          deviceId,
          lastSyncedAt,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          timeout: 15000,
        }
      );

      if (pullRes.data.success && pullRes.data.deltas) {
        const { customers, products } = pullRes.data.deltas;
        if (customers && customers.length > 0) {
          await CustomerRepository.upsertFromServer(customers);
        }
        if (products && products.length > 0) {
          await ProductRepository.upsertFromServer(products);
        }
        await SecureStore.setItemAsync('ts_last_synced_at', pullRes.data.serverTime);
      }

      this.notify('ONLINE', 'All data synchronized');
    } catch (err: any) {
      console.warn('Sync failed:', err.message);
      this.notify('SYNC_ERROR', `Sync error: ${err.message || 'Server unreachable'}`);
    } finally {
      this.isSyncing = false;
    }
  }
}

export const SyncManager = new SyncManagerClass();
