import { getDatabase } from '../database/sqlite';
import { IProduct, SyncStatus } from '@trending-studio/shared-types';

export class ProductRepository {
  public static async listAll(): Promise<IProduct[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM products ORDER BY name ASC');
    return rows.map((r: any) => ({
      id: r.id,
      sku: r.sku,
      barcode: r.barcode,
      name: r.name,
      category: r.category,
      hsnSac: r.hsn_sac,
      sellingPrice: r.selling_price,
      purchasePrice: 0,
      gstRate: r.gst_rate,
      stock: r.stock,
      minStock: 5,
      unit: 'PCS',
      isActive: true,
      version: r.version,
      syncStatus: r.sync_status,
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  }

  public static async findByBarcode(barcode: string): Promise<IProduct | null> {
    const db = await getDatabase();
    const r = await db.getFirstAsync<any>('SELECT * FROM products WHERE barcode = ?', [barcode]);
    if (!r) return null;

    return {
      id: r.id,
      sku: r.sku,
      barcode: r.barcode,
      name: r.name,
      category: r.category,
      hsnSac: r.hsn_sac,
      sellingPrice: r.selling_price,
      purchasePrice: 0,
      gstRate: r.gst_rate,
      stock: r.stock,
      minStock: 5,
      unit: 'PCS',
      isActive: true,
      version: r.version,
      syncStatus: r.sync_status,
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  public static async upsertFromServer(products: IProduct[]): Promise<void> {
    const db = await getDatabase();
    for (const p of products) {
      await db.runAsync(
        `INSERT OR REPLACE INTO products (id, server_id, sku, barcode, name, category, hsn_sac, selling_price, gst_rate, stock, version, sync_status, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          (p.id || p._id || '') as string,
          (p._id || p.serverId || '') as string,
          p.sku,
          p.barcode || '',
          p.name,
          p.category || 'General',
          p.hsnSac || '4911',
          p.sellingPrice,
          p.gstRate,
          p.stock ?? 0,
          p.version || 1,
          SyncStatus.SYNCED,
          Date.now(),
        ]
      );
    }
  }
}
