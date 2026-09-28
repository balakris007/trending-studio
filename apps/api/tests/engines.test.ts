import { describe, it, expect } from 'vitest';
import { calculateItemGst, generateHsnSummary } from '@trending-studio/gst-engine';
import {
  calculatePhotoPrintPrice,
  calculateCustomFramePrice,
  INITIAL_PHOTO_PRINT_PRICES,
} from '@trending-studio/pricing-engine';
import { calculateInvoice, validateInvoiceReconciliation } from '@trending-studio/billing-engine';
import { detectSyncConflict, canAttemptThreeWayMerge } from '@trending-studio/sync-engine';
import { formatInvoiceNumber, formatINR, calculateRoundOff } from '@trending-studio/utils';
import { PaperFinish, LaminationType, PaymentMethod, PaymentStatus } from '@trending-studio/shared-types';

describe('GST Calculation Engine', () => {
  it('calculates Intra-State 18% GST (CGST 9% + SGST 9%) correctly', () => {
    const result = calculateItemGst({
      unitPrice: 100,
      quantity: 2,
      discountAmount: 0,
      gstRate: 18,
      isInterState: false,
    });

    expect(result.grossAmount).toBe(200);
    expect(result.taxableAmount).toBe(200);
    expect(result.cgstRate).toBe(9);
    expect(result.cgstAmount).toBe(18);
    expect(result.sgstRate).toBe(9);
    expect(result.sgstAmount).toBe(18);
    expect(result.igstAmount).toBe(0);
    expect(result.totalTax).toBe(36);
    expect(result.totalAmount).toBe(236);
  });

  it('calculates Inter-State 18% IGST correctly', () => {
    const result = calculateItemGst({
      unitPrice: 500,
      quantity: 1,
      discountAmount: 50,
      gstRate: 18,
      isInterState: true,
    });

    expect(result.taxableAmount).toBe(450);
    expect(result.cgstAmount).toBe(0);
    expect(result.sgstAmount).toBe(0);
    expect(result.igstRate).toBe(18);
    expect(result.igstAmount).toBe(81);
    expect(result.totalAmount).toBe(531);
  });

  it('calculates Tax-Inclusive pricing correctly without rounding drift', () => {
    // ₹118 inclusive of 18% tax -> Taxable ₹100, Tax ₹18
    const result = calculateItemGst({
      unitPrice: 118,
      quantity: 1,
      discountAmount: 0,
      gstRate: 18,
      isTaxInclusive: true,
      isInterState: false,
    });

    expect(result.taxableAmount).toBe(100);
    expect(result.totalTax).toBe(18);
    expect(result.cgstAmount).toBe(9);
    expect(result.sgstAmount).toBe(9);
    expect(result.totalAmount).toBe(118);
  });
});

describe('Dynamic Pricing Engine', () => {
  it('calculates photo print prices from Trending Studio seed rates', () => {
    // 4x6 = ₹10
    const res4x6 = calculatePhotoPrintPrice({ size: '4x6', quantity: 5 });
    expect(res4x6.baseUnitPrice).toBe(10);
    expect(res4x6.totalPrice).toBe(50);

    // 12x18 = ₹110
    const res12x18 = calculatePhotoPrintPrice({ size: '12x18', quantity: 2 });
    expect(res12x18.baseUnitPrice).toBe(110);
    expect(res12x18.totalPrice).toBe(220);

    // 36x60 = ₹2700
    const res36x60 = calculatePhotoPrintPrice({ size: '36x60', quantity: 1 });
    expect(res36x60.baseUnitPrice).toBe(2700);
  });

  it('applies paper finish and lamination modifiers', () => {
    // 12x18 base ₹110 with Metallic (+25% = ₹27.50) + Velvet Lamination (+₹40)
    const result = calculatePhotoPrintPrice({
      size: '12x18',
      quantity: 1,
      paperFinish: PaperFinish.METALLIC,
      lamination: LaminationType.VELVET,
    });

    expect(result.baseUnitPrice).toBe(110);
    expect(result.finishSurcharge).toBe(27.5);
    expect(result.laminationSurcharge).toBe(40);
    expect(result.finalUnitPrice).toBe(177.5);
    expect(result.totalPrice).toBe(177.5);
  });

  it('calculates custom frame price based on perimeter and materials', () => {
    const frame = calculateCustomFramePrice({
      widthInches: 12,
      heightInches: 18,
      ratePerInch: 7, // 2*(12+18) = 60 inches * 7 = 420
      hasGlass: true,
      assemblyFee: 50,
    });

    expect(frame.perimeterInches).toBe(60);
    expect(frame.mouldingCost).toBe(420);
    expect(frame.totalFramePrice).toBeGreaterThan(500);
  });
});

