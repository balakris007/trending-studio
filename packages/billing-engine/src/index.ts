/**
 * TRENDING STUDIO — AUTHORITATIVE BILLING ENGINE
 * Calculates composite invoices, line items, discounts, roundoff, and payment splits.
 * Identical execution on Android Offline SQLite, Web Admin POS, and Express Backend.
 */

import {
  IInvoiceItem,
  IPaymentRecord,
  PaymentStatus,
} from '@trending-studio/shared-types';
import { round2, calculateRoundOff } from '@trending-studio/utils';
import { calculateItemGst } from '@trending-studio/gst-engine';

export interface BillingInputItem {
  id?: string;
  itemType: 'PRODUCT' | 'PHOTO_PRINT' | 'FRAME' | 'STUDIO_SERVICE' | 'CUSTOM';
  productId?: string;
  name: string;
  hsnSac?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  gstRate: number; // e.g. 18
  metadata?: Record<string, any>;
}

export interface BillingCalculationInput {
  items: BillingInputItem[];
  payments?: IPaymentRecord[];
  isInterState?: boolean;
  isTaxInclusive?: boolean;
  overallDiscount?: number;
}

export interface CalculatedInvoiceResult {
  items: IInvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  changeDue: number;
  paymentStatus: PaymentStatus;
}

/**
 * Calculate complete invoice with line items, GST breakdown, and roundoff
 */
export function calculateInvoice(
  input: BillingCalculationInput
): CalculatedInvoiceResult {
  const calculatedItems: IInvoiceItem[] = [];
  let subtotal = 0;
  let totalLineDiscounts = 0;
  let taxableAmount = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalTax = 0;

  for (let i = 0; i < input.items.length; i++) {
    const raw = input.items[i];
    const qty = Math.max(1, raw.quantity);
    const price = Math.max(0, raw.unitPrice);
    const discount = Math.max(0, raw.discountAmount || 0);

    const gstBreakdown = calculateItemGst({
      unitPrice: price,
      quantity: qty,
      discountAmount: discount,
      gstRate: raw.gstRate,
      isInterState: input.isInterState,
      isTaxInclusive: input.isTaxInclusive,
    });

    const item: IInvoiceItem = {
      id: raw.id || `item_${i + 1}`,
      itemType: raw.itemType,
      productId: raw.productId,
      name: raw.name,
      hsnSac: raw.hsnSac || '4911',
      quantity: qty,
      unitPrice: price,
      discountAmount: discount,
      taxableAmount: gstBreakdown.taxableAmount,
      gstRate: raw.gstRate,
      cgstRate: gstBreakdown.cgstRate,
      cgstAmount: gstBreakdown.cgstAmount,
      sgstRate: gstBreakdown.sgstRate,
      sgstAmount: gstBreakdown.sgstAmount,
      igstRate: gstBreakdown.igstRate,
      igstAmount: gstBreakdown.igstAmount,
      totalAmount: gstBreakdown.totalAmount,
      metadata: raw.metadata,
    };

    calculatedItems.push(item);

    subtotal = round2(subtotal + gstBreakdown.grossAmount);
    totalLineDiscounts = round2(totalLineDiscounts + discount);
    taxableAmount = round2(taxableAmount + gstBreakdown.taxableAmount);
    totalCgst = round2(totalCgst + gstBreakdown.cgstAmount);
    totalSgst = round2(totalSgst + gstBreakdown.sgstAmount);
    totalIgst = round2(totalIgst + gstBreakdown.igstAmount);
    totalTax = round2(totalTax + gstBreakdown.totalTax);
  }

  // Factor overall cart discount if any
  const overallDiscount = Math.max(0, input.overallDiscount || 0);
  const totalDiscount = round2(totalLineDiscounts + overallDiscount);

  const exactTotal = round2(taxableAmount + totalTax);
  const { roundedTotal: grandTotal, roundOff } = calculateRoundOff(exactTotal);

  // Reconcile payments
  let paidAmount = 0;
  if (input.payments && input.payments.length > 0) {
    for (const p of input.payments) {
      paidAmount = round2(paidAmount + p.amount);
    }
  }

  let balanceDue = 0;
  let changeDue = 0;

  if (paidAmount >= grandTotal) {
    balanceDue = 0;
    changeDue = round2(paidAmount - grandTotal);
  } else {
    balanceDue = round2(grandTotal - paidAmount);
    changeDue = 0;
  }

  let paymentStatus: PaymentStatus = PaymentStatus.UNPAID;
  if (paidAmount >= grandTotal) {
    paymentStatus = PaymentStatus.PAID;
  } else if (paidAmount > 0) {
    paymentStatus = PaymentStatus.PARTIAL;
  }

  return {
    items: calculatedItems,
    subtotal,
    discountAmount: totalDiscount,
    taxableAmount,
    cgstAmount: totalCgst,
    sgstAmount: totalSgst,
    igstAmount: totalIgst,
    totalTax,
    roundOff,
    grandTotal,
    paidAmount,
    balanceDue,
    changeDue,
    paymentStatus,
  };
}

/**
 * Validate that an invoice's totals strictly reconcile mathematically
 * Returns true if valid or array of discrepancies
 */
export function validateInvoiceReconciliation(
  invoice: CalculatedInvoiceResult
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  const expectedTax = round2(
    invoice.cgstAmount + invoice.sgstAmount + invoice.igstAmount
  );
  if (Math.abs(expectedTax - invoice.totalTax) > 0.05) {
    errors.push(
      `Tax sum discrepancy: CGST+SGST+IGST (${expectedTax}) != totalTax (${invoice.totalTax})`
    );
  }

  const expectedExact = round2(invoice.taxableAmount + invoice.totalTax);
  const expectedRounded = Math.round(expectedExact);
  if (expectedRounded !== invoice.grandTotal) {
    errors.push(
      `Grand total discrepancy: Expected ${expectedRounded}, got ${invoice.grandTotal}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
