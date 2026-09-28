import { z } from 'zod';
import {
  Role,
  CustomerType,
  PaymentMethod,
  OrderStatus,
  PaperFinish,
  LaminationType,
  SyncOperationType,
} from '@trending-studio/shared-types';

// ----------------------------------------------------
// Auth Schemas
// ----------------------------------------------------
export const loginSchema = z.object({
  identifier: z.string().min(3, 'Username, email or phone is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
  platform: z.enum(['ANDROID', 'WEB', 'DESKTOP']).default('WEB'),
  appVersion: z.string().default('1.0.0'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  deviceId: z.string().optional(),
});

// ----------------------------------------------------
// Customer Schemas
// ----------------------------------------------------
export const createCustomerSchema = z.object({
  id: z.string().optional(), // Local UUID if created offline
  name: z.string().min(2, 'Customer name must be at least 2 characters'),
  mobile: z.string().regex(/^[0-9+ -]{10,14}$/, 'Invalid mobile phone format'),
  whatsapp: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().default('Karaikudi'),
  district: z.string().default('Sivaganga'),
  state: z.string().default('Tamil Nadu'),
  pincode: z.string().default('630001'),
  stateCode: z.string().default('33'),
  gstin: z.string().optional().or(z.literal('')),
  pan: z.string().optional().or(z.literal('')),
  customerType: z.nativeEnum(CustomerType).default(CustomerType.INDIVIDUAL),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  creditLimit: z.number().min(0).default(0),
  outstandingBalance: z.number().default(0),
});

export const quickCustomerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name required'),
  mobile: z.string().min(10, 'Valid 10-digit mobile required'),
  customerType: z.nativeEnum(CustomerType).default(CustomerType.INDIVIDUAL),
});

// ----------------------------------------------------
// Product Schemas
// ----------------------------------------------------
export const createProductSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(2, 'SKU required'),
  name: z.string().min(2, 'Product name required'),
  category: z.string().min(1, 'Category required'),
  barcode: z.string().optional(),
  hsnSac: z.string().default('4911'),
  purchasePrice: z.number().min(0, 'Purchase price cannot be negative'),
  sellingPrice: z.number().min(0, 'Selling price must be positive'),
  wholesalePrice: z.number().min(0).optional(),
  gstRate: z.number().min(0).max(28).default(18),
  stock: z.number().int().default(0),
  minStock: z.number().int().default(5),
  unit: z.string().default('PCS'),
  supplierId: z.string().optional(),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

// ----------------------------------------------------
// Photo Print & Frame Master Schemas
// ----------------------------------------------------
export const photoPrintPriceSchema = z.object({
  id: z.string().optional(),
  size: z.string().min(1, 'Size is required (e.g. 4x6, 12x18)'),
  widthInches: z.number().positive(),
  heightInches: z.number().positive(),
  basePrice: z.number().min(0),
  isActive: z.boolean().default(true),
  category: z.enum(['STANDARD', 'POSTER', 'LARGE_FORMAT']).default('STANDARD'),
});

export const frameTypeSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(1),
  name: z.string().min(2),
  mouldingWidthInches: z.number().positive(),
  ratePerInch: z.number().min(0),
  isActive: z.boolean().default(true),
});

