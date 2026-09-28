import { getDatabase } from '../database/sqlite';
import { ICustomer, SyncStatus, SyncOperationType } from '@trending-studio/shared-types';

export class CustomerRepository {
  public static async search(query: string): Promise<ICustomer[]> {
    const db = await getDatabase();
    const clean = `%${query.trim()}%`;
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM customers WHERE name LIKE ? OR mobile LIKE ? ORDER BY name ASC LIMIT 30',
      [clean, clean]
    );

    return rows.map((r: any) => ({
      id: r.id,
      serverId: r.server_id,
      name: r.name,
      mobile: r.mobile,
      whatsapp: r.whatsapp,
      email: r.email,
      address: r.address,
      city: r.city,
      gstin: r.gstin,
      customerType: r.customer_type,
      outstandingBalance: r.outstanding_balance,
      loyaltyPoints: r.loyalty_points,
      version: r.version,
      syncStatus: r.sync_status,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  }

  public static async insertOffline(
    customer: Partial<ICustomer>,
    deviceId: string,
    userId: string
  ): Promise<ICustomer> {
    const db = await getDatabase();
    const id = customer.id || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    await db.runAsync(
      `INSERT INTO customers (id, name, mobile, whatsapp, city, gstin, customer_type, outstanding_balance, loyalty_points, version, sync_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        customer.name || 'Walk-in Customer',
        customer.mobile || '',
        customer.whatsapp || customer.mobile || '',
        customer.city || 'Karaikudi',
        customer.gstin || '',
        customer.customerType || 'INDIVIDUAL',
        customer.outstandingBalance || 0,
        customer.loyaltyPoints || 0,
        1,
        SyncStatus.PENDING,
        now,
        now,
      ]
    );

    // Enqueue operation into sync_queue
    const opId = `op_cust_${now}_${Math.random().toString(36).substring(2, 7)}`;
    await db.runAsync(
      `INSERT INTO sync_queue (id, operation_type, entity, local_id, payload, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        opId,
        SyncOperationType.CREATE,
        'customer',
        id,
        JSON.stringify({ ...customer, id }),
        now,
        'PENDING',
      ]
    );

    return {
      id,
      name: customer.name || '',
      mobile: customer.mobile || '',
      customerType: (customer.customerType as any) || 'INDIVIDUAL',
      outstandingBalance: customer.outstandingBalance || 0,
      version: 1,
      syncStatus: SyncStatus.PENDING,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };
  }

  public static async upsertFromServer(customers: ICustomer[]): Promise<void> {
    const db = await getDatabase();
    for (const c of customers) {
      const now = Date.now();
      await db.runAsync(
        `INSERT OR REPLACE INTO customers (id, server_id, name, mobile, whatsapp, city, gstin, customer_type, outstanding_balance, loyalty_points, version, sync_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          (c.id || c._id || '') as string,
          (c._id || c.serverId || '') as string,
          c.name,
          c.mobile,
          c.whatsapp || '',
          c.city || 'Karaikudi',
          c.gstin || '',
          (c.customerType || 'INDIVIDUAL') as string,
          c.outstandingBalance || 0,
          c.loyaltyPoints || 0,
          c.version || 1,
          SyncStatus.SYNCED,
          now,
          now,
        ]
      );
    }
  }
}
