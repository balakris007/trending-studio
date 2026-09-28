/**
 * TRENDING STUDIO — GST CALCULATION ENGINE
 * Authoritative Indian Goods and Services Tax (GST) mathematical calculations.
 * Used identically on Web, Android, and Backend API.
 */

import { round2 } from '@trending-studio/utils';

export interface GstItemCalculationInput {
  unitPrice: number;
  quantity: number;
  discountAmount?: number;
  gstRate: number; // e.g., 0, 5, 12, 18, 28
  isTaxInclusive?: boolean;
  isInterState?: boolean;
  isUtgst?: boolean;
}

export interface GstItemCalculationResult {
  grossAmount: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export interface HsnSummaryItem {
  hsnSac: string;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

/**
 * Compute GST breakdown for a single item line
 */
export function calculateItemGst(input: GstItemCalculationInput): GstItemCalculationResult {
  const quantity = Math.max(1, input.quantity);
  const discount = Math.max(0, input.discountAmount || 0);
  const gstRate = Math.max(0, input.gstRate);
  const isInterState = Boolean(input.isInterState);

  let taxableAmount = 0;
  let totalTax = 0;
  let grossAmount = 0;
  let totalAmount = 0;

  if (input.isTaxInclusive && gstRate > 0) {
    // Total price already contains GST
    // Formula: Taxable = (Price * 100) / (100 + Rate)
    const totalLineValue = Math.max(0, input.unitPrice * quantity - discount);
    taxableAmount = round2((totalLineValue * 100) / (100 + gstRate));
    totalTax = round2(totalLineValue - taxableAmount);
    grossAmount = round2(input.unitPrice * quantity);
    totalAmount = totalLineValue;
  } else {
    // Tax exclusive: Tax is added on top of taxable value
    grossAmount = round2(input.unitPrice * quantity);
    taxableAmount = Math.max(0, round2(grossAmount - discount));
    totalTax = round2((taxableAmount * gstRate) / 100);
    totalAmount = round2(taxableAmount + totalTax);
  }

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (isInterState) {
    // Inter-State transaction (e.g. Tamil Nadu -> Karnataka): Full IGST applies
    igstRate = gstRate;
    igstAmount = totalTax;
  } else {
    // Intra-State transaction (e.g. Tamil Nadu -> Tamil Nadu): CGST + SGST split 50/50
    cgstRate = gstRate / 2;
    sgstRate = gstRate / 2;
    cgstAmount = round2(totalTax / 2);
    sgstAmount = round2(totalTax - cgstAmount); // Exact split without rounding drift
  }

  return {
    grossAmount,
    discountAmount: discount,
    taxableAmount,
    gstRate,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalTax,
    totalAmount,
  };
}

/**
 * Aggregate line items into an HSN/SAC summary table (useful for GSTR-1 & Invoice footer)
 */
export function generateHsnSummary(
  items: Array<{
    hsnSac: string;
    taxableAmount: number;
    gstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
  }>
): HsnSummaryItem[] {
  const map = new Map<string, HsnSummaryItem>();

  for (const item of items) {
    const key = `${item.hsnSac || '4911'}_${item.gstRate}`;
    const existing = map.get(key);

    if (existing) {
      existing.taxableAmount = round2(existing.taxableAmount + item.taxableAmount);
      existing.cgstAmount = round2(existing.cgstAmount + item.cgstAmount);
      existing.sgstAmount = round2(existing.sgstAmount + item.sgstAmount);
      existing.igstAmount = round2(existing.igstAmount + item.igstAmount);
      existing.totalTax = round2(
        existing.cgstAmount + existing.sgstAmount + existing.igstAmount
      );
      existing.totalAmount = round2(existing.totalAmount + item.totalAmount);
    } else {
      map.set(key, {
        hsnSac: item.hsnSac || '4911',
        taxableAmount: item.taxableAmount,
        gstRate: item.gstRate,
        cgstAmount: item.cgstAmount,
        sgstAmount: item.sgstAmount,
        igstAmount: item.igstAmount,
        totalTax: round2(item.cgstAmount + item.sgstAmount + item.igstAmount),
        totalAmount: item.totalAmount,
      });
    }
  }

  return Array.from(map.values());
}