// ----------------------------------------------------
// Invoice & Payment Schemas
// ----------------------------------------------------
export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  itemType: z.enum(['PRODUCT', 'PHOTO_PRINT', 'FRAME', 'STUDIO_SERVICE', 'CUSTOM']).default('PRODUCT'),
  productId: z.string().optional(),
  name: z.string().min(1, 'Item name is required'),
  hsnSac: z.string().default('4911'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  discountAmount: z.number().min(0).default(0),
  taxableAmount: z.number().optional(),
  gstRate: z.number().min(0).max(28).default(18),
  cgstRate: z.number().optional(),
  cgstAmount: z.number().optional(),
  sgstRate: z.number().optional(),
  sgstAmount: z.number().optional(),
  igstRate: z.number().optional(),
  igstAmount: z.number().optional(),
  totalAmount: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

export const paymentRecordSchema = z.object({
  id: z.string().optional(),
  method: z.nativeEnum(PaymentMethod),
  amount: z.number().positive('Payment amount must be positive'),
  referenceNumber: z.string().optional(),
  receivedAt: z.string().optional(),
  receivedBy: z.string().optional(),
  notes: z.string().optional(),
});

export const createInvoiceSchema = z.object({
  id: z.string().optional(), // Local UUID for offline bills
  orderId: z.string().optional(),
  customerId: z.string().min(1, 'Customer ID is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  customerMobile: z.string().min(10, 'Valid customer phone is required'),
  customerGstin: z.string().optional(),
  placeOfSupply: z.string().default('Tamil Nadu'),
  isInterState: z.boolean().default(false),
  branchId: z.string().optional(),
  deviceId: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, 'Invoice must contain at least one item'),
  subtotal: z.number().optional(),
  discountAmount: z.number().min(0).default(0),
  taxableAmount: z.number().optional(),
  cgstAmount: z.number().min(0).default(0),
  sgstAmount: z.number().min(0).default(0),
  igstAmount: z.number().min(0).default(0),
  totalTax: z.number().optional(),
  roundOff: z.number().default(0),
  grandTotal: z.number().optional(),
  paidAmount: z.number().min(0).default(0),
  balanceDue: z.number().default(0),
  payments: z.array(paymentRecordSchema).default([]),
  notes: z.string().optional(),
  isOffline: z.boolean().default(false),
});

// ----------------------------------------------------
// Order & Studio Production Schemas
// ----------------------------------------------------
export const createOrderSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  customerMobile: z.string().min(10),
  branchId: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1),
  subtotal: z.number().optional(),
  discountAmount: z.number().min(0).default(0),
  taxableAmount: z.number().optional(),
  cgstAmount: z.number().default(0),
  sgstAmount: z.number().default(0),
  igstAmount: z.number().default(0),
  totalTax: z.number().optional(),
  roundOff: z.number().default(0),
  grandTotal: z.number().optional(),
  advancePaid: z.number().min(0).default(0),
  balanceDue: z.number().default(0),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  deliveryDate: z.string().optional(),
  assignedStaffId: z.string().optional(),
  photosUploaded: z.array(z.string()).default([]),
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  assignedTo: z.string().optional(),
  notes: z.string().optional(),
});

// ----------------------------------------------------
// Sync Protocol Schemas
// ----------------------------------------------------
export const syncOperationSchema = z.object({
  operationId: z.string().min(1, 'operationId UUID required'),
  deviceId: z.string().min(1, 'deviceId required'),
  userId: z.string().min(1, 'userId required'),
  entity: z.enum(['customer', 'invoice', 'order', 'payment', 'inventory', 'product']),
  localId: z.string().min(1, 'localId required'),
  serverId: z.string().optional(),
  operationType: z.nativeEnum(SyncOperationType),
  version: z.number().int().default(1),
  timestamp: z.string(),
  payload: z.any(),
  retryCount: z.number().default(0),
});

export const syncPushSchema = z.object({
  deviceId: z.string().min(1),
  userId: z.string().min(1),
  branchId: z.string().optional(),
  appVersion: z.string().default('1.0.0'),
  operations: z.array(syncOperationSchema),
});

export const syncPullSchema = z.object({
  deviceId: z.string().min(1),
  lastSyncedAt: z.string(),
  entities: z.array(z.string()).optional(),
});

// ----------------------------------------------------
// Business Settings Schema
// ----------------------------------------------------
export const updateBusinessSettingsSchema = z.object({
  businessName: z.string().min(2),
  tagline: z.string().optional(),
  phone: z.string().min(10),
  whatsapp: z.string().min(10),
  email: z.string().email(),
  addressLine1: z.string(),
  addressLine2: z.string().optional(),
  city: z.string(),
  district: z.string(),
  state: z.string(),
  pincode: z.string(),
  stateCode: z.string().default('33'),
  gstin: z.string(),
  pan: z.string(),
  invoicePrefix: z.string().default('TS'),
  financialYear: z.string().default('26-27'),
  thermalHeader: z.array(z.string()).default([]),
  thermalFooter: z.array(z.string()).default([]),
  taxConfig: z.object({
    defaultGstRate: z.number().default(18),
    enableUtgst: z.boolean().default(false),
    pricesIncludeTax: z.boolean().default(false),
  }),
});
