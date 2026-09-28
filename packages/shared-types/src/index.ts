/**
 * TRENDING STUDIO — SHARED DOMAIN TYPES & ENUMS
 * Common TypeScript interfaces shared across Web, Android, and Backend API.
 */

// ----------------------------------------------------
// 1. Roles & Permissions (RBAC)
// ----------------------------------------------------
export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  BILLING_STAFF = 'BILLING_STAFF',
  SALES_STAFF = 'SALES_STAFF',
  DESIGNER = 'DESIGNER',
  PRODUCTION_STAFF = 'PRODUCTION_STAFF',
  INVENTORY_STAFF = 'INVENTORY_STAFF',
  ACCOUNTANT = 'ACCOUNTANT',
  VIEWER = 'VIEWER',
}

export enum Permission {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  PRINT = 'PRINT',
  EXPORT = 'EXPORT',
  REFUND = 'REFUND',
  PRICE_MODIFY = 'PRICE_MODIFY',
  GST_MODIFY = 'GST_MODIFY',
  USER_MANAGE = 'USER_MANAGE',
  SETTINGS_MANAGE = 'SETTINGS_MANAGE',
  REPORT_VIEW = 'REPORT_VIEW',
}

// ----------------------------------------------------
// 2. User & Authentication
// ----------------------------------------------------
export interface IUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  permissions?: Permission[];
  branchId?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: IUser;
  tokens: AuthTokens;
  branch?: IBranch;
}

// ----------------------------------------------------
// 3. Business Settings & Branches
// ----------------------------------------------------
export interface IBusinessSettings {
  _id?: string;
  id?: string;
  businessName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  stateCode: string; // e.g. "33" for Tamil Nadu
  gstin: string;
  pan: string;
  invoicePrefix: string;
  financialYear: string;
  thermalHeader: string[];
  thermalFooter: string[];
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifscCode: string;
    branchName: string;
    upiId: string;
    upiQrPayload?: string;
  };
  taxConfig: {
    defaultGstRate: number;
    enableUtgst: boolean;
    pricesIncludeTax: boolean;
  };
  logoUrl?: string;
  updatedAt?: string;
}

export interface IBranch {
  _id?: string;
  id?: string;
  name: string;
  code: string;
  phone: string;
  address: string;
  isMainBranch: boolean;
  isActive: boolean;
  invoiceSequenceCounter: number;
}

// ----------------------------------------------------
// 4. Device Management
// ----------------------------------------------------
export interface IDevice {
  _id?: string;
  id?: string;
  deviceId: string;
  deviceName: string;
  deviceModel?: string;
  platform: 'ANDROID' | 'WEB' | 'DESKTOP';
  appVersion: string;
  userId?: string;
  userName?: string;
  branchId: string;
  isRevoked: boolean;
  lastActive: string;
  lastSyncAt?: string;
  registeredAt: string;
}

// ----------------------------------------------------
// 5. Customer & CRM
// ----------------------------------------------------
export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL',
  STUDIO = 'STUDIO',
  CORPORATE = 'CORPORATE',
  WHOLESALE = 'WHOLESALE',
}

