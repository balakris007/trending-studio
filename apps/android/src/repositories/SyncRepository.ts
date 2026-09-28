import { getDatabase } from '../database/sqlite';
import { ISyncOperation } from '@trending-studio/shared-types';

export class SyncRepository {
  public static async getPendingOperations(): Promise<any[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      "SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT 100"
    );

    return rows.map((r: any) => ({
      operationId: r.id,
      operationType: r.operation_type,
      entity: r.entity,
      localId: r.local_id,
      payload: JSON.parse(r.payload),
      timestamp: new Date(r.created_at).toISOString(),
      retryCount: r.retry_count,
    }));
  }

  public static async markOperationProcessed(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE sync_queue SET status = 'SYNCED' WHERE id = ?", [id]);
  }

  public static async markOperationFailed(id: string, error: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE sync_queue SET status = 'FAILED', retry_count = retry_count + 1, error_message = ? WHERE id = ?",
      [error, id]
    );
  }

  public static async getQueueStatus(): Promise<{ pending: number; failed: number }> {
    const db = await getDatabase();
    const p = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING'"
    );
    const f = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM sync_queue WHERE status = 'FAILED'"
    );
    return {
      pending: p?.count || 0,
      failed: f?.count || 0,
    };
  }
}
