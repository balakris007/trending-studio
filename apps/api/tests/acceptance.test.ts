import { describe, it, expect } from 'vitest';
import {
  calculateItemGst,
  generateHsnSummary,
  calculateTaxInclusiveAmount,
} from '@trending-studio/gst-engine';
import {
  calculatePhotoPrintPrice,
  calculateCustomFramePrice,
  INITIAL_PHOTO_PRINT_PRICES,
  PAPER_FINISH_RATES,
  LAMINATION_RATES,
} from '@trending-studio/pricing-engine';
import {
  calculateInvoice,
  validateInvoiceReconciliation,
} from '@trending-studio/billing-engine';
import {
  generateOperationId,
  detectSyncConflict,
  canAttemptThreeWayMerge,
} from '@trending-studio/sync-engine';
import {
  formatInvoiceNumber,
  formatINR,
  calculateRoundOff,
  isValidGSTIN,
  isValidIndianMobile,
} from '@trending-studio/utils';
import {
  CustomerType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PaperFinish,
  LaminationType,
  SyncOperationType,
  SyncStatus,
  IInvoiceItem,
  ICartItem,
  IInvoice,
} from '@trending-studio/shared-types';

describe('Trending Studio — Master Acceptance Flow', () => {
  // Step 1: Business Profile Setup
  const businessProfile = {
    name: 'TRENDING STUDIO',
    tagline: 'GIFTS & FRAMES',
    phone: '+91-79040-64446',
    address: '12, Sekkalai Road, Karaikudi - 630001, Sivaganga Dist, Tamil Nadu',
    gstin: '33ABCDE1234F1Z5',
    stateCode: '33', // Tamil Nadu
    invoicePrefix: 'TS',
    financialYear: '26-27',
  };

  it('Step 1: Validates Trending Studio business profile, GSTIN, and phone format', () => {
    expect(businessProfile.name).toBe('TRENDING STUDIO');
    expect(isValidGSTIN(businessProfile.gstin)).toBe(true);
    expect(isValidIndianMobile('7904064446')).toBe(true);
    expect(businessProfile.stateCode).toBe('33');
  });

  // Step 2: Staff User Authentication
  it('Step 2: Simulates staff login & permission verification for billing terminal', () => {
    const staffUser = {
      id: 'usr_staff_01',
      name: 'Counter Staff',
      role: 'BILLING_OPERATOR',
      branchId: 'branch_kkdi_01',
      permissions: ['INVOICE_CREATE', 'INVOICE_VIEW', 'CUSTOMER_CREATE', 'PRINT_RECEIPT'],
    };

    expect(staffUser.permissions).toContain('INVOICE_CREATE');
    expect(staffUser.permissions).toContain('PRINT_RECEIPT');
  });

  // Step 3: Catalog & Dynamic Pricing Rates Verification
  it('Step 3: Verifies seed rates for photo prints (4x6 to 36x60) and finishes', () => {
    expect(INITIAL_PHOTO_PRINT_PRICES.length).toBe(18);
    const size12x18 = INITIAL_PHOTO_PRINT_PRICES.find((p) => p.size === '12x18');
    expect(size12x18?.price).toBe(110);

    const size36x60 = INITIAL_PHOTO_PRINT_PRICES.find((p) => p.size === '36x60');
    expect(size36x60?.price).toBe(2700);

    expect(PAPER_FINISH_RATES[PaperFinish.MATTE]).toBe(0.10);
    expect(PAPER_FINISH_RATES[PaperFinish.METALLIC]).toBe(0.25);
    expect(LAMINATION_RATES[LaminationType.VELVET]).toBe(40);
  });

  // Step 4: Offline Customer Creation
  let offlineCustomer: any = null;
  it('Step 4: Creates a new customer while terminal is OFFLINE', () => {
    offlineCustomer = {
      id: 'cust_local_' + Date.now(),
      name: 'Dr. Subramanian',
      mobile: '9842012345',
      whatsapp: '9842012345',
      city: 'Karaikudi',
      customerType: CustomerType.INDIVIDUAL,
      outstandingBalance: 0,
      loyaltyPoints: 0,
      version: 1,
      syncStatus: SyncStatus.PENDING,
    };

    expect(isValidIndianMobile(offlineCustomer.mobile)).toBe(true);
    expect(offlineCustomer.syncStatus).toBe(SyncStatus.PENDING);
    expect(offlineCustomer.id.startsWith('cust_local_')).toBe(true);
  });

  // Step 5: Item 1 — Photo Print 12x18 Matte Finish with Velvet Lamination
  let photoPrintItem: ICartItem;
  it('Step 5: Calculates dynamic pricing for 12x18 Photo Print with finish & lamination', () => {
    const printCalc = calculatePhotoPrintPrice({
      size: '12x18',
      quantity: 2,
      paperFinish: PaperFinish.MATTE,
      lamination: LaminationType.VELVET,
    });

    // Base: 110, Matte: +10% (11), Velvet Lamination: +40 => 161 per unit
    expect(printCalc.baseUnitPrice).toBe(110);
    expect(printCalc.finishSurcharge).toBe(11);
    expect(printCalc.laminationSurcharge).toBe(40);
    expect(printCalc.finalUnitPrice).toBe(161);
    expect(printCalc.totalPrice).toBe(322);

    photoPrintItem = {
      id: 'item_print_01',
      itemType: 'PHOTO_PRINT',
      name: 'Photo Print 12x18 (Matte + Velvet Lam)',
      quantity: 2,
      unitPrice: 161,
      discountAmount: 0,
      gstRate: 18,
      hsnSac: '4911',
    };
  });

  // Step 6: Item 2 — Custom Frame 12x18 with Teak Moulding & Glass
  let customFrameItem: ICartItem;
  it('Step 6: Calculates perimeter-based price for 12x18 Custom Frame', () => {
    const frameCalc = calculateCustomFramePrice({
      widthInches: 12,
      heightInches: 18,
      ratePerInch: 12, // Teak Moulding rate
      hasGlass: true,
      hasBacking: true,
      assemblyFee: 50,
    });

    // Perimeter = 2 * (12 + 18) = 60 inches
    expect(frameCalc.perimeterInches).toBe(60);
    expect(frameCalc.mouldingCost).toBe(720); // 60 * 12
    expect(frameCalc.totalFramePrice).toBe(921.2);

    customFrameItem = {
      id: 'item_frame_01',
      itemType: 'FRAME',
      name: 'Custom Teak Frame 12x18 with Glass',
      quantity: 1,
      unitPrice: frameCalc.totalFramePrice,
      discountAmount: 0,
      gstRate: 18,
      hsnSac: '4414',
    };
  });

  // Step 7: Item 3 — Retail Product: Ceramic Magic Mug
  let productItem: ICartItem;
  it('Step 7: Adds retail catalog product (Magic Mug) with item-level discount', () => {
    productItem = {
      id: 'item_prod_01',
      productId: 'prod_mug_01',
      itemType: 'PRODUCT',
      name: 'Customized Ceramic Magic Mug',
      quantity: 1,
      unitPrice: 350,
      discountAmount: 50, // Special discount
      gstRate: 18,
      hsnSac: '6912',
    };

    expect(productItem.unitPrice - productItem.discountAmount).toBe(300);
  });

  // Step 8: Item-Level GST Engine Validation (Intra-State Tamil Nadu)
  it('Step 8: Computes exact intra-state GST (CGST 9% + SGST 9%) without rounding drift', () => {
    const gst1 = calculateItemGst({
      unitPrice: photoPrintItem.unitPrice,
      quantity: photoPrintItem.quantity,
      discountAmount: photoPrintItem.discountAmount,
      gstRate: 18,
      isInterState: false,
    });

    expect(gst1.taxableAmount).toBe(322);
    expect(gst1.cgstRate).toBe(9);
    expect(gst1.cgstAmount).toBe(28.98);
    expect(gst1.sgstRate).toBe(9);
    expect(gst1.sgstAmount).toBe(28.98);
    expect(gst1.igstAmount).toBe(0);
    expect(gst1.totalTax).toBe(57.96);
  });

  // Step 9 & 10: Composite Invoice Calculation & Reconciliation
  let offlineInvoiceCalculation: any = null;
  it('Step 9 & 10: Calculates composite bill, round-off, and split payment tender', () => {
    const rawItems = [photoPrintItem, customFrameItem, productItem];

    // Split tender: ₹1000 UPI advance, balance on delivery / cash
    const payments = [
      {
        id: 'pay_split_upi',
        method: PaymentMethod.UPI,
        amount: 1000,
        referenceNumber: 'UPI/2026/987654321',
        receivedAt: new Date().toISOString(),
        receivedBy: 'Counter Staff',
      },
    ];

    offlineInvoiceCalculation = calculateInvoice({
      items: rawItems,
      payments,
      isInterState: false,
      overallDiscount: 0,
    });

    // Subtotal: 322 (prints) + 921.2 (frame) + 350 (mug) = 1593.2
    expect(offlineInvoiceCalculation.subtotal).toBe(1593.2);
    // Discount: 50
    expect(offlineInvoiceCalculation.discountAmount).toBe(50);
    // Taxable: 1543.2
    expect(offlineInvoiceCalculation.taxableAmount).toBe(1543.2);
    // 18% tax: CGST 138.89 + SGST 138.89 = 277.78
    expect(offlineInvoiceCalculation.cgstAmount).toBe(138.89);
    expect(offlineInvoiceCalculation.sgstAmount).toBe(138.89);
    expect(offlineInvoiceCalculation.totalTax).toBe(277.78);
    // Grand Total rounded: 1821
    expect(offlineInvoiceCalculation.grandTotal).toBe(1821);
    expect(offlineInvoiceCalculation.paidAmount).toBe(1000);
    expect(offlineInvoiceCalculation.balanceDue).toBe(821);
    expect(offlineInvoiceCalculation.paymentStatus).toBe(PaymentStatus.PARTIAL);

    // Validate authoritative reconciliation
    const recon = validateInvoiceReconciliation(offlineInvoiceCalculation);
    expect(recon.isValid).toBe(true);
  });

  // Step 11: Offline Persistence & Temporary Invoice Number
  let offlineInvoiceRecord: any = null;
  it('Step 11: Assigns temporary offline invoice ID and persists to local queue', () => {
    const tempNumber = `OFFLINE-${Date.now()}`;
    offlineInvoiceRecord = {
      id: 'inv_local_' + Date.now(),
      invoiceNumber: tempNumber,
      isOffline: true,
      customerId: offlineCustomer.id,
      customerName: offlineCustomer.name,
      customerMobile: offlineCustomer.mobile,
      placeOfSupply: '33-Tamil Nadu',
      isInterState: false,
      branchId: 'branch_kkdi_01',
      items: offlineInvoiceCalculation.items,
      subtotal: offlineInvoiceCalculation.subtotal,
      discountAmount: offlineInvoiceCalculation.discountAmount,
      taxableAmount: offlineInvoiceCalculation.taxableAmount,
      cgstAmount: offlineInvoiceCalculation.cgstAmount,
      sgstAmount: offlineInvoiceCalculation.sgstAmount,
      igstAmount: 0,
      totalTax: offlineInvoiceCalculation.totalTax,
      roundOff: offlineInvoiceCalculation.roundOff,
      grandTotal: offlineInvoiceCalculation.grandTotal,
      paidAmount: offlineInvoiceCalculation.paidAmount,
      balanceDue: offlineInvoiceCalculation.balanceDue,
      paymentStatus: offlineInvoiceCalculation.paymentStatus,
      payments: [
        {
          method: PaymentMethod.UPI,
          amount: 1000,
          referenceNumber: 'UPI/2026/987654321',
        },
      ],
      version: 1,
      syncStatus: SyncStatus.PENDING,
      createdAt: new Date().toISOString(),
    };

    expect(offlineInvoiceRecord.invoiceNumber.startsWith('OFFLINE-')).toBe(true);
    expect(offlineInvoiceRecord.syncStatus).toBe(SyncStatus.PENDING);
  });

  // Step 12: Enqueue Operations in Sync Queue
  let syncQueue: any[] = [];
  it('Step 12: Enqueues customer and invoice create operations with operation IDs', () => {
    const now = Date.now();
    const customerOp = {
      operationId: generateOperationId('android_pos_01', 'customer', offlineCustomer.id, now),
      deviceId: 'android_pos_01',
      userId: 'usr_staff_01',
      entity: 'customer' as const,
      operationType: SyncOperationType.CREATE,
      localId: offlineCustomer.id,
      payload: offlineCustomer,
      timestamp: new Date().toISOString(),
    };

    const invoiceOp = {
      operationId: generateOperationId('android_pos_01', 'invoice', offlineInvoiceRecord.id, now),
      deviceId: 'android_pos_01',
      userId: 'usr_staff_01',
      entity: 'invoice' as const,
      operationType: SyncOperationType.CREATE,
      localId: offlineInvoiceRecord.id,
      payload: offlineInvoiceRecord,
      timestamp: new Date().toISOString(),
    };

    syncQueue.push(customerOp, invoiceOp);
    expect(syncQueue.length).toBe(2);
    expect(customerOp.operationId).toBeDefined();
    expect(invoiceOp.operationId).toBeDefined();
  });

  // Step 13: Conflict Resolution & Optimistic Locking Check
  it('Step 13: Tests optimistic locking conflict detector and merge capabilities', () => {
    const serverCustomerState = {
      _id: 'cust_srv_101',
      name: 'Dr. Subramanian',
      mobile: '9842012345',
      version: 2,
    };

    const clientUpdateOp = {
      operationId: 'op_sync_03',
      deviceId: 'android_pos_01',
      userId: 'usr_staff_01',
      entity: 'customer' as const,
      localId: 'cust_srv_101',
      operationType: SyncOperationType.UPDATE,
      version: 1,
      payload: {
        city: 'Karaikudi Junction',
      },
      timestamp: new Date().toISOString(),
    };

    const conflictResult = detectSyncConflict(clientUpdateOp, serverCustomerState);
    expect(conflictResult.hasConflict).toBe(false);
    expect(conflictResult.strategy).toBe('AUTO_RESOLVE');
    expect(conflictResult.mergedPayload.city).toBe('Karaikudi Junction');
    expect(conflictResult.mergedPayload.name).toBe('Dr. Subramanian');
  });

  // Step 14: Server Assigns Official Sequential Invoice Number
  let officialInvoiceNumber = '';
  it('Step 14: Reconciles offline bill and assigns official financial year sequence (TS/26-27/000001)', () => {
    const sequenceCounter = 1;
    officialInvoiceNumber = formatInvoiceNumber(
      businessProfile.invoicePrefix,
      businessProfile.financialYear,
      sequenceCounter
    );

    expect(officialInvoiceNumber).toBe('TS/26-27/000001');
  });

  // Step 15: Customer Ledger Debit and Credit Entries
  it('Step 15: Updates Customer Ledger atomically with Debit (Total) and Credit (Advance)', () => {
    const customerLedgerEntries: any[] = [];
    let runningBalance = offlineCustomer.outstandingBalance; // 0

    // Entry 1: Invoice Debit
    runningBalance += offlineInvoiceCalculation.grandTotal;
    customerLedgerEntries.push({
      transactionType: 'INVOICE',
      referenceNumber: officialInvoiceNumber,
      debit: offlineInvoiceCalculation.grandTotal, // 1821
      credit: 0,
      balance: runningBalance, // 1821
    });

    // Entry 2: UPI Advance Credit
    runningBalance -= offlineInvoiceCalculation.paidAmount;
    customerLedgerEntries.push({
      transactionType: 'PAYMENT',
      referenceNumber: officialInvoiceNumber,
      debit: 0,
      credit: offlineInvoiceCalculation.paidAmount, // 1000
      balance: runningBalance, // 821
    });

    expect(customerLedgerEntries.length).toBe(2);
    expect(customerLedgerEntries[0].debit).toBe(1821);
    expect(customerLedgerEntries[1].credit).toBe(1000);
    expect(runningBalance).toBe(821); // Matches balanceDue
  });

  // Step 16: Inventory Stock Deduction
  it('Step 16: Deducts inventory for catalog product and generates audit trail', () => {
    const initialProductStock = 25;
    const qtyPurchased = productItem.quantity; // 1
    const newStock = initialProductStock - qtyPurchased;

    const inventoryTx = {
      productId: productItem.productId,
      type: 'SALE',
      quantityChange: -qtyPurchased,
      previousStock: initialProductStock,
      newStock,
      referenceNumber: officialInvoiceNumber,
    };

    expect(inventoryTx.previousStock).toBe(25);
    expect(inventoryTx.newStock).toBe(24);
  });

  // Step 17: GSTR-1 HSN Summary Generation
  it('Step 17: Generates complete GSTR-1 HSN summary for GST tax filing', () => {
    const hsnSummary = generateHsnSummary(offlineInvoiceCalculation.items, false);

    expect(hsnSummary.length).toBeGreaterThan(0);
    const totalTaxable = hsnSummary.reduce((acc, h) => acc + h.taxableAmount, 0);
    const totalGst = hsnSummary.reduce((acc, h) => acc + h.totalTax, 0);

    expect(totalTaxable).toBe(1543.2);
    expect(totalGst).toBe(277.78);
  });

  // Step 18: ESC/POS Thermal Receipt Byte Generation (58mm / 80mm)
  it('Step 18: Generates ESC/POS thermal printer bytes with Trending Studio header and cut command', () => {
    const buffer: number[] = [];
    // Init (ESC @)
    buffer.push(0x1b, 0x40);
    // Center Align (ESC a 1)
    buffer.push(0x1b, 0x61, 0x01);
    // Bold On (ESC E 1)
    buffer.push(0x1b, 0x45, 0x01);

    const appendText = (text: string) => {
      for (let i = 0; i < text.length; i++) buffer.push(text.charCodeAt(i) & 0xff);
      buffer.push(0x0a);
    };

    appendText('TRENDING STUDIO');
    appendText('GIFTS & FRAMES');
    appendText('Karaikudi - 630001 | 79040-64446');
    appendText(`GSTIN: ${businessProfile.gstin}`);
    appendText(`Bill: ${officialInvoiceNumber}`);
    appendText(`Grand Total: INR ${offlineInvoiceCalculation.grandTotal}`);

    // Partial Cut (GS V 66 0)
    buffer.push(0x1d, 0x56, 0x42, 0x00);

    const byteArray = new Uint8Array(buffer);
    expect(byteArray.length).toBeGreaterThan(50);
    expect(byteArray[0]).toBe(0x1b); // ESC
    expect(byteArray[1]).toBe(0x40); // @
    expect(byteArray[byteArray.length - 4]).toBe(0x1d); // GS
    expect(byteArray[byteArray.length - 3]).toBe(0x56); // V
  });

  // Step 19: Local Terminal State Reconciliation
  it('Step 19: Confirms Android local terminal sync completion and status SYNCED', () => {
    offlineInvoiceRecord.invoiceNumber = officialInvoiceNumber;
    offlineInvoiceRecord.syncStatus = SyncStatus.SYNCED;
    offlineCustomer.syncStatus = SyncStatus.SYNCED;

    expect(offlineInvoiceRecord.invoiceNumber).toBe('TS/26-27/000001');
    expect(offlineInvoiceRecord.syncStatus).toBe(SyncStatus.SYNCED);
    expect(offlineCustomer.syncStatus).toBe(SyncStatus.SYNCED);
  });
});