export interface ICustomer {
  _id?: string;
  id: string; // Local UUID or Server ID
  serverId?: string;
  name: string;
  mobile: string;
  whatsapp?: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  stateCode?: string;
  gstin?: string;
  pan?: string;
  customerType: CustomerType;
  notes?: string;
  tags?: string[];
  creditLimit?: number;
  outstandingBalance: number;
  loyaltyPoints?: number;
  dateOfBirth?: string;
  anniversaryDate?: string;
  version: number;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ICustomerLedger {
  _id?: string;
  customerId: string;
  transactionDate: string;
  transactionType: 'INVOICE' | 'PAYMENT' | 'RETURN' | 'OPENING_BALANCE';
  referenceId: string; // Invoice ID or Payment ID
  referenceNumber: string;
  debit: number;  // Increases receivables
  credit: number; // Decreases receivables
  balance: number;
  notes?: string;
}

// ----------------------------------------------------
// 6. Products & Inventory
// ----------------------------------------------------
export interface IProduct {
  _id?: string;
  id: string;
  serverId?: string;
  sku: string;
  name: string;
  category: string;
  barcode?: string;
  hsnSac: string;
  purchasePrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  gstRate: number; // 0, 5, 12, 18, 28
  stock: number;
  minStock: number;
  unit: string; // 'PCS', 'BOX', 'MTR', 'ROLL'
  supplierId?: string;
  imageUrl?: string;
  description?: string;
  isActive: boolean;
  version: number;
  syncStatus: SyncStatus;
  updatedAt: string;
}

export enum InventoryTransactionType {
  STOCK_IN = 'STOCK_IN',
  STOCK_OUT = 'STOCK_OUT',
  ADJUSTMENT = 'ADJUSTMENT',
  DAMAGE = 'DAMAGE',
  RETURN = 'RETURN',
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  TRANSFER = 'TRANSFER',
}

export interface IInventoryTransaction {
  _id?: string;
  productId: string;
  productName: string;
  branchId: string;
  type: InventoryTransactionType;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  unitCost?: number;
  referenceId?: string; // invoiceId or purchaseId
  notes?: string;
  performedBy: string;
  timestamp: string;
}

// ----------------------------------------------------
// 7. Photo Printing Module
// ----------------------------------------------------
export interface IPhotoPrintSizePrice {
  _id?: string;
  id: string;
  size: string; // e.g., "4x6", "6x8", "12x18"
  widthInches: number;
  heightInches: number;
  basePrice: number; // e.g. 10 for 4x6, 110 for 12x18
  isActive: boolean;
  category?: 'STANDARD' | 'POSTER' | 'LARGE_FORMAT';
  description?: string;
  updatedAt?: string;
}

export enum PaperFinish {
  GLOSSY = 'GLOSSY',
  MATTE = 'MATTE',
  METALLIC = 'METALLIC',
  CANVAS = 'CANVAS',
  LUSTER = 'LUSTER',
}

export enum LaminationType {
  NONE = 'NONE',
  COLD_MATTE = 'COLD_MATTE',
  COLD_GLOSS = 'COLD_GLOSS',
  THERMAL_MATTE = 'THERMAL_MATTE',
  VELVET = 'VELVET',
  SPARKLE = 'SPARKLE',
}

export interface IPhotoPrintOrderItem {
  size: string;
  quantity: number;
  paperFinish: PaperFinish;
  lamination: LaminationType;
  unitBasePrice: number;
  finishSurcharge: number;
  laminationSurcharge: number;
  unitFinalPrice: number;
  totalPrice: number;
  imageUrls?: string[];
  notes?: string;
}

// ----------------------------------------------------
// 8. Custom Frame Pricing Master
// ----------------------------------------------------
export interface IFrameType {
  _id?: string;
  id: string;
  code: string;
  name: string; // e.g., "Teak Synthetic", "Classic Gold", "Deep Shadow Box"
  mouldingWidthInches: number;
  ratePerInch: number; // running inch or perimeter calculation
  ratePerSqInch?: number;
  imageUrl?: string;
  isActive: boolean;
}

export interface IFramePriceConfig {
  _id?: string;
  id: string;
  size: string; // e.g., "12x18", "16x24", "20x30"
  widthInches: number;
  heightInches: number;
  frameTypeId: string;
  frameTypeName: string;
  basePrice: number;
  glassPrice: number; // Normal glass or acrylic
  mountBoardPrice: number;
  isCustomSize: boolean;
  isActive: boolean;
}

// ----------------------------------------------------
// 9. Orders & Studio Production
// ----------------------------------------------------
export enum OrderStatus {
  DRAFT = 'DRAFT',
  QUOTATION = 'QUOTATION',
  CONFIRMED = 'CONFIRMED',
  ADVANCE_PAID = 'ADVANCE_PAID',
  DESIGNING = 'DESIGNING',
  PRINTING = 'PRINTING',
  FRAMING = 'FRAMING',
  QUALITY_CHECK = 'QUALITY_CHECK',
  READY = 'READY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export interface IOrderItem {
  id: string;
  itemType: 'PRODUCT' | 'PHOTO_PRINT' | 'FRAME' | 'STUDIO_SERVICE' | 'CUSTOM';
  productId?: string;
  name: string;
  hsnSac: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  // Studio custom fields
  photoDetails?: {
    size: string;
    finish: PaperFinish;
    lamination: LaminationType;
    imageUrls: string[];
  };
  frameDetails?: {
    frameTypeName: string;
    size: string;
    hasGlass: boolean;
    glassType?: 'STANDARD' | 'NON_REFLECTIVE_ACRYLIC';
    hasMount: boolean;
    mountBorderInches?: number;
  };
  notes?: string;
}

export interface IOrder {
  _id?: string;
  id: string; // UUID locally
  serverId?: string;
  orderNumber: string; // TS-ORD-2627-0001
  customerId: string;
  customerName: string;
  customerMobile: string;
  branchId: string;
  items: IOrderItem[];
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  advancePaid: number;
  balanceDue: number;
  status: OrderStatus;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  deliveryDate?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  invoiceId?: string;
  photosUploaded: string[];
  version: number;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

export interface IProductionTask {
  _id?: string;
  orderId: string;
  stage: OrderStatus;
  assignedTo?: string;
  assignedToName?: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'DONE';
}

// ----------------------------------------------------
// 10. Billing, GST & Invoices
// ----------------------------------------------------
export enum PaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT = 'CREDIT',
  MIXED = 'MIXED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export interface IInvoiceItem {
  id: string;
  itemType: 'PRODUCT' | 'PHOTO_PRINT' | 'FRAME' | 'STUDIO_SERVICE' | 'CUSTOM';
  productId?: string;
  name: string;
  hsnSac: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number; // e.g. 18
  cgstRate: number; // e.g. 9
  cgstAmount: number;
  sgstRate: number; // e.g. 9
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalAmount: number;
  metadata?: Record<string, any>;
}

export interface IPaymentRecord {
  id: string;
  method: PaymentMethod;
  amount: number;
  referenceNumber?: string;
  receivedAt: string;
  receivedBy: string;
  notes?: string;
}

export interface IInvoice {
  _id?: string;
  id: string; // Local UUID or Server ID
  serverId?: string;
  invoiceNumber: string; // Official: TS/26-27/000001 or Temporary Offline UUID
  isOffline: boolean;
  orderId?: string;
  customerId: string;
  customerName: string;
  customerMobile: string;
  customerGstin?: string;
  placeOfSupply: string; // State name or code, e.g. "Tamil Nadu" (33)
  isInterState: boolean;
  branchId: string;
  deviceId?: string;
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
  paymentStatus: PaymentStatus;
  payments: IPaymentRecord[];
  notes?: string;
  terms?: string;
  cancelledAt?: string;
  cancelledReason?: string;
  cancelledBy?: string;
  version: number;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
}

// ----------------------------------------------------
// 11. Offline Synchronization Protocol
// ----------------------------------------------------
export enum SyncStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  CONFLICT = 'CONFLICT',
}

