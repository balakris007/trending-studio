import {
  InvoiceModel,
  IInvoiceDocument,
  BranchModel,
  CustomerModel,
  CustomerLedgerModel,
  ProductModel,
  InventoryTransactionModel,
  BusinessSettingsModel,
  PaymentModel,
} from '../models';
import { calculateInvoice } from '@trending-studio/billing-engine';
import { formatInvoiceNumber } from '@trending-studio/utils';
import {
  IInvoice,
  PaymentStatus,
  InventoryTransactionType,
  SyncStatus,
} from '@trending-studio/shared-types';
import { logAudit } from '../middlewares/audit';
import { GoogleSheetsService } from './googleSheetsService';

export class InvoiceService {
  /**
   * Atomically generate next sequential invoice number for a branch
   */
  public static async getNextInvoiceNumber(branchId: string): Promise<string> {
    const settings = await BusinessSettingsModel.findOne();
    const prefix = settings?.invoicePrefix || 'TS';
    const financialYear = settings?.financialYear || '26-27';

    const branch = await BranchModel.findByIdAndUpdate(
      branchId,
      { $inc: { invoiceSequenceCounter: 1 } },
      { new: true, upsert: true }
    );

    const seq = branch?.invoiceSequenceCounter || 1;
    return formatInvoiceNumber(prefix, financialYear, seq);
  }

  /**
   * Create official invoice online or reconcile synced offline invoice
   */
  public static async createInvoice(
    invoiceData: Partial<IInvoice>,
    userId: string,
    userName: string
  ): Promise<IInvoiceDocument> {
    let branch = invoiceData.branchId
      ? await BranchModel.findById(invoiceData.branchId)
      : await BranchModel.findOne({ isMainBranch: true });

    if (!branch) {
      branch = await BranchModel.create({
        name: 'Trending Studio — Karaikudi Main',
        code: 'KKDI-01',
        phone: '+91-79040-64446',
        address: 'No:1, Meyyappan Ambalam Complex, Karaikudi - 630001',
        isMainBranch: true,
      });
    }

    const branchId = branch._id.toString();

    // 1. Authoritative Recalculation using shared Billing Engine
    const calculation = calculateInvoice({
      items: invoiceData.items || [],
      payments: invoiceData.payments || [],
      isInterState: invoiceData.isInterState,
      overallDiscount: invoiceData.discountAmount,
    });

    // 2. Allocate official invoice number if not already official
    let officialNumber = invoiceData.invoiceNumber;
    if (!officialNumber || invoiceData.isOffline || officialNumber.startsWith('OFFLINE_')) {
      officialNumber = await this.getNextInvoiceNumber(branchId);
    }

    // 3. Create and persist invoice document
    const invoice = new InvoiceModel({
      ...invoiceData,
      invoiceNumber: officialNumber,
      branchId,
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
      isOffline: false,
      syncStatus: SyncStatus.SYNCED,
      version: 1,
    });

    await invoice.save();

    // 4. Update Customer Ledger & Outstanding Balance
    if (invoice.customerId) {
      const customer = await CustomerModel.findById(invoice.customerId);
      if (customer) {
        const previousBalance = customer.outstandingBalance || 0;
        const newBalance = previousBalance + calculation.balanceDue;

        // Debit full invoice total
        await CustomerLedgerModel.create({
          customerId: customer._id,
          transactionDate: invoice.createdAt,
          transactionType: 'INVOICE',
          referenceId: invoice._id.toString(),
          referenceNumber: officialNumber,
          debit: calculation.grandTotal,
          credit: 0,
          balance: previousBalance + calculation.grandTotal,
          notes: `Invoice ${officialNumber}`,
        });

        // Credit any payments tendered at checkout
        if (calculation.paidAmount > 0) {
          await CustomerLedgerModel.create({
            customerId: customer._id,
            transactionDate: invoice.createdAt,
            transactionType: 'PAYMENT',
            referenceId: invoice._id.toString(),
            referenceNumber: officialNumber,
            debit: 0,
            credit: calculation.paidAmount,
            balance: newBalance,
            notes: `Payment for ${officialNumber}`,
          });

          // Also record in Payment collection
          for (const p of invoice.payments) {
            await PaymentModel.create({
              invoiceId: invoice._id,
              customerId: customer._id,
              customerName: customer.name,
              amount: p.amount,
              method: p.method,
              referenceNumber: p.referenceNumber,
              branchId,
              collectedBy: userId,
              collectedByName: userName,
              notes: `Collected with invoice ${officialNumber}`,
            });
          }
        }

        customer.outstandingBalance = newBalance;
        customer.loyaltyPoints = (customer.loyaltyPoints || 0) + Math.floor(calculation.grandTotal / 100);
        await customer.save();
      }
    }

    // 5. Update Inventory stock for catalog items
    for (const item of calculation.items) {
      if (item.productId && item.itemType === 'PRODUCT') {
        const prod = await ProductModel.findById(item.productId);
        if (prod) {
          const oldStock = prod.stock;
          const newStock = oldStock - item.quantity;
          prod.stock = newStock;
          await prod.save();

          await InventoryTransactionModel.create({
            productId: prod._id,
            productName: prod.name,
            branchId,
            type: InventoryTransactionType.SALE,
            quantityChange: -item.quantity,
            previousStock: oldStock,
            newStock,
            referenceId: invoice._id.toString(),
            notes: `Deducted for bill ${officialNumber}`,
            performedBy: userName,
          });
        }
      }
    }

    // 6. Record Audit Log
    await logAudit({
      action: 'INVOICE_CREATED',
      module: 'BILLING',
      recordId: invoice._id.toString(),
      newValue: {
        invoiceNumber: officialNumber,
        grandTotal: calculation.grandTotal,
        paymentStatus: calculation.paymentStatus,
      },
      userId,
      userName,
    });

    // 7. Real-time Append to Google Sheets Database (Non-blocking)
    GoogleSheetsService.appendInvoice(invoice).catch((sheetErr) => {
      console.warn('[Billing] Google Sheets real-time append skipped/failed:', sheetErr.message);
    });

    return invoice;
  }
}
