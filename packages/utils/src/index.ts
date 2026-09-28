/**
 * TRENDING STUDIO — SHARED UTILITIES
 * Pure utility functions for currency, invoice numbers, dates, and mathematical precision.
 */

/**
 * Format a number to Indian Rupee representation (e.g., ₹ 1,250.00)
 */
export function formatINR(amount: number, showSymbol = true): string {
  const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);

  return showSymbol ? `₹ ${formatted}` : formatted;
}

/**
 * High precision 2-decimal place round to avoid floating-point issues
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Indian GST Nearest Rupee Rounding
 * e.g., 1050.40 -> 1050.00 (roundOff = -0.40)
 *       1050.60 -> 1051.00 (roundOff = +0.40)
 */
export function calculateRoundOff(exactTotal: number): { roundedTotal: number; roundOff: number } {
  const roundedTotal = Math.round(exactTotal);
  const roundOff = round2(roundedTotal - exactTotal);
  return { roundedTotal, roundOff };
}

/**
 * Generate official Indian GST Invoice Number
 * e.g., Prefix: "TS", FY: "26-27", Sequence: 142 -> "TS/26-27/000142"
 */
export function formatInvoiceNumber(
  prefix: string,
  financialYear: string,
  sequenceNumber: number,
  paddingLength = 6
): string {
  const cleanPrefix = prefix.replace(/\/+$/, '');
  const paddedSeq = String(sequenceNumber).padStart(paddingLength, '0');
  return `${cleanPrefix}/${financialYear}/${paddedSeq}`;
}

/**
 * Generate Order Reference Number
 * e.g., "TS-ORD-2627-000042"
 */
export function formatOrderNumber(
  financialYear: string,
  sequenceNumber: number,
  paddingLength = 6
): string {
  const cleanFy = financialYear.replace(/[^0-9]/g, '');
  const paddedSeq = String(sequenceNumber).padStart(paddingLength, '0');
  return `TS-ORD-${cleanFy}-${paddedSeq}`;
}

/**
 * Normalize and validate Indian 10-digit mobile number
 */
export function sanitizeMobile(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length > 10 && cleaned.startsWith('91')) {
    return cleaned.slice(2);
  }
  return cleaned;
}

export function isValidIndianMobile(phone: string): boolean {
  const sanitized = sanitizeMobile(phone);
  return /^[6-9]\d{9}$/.test(sanitized);
}

/**
 * Validate Indian GSTIN format (15 characters)
 * 2 digits State Code + 10 char PAN + 1 entity code + 'Z' + 1 check digit
 */
export function isValidGSTIN(gstin: string): boolean {
  if (!gstin) return false;
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.trim().toUpperCase());
}

/**
 * Extract State Code from GSTIN (first 2 digits)
 */
export function getStateCodeFromGSTIN(gstin: string): string | null {
  if (!isValidGSTIN(gstin)) return null;
  return gstin.trim().substring(0, 2);
}

/**
 * Formatted IST Date and Time
 */
export function formatISTDateTime(isoDateString?: string | Date): string {
  const date = isoDateString ? new Date(isoDateString) : new Date();
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
