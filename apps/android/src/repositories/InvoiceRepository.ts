import { getDatabase } from '../database/sqlite';
import { calculateInvoice } from '@trending-studio/billing-engine';
import { IInvoice, SyncStatus, SyncOperationType, PaymentMethod, PaymentStatus } from '@trending-studio/shared-types';

export class InvoiceRepository {
  public static async createOfflineInvoice(
    invoiceData: {
      customerId: string;
      customerName: string;
      customerMobile: string;
      customerGstin?: string;
      placeOfSupply?: string;
      items: any[];
      payments: any[];
      discountAmount?: number;
      notes?: string;
    },
    deviceId: string,
    userId: string
  ): Promise<IInvoice> {
    const db = await getDatabase();
    const now = Date.now();
    const localId = `inv_offline_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const tempInvoiceNumber = `OFFLINE-${now.toString().slice(-6)}`;

    // Calculate authoritative totals using shared Billing Engine
    const calculation = calculateInvoice({
      items: invoiceData.items,
      payments: invoiceData.payments,
      isInterState: false,
      overallDiscount: invoiceData.discountAmount || 0,
    });

    const paymentMethod = invoiceData.payments[0]?.method || PaymentMethod.CASH;

    await db.runAsync(
      `INSERT INTO invoices (
        id, invoice_number, customer_id, customer_name, customer_mobile, place_of_supply,
        subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount, igst_amount,
        total_tax, round_off, grand_total, paid_amount, balance_due, payment_status,
        payment_method, is_offline, version, sync_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        localId,
        tempInvoiceNumber,
        invoiceData.customerId,
        invoiceData.customerName,
        invoiceData.customerMobile,
        invoiceData.placeOfSupply || 'Tamil Nadu',
        calculation.subtotal,
        calculation.discountAmount,
        calculation.taxableAmount,
        calculation.cgstAmount,
        calculation.sgstAmount,
        calculation.igstAmount,
        calculation.totalTax,
        calculation.roundOff,
        calculation.grandTotal,
        calculation.paidAmount,
        calculation.balanceDue,
        calculation.paymentStatus,
        paymentMethod,
        1,
        1,
        SyncStatus.PENDING,
        now,
        now,
      ]
    );

    // Enqueue to sync queue
    const opId = `op_inv_${now}_${Math.random().toString(36).substring(2, 7)}`;
    await db.runAsync(
      `INSERT INTO sync_queue (id, operation_type, entity, local_id, payload, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        opId,
        SyncOperationType.CREATE,
        'invoice',
        localId,
        JSON.stringify({
          ...invoiceData,
          localId,
          isOffline: true,
          items: calculation.items,
          subtotal: calculation.subtotal,
          discountAmount: calculation.discountAmount,
          taxableAmount: calculation.taxableAmount,
          cgstAmount: calculation.cgstAmount,
          sgstAmount: calculation.sgstAmount,
          igstAmount: calculation.igstAmount,
          totalTax: calculation.totalTax,
          roundOff: calculation.roundOff,
          grandTotal: calculation.grandTotal,
          paidAmount: calculation.paidAmount,
          balanceDue: calculation.balanceDue,
          paymentStatus: calculation.paymentStatus,
          payments: invoiceData.payments,
        }),
        now,
        'PENDING',
      ]
    );

    return {
      id: localId,
      invoiceNumber: tempInvoiceNumber,
      isOffline: true,
      customerId: invoiceData.customerId,
      customerName: invoiceData.customerName,
      customerMobile: invoiceData.customerMobile,
      placeOfSupply: invoiceData.placeOfSupply || 'Tamil Nadu',
      isInterState: false,
      branchId: '',
      items: calculation.items,
      subtotal: calculation.subtotal,
      discountAmount: calculation.discountAmount,
      taxableAmount: calculation.taxableAmount,
      cgstAmount: calculation.cgstAmount,
      sgstAmount: calculation.sgstAmount,
      igstAmount: calculation.igstAmount,
      totalTax: calculation.totalTax,
      roundOff: calculation.roundOff,
      grandTotal: calculation.grandTotal,
      paidAmount: calculation.paidAmount,
      balanceDue: calculation.balanceDue,
      paymentStatus: calculation.paymentStatus,
      payments: invoiceData.payments,
      version: 1,
      syncStatus: SyncStatus.PENDING,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };
  }

  public static async listRecent(): Promise<IInvoice[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>('SELECT * FROM invoices ORDER BY created_at DESC LIMIT 50');

    return rows.map((r: any) => ({
      id: r.id,
      serverId: r.server_id,
      invoiceNumber: r.invoice_number,
      isOffline: Boolean(r.is_offline),
      customerId: r.customer_id,
      customerName: r.customer_name,
      customerMobile: r.customer_mobile,
      placeOfSupply: r.place_of_supply,
      isInterState: false,
      branchId: '',
      items: [],
      subtotal: r.subtotal,
      discountAmount: r.discount_amount,
      taxableAmount: r.taxable_amount,
      cgstAmount: r.cgst_amount,
      sgstAmount: r.sgst_amount,
      igstAmount: r.igst_amount,
      totalTax: r.total_tax,
      roundOff: r.round_off,
      grandTotal: r.grand_total,
      paidAmount: r.paid_amount,
      balanceDue: r.balance_due,
      paymentStatus: r.payment_status as PaymentStatus,
      payments: [],
      version: r.version,
      syncStatus: r.sync_status as SyncStatus,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  }

  public static async markSynced(
    localId: string,
    serverId: string,
    officialInvoiceNumber: string
  ): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE invoices 
       SET server_id = ?, invoice_number = ?, sync_status = 'SYNCED', is_offline = 0, updated_at = ?
       WHERE id = ?`,
      [serverId, officialInvoiceNumber, Date.now(), localId]
    );
  }
}