describe('Authoritative Billing Engine', () => {
  it('correctly calculates composite bill with products, prints, roundoff, and payments', () => {
    const bill = calculateInvoice({
      items: [
        {
          itemType: 'PHOTO_PRINT',
          name: '12x18 Glossy Print',
          quantity: 2,
          unitPrice: 110,
          discountAmount: 0,
          gstRate: 18,
        },
        {
          itemType: 'PRODUCT',
          name: 'Customized Ceramic Mug',
          quantity: 1,
          unitPrice: 250,
          discountAmount: 20,
          gstRate: 18,
        },
      ],
      payments: [
        {
          id: 'pay_1',
          method: PaymentMethod.UPI,
          amount: 500,
          receivedAt: new Date().toISOString(),
          receivedBy: 'Counter Staff',
        },
      ],
    });

    expect(bill.subtotal).toBe(470);
    expect(bill.discountAmount).toBe(20);
    expect(bill.taxableAmount).toBe(450); // 220 + 230
    expect(bill.totalTax).toBe(81); // 18% of 450
    expect(bill.grandTotal).toBe(531);
    expect(bill.paidAmount).toBe(500);
    expect(bill.balanceDue).toBe(31);
    expect(bill.paymentStatus).toBe(PaymentStatus.PARTIAL);

    const validation = validateInvoiceReconciliation(bill);
    expect(validation.isValid).toBe(true);
  });
});

describe('Sync Engine & Conflict Resolution', () => {
  it('detects version conflicts and allows non-overlapping three-way merge', () => {
    const serverDoc = {
      _id: 'cust_123',
      name: 'Kuralarasan',
      mobile: '7904064446',
      city: 'Karaikudi',
      version: 2,
    };

    const clientOp = {
      operationId: 'op_001',
      deviceId: 'dev_01',
      userId: 'usr_01',
      entity: 'customer' as const,
      localId: 'cust_123',
      operationType: 'UPDATE' as any,
      version: 1, // client is on older version
      timestamp: new Date().toISOString(),
      payload: {
        address: 'No:1 Meyyappan Ambalam', // non-overlapping new field
      },
    };

    const conflict = detectSyncConflict(clientOp, serverDoc);
    // Non-overlapping field should auto-resolve
    expect(conflict.hasConflict).toBe(false);
    expect(conflict.strategy).toBe('AUTO_RESOLVE');
    expect(conflict.mergedPayload.address).toBe('No:1 Meyyappan Ambalam');
    expect(conflict.mergedPayload.name).toBe('Kuralarasan');
  });
});

describe('Utilities & GST Formats', () => {
  it('formats official Indian invoice numbers and INR currency', () => {
    const invNum = formatInvoiceNumber('TS', '26-27', 42);
    expect(invNum).toBe('TS/26-27/000042');

    const inr = formatINR(1250.5);
    expect(inr).toBe('₹ 1,250.50');

    const { roundedTotal, roundOff } = calculateRoundOff(1050.4);
    expect(roundedTotal).toBe(1050);
    expect(roundOff).toBe(-0.4);
  });
});