export enum SyncOperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export type SyncEntityType =
  | 'customer'
  | 'invoice'
  | 'order'
  | 'payment'
  | 'inventory'
  | 'product';

export interface ISyncOperation {
  operationId: string; // Client UUID
  deviceId: string;
  userId: string;
  entity: SyncEntityType;
  localId: string;
  serverId?: string;
  operationType: SyncOperationType;
  version: number;
  timestamp: string;
  payload: any;
  retryCount?: number;
  status?: SyncStatus;
  errorMessage?: string;
}

export interface ISyncPushRequest {
  deviceId: string;
  userId: string;
  branchId: string;
  appVersion: string;
  operations: ISyncOperation[];
}

export interface ISyncPushResult {
  operationId: string;
  localId: string;
  serverId: string;
  entity: SyncEntityType;
  status: 'PROCESSED' | 'DUPLICATE_SKIPPED' | 'CONFLICT' | 'REJECTED';
  assignedInvoiceNumber?: string;
  assignedOrderNumber?: string;
  serverVersion: number;
  conflictDetails?: {
    reason: string;
    serverPayload: any;
  };
}

export interface ISyncPushResponse {
  success: boolean;
  processedCount: number;
  results: ISyncPushResult[];
  serverTime: string;
}

export interface ISyncPullRequest {
  deviceId: string;
  lastSyncedAt: string;
  entities?: SyncEntityType[];
}

export interface ISyncPullResponse {
  success: boolean;
  serverTime: string;
  deltas: {
    customers: ICustomer[];
    products: IProduct[];
    photoPrintPrices: IPhotoPrintSizePrice[];
    framePrices: IFramePriceConfig[];
    orders: IOrder[];
    invoices: IInvoice[];
    settings: IBusinessSettings;
  };
}

// ----------------------------------------------------
// 12. Audit Log & Notifications
// ----------------------------------------------------
export interface IAuditLog {
  _id?: string;
  userId: string;
  userName: string;
  userRole: Role;
  deviceId?: string;
  action: string; // e.g. "INVOICE_CREATE", "PRICE_UPDATE", "DISCOUNT_GIVEN"
  module: string; // "BILLING", "SETTINGS", "SECURITY", "INVENTORY"
  recordId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  timestamp: string;
}

export interface IAppNotification {
  _id?: string;
  id: string;
  userId?: string;
  targetRole?: Role;
  title: string;
  body: string;
  type: 'ORDER_READY' | 'LOW_STOCK' | 'PAYMENT_DUE' | 'SYNC_STATUS' | 'CRM_FOLLOWUP';
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

// ----------------------------------------------------
// 13. API Standard Envelope
// ----------------------------------------------------
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp?: string;
  };
}
