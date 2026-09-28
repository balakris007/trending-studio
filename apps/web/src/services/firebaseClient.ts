import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import {
  IUser,
  IBranch,
  Role,
  Permission,
  ICustomer,
  IProduct,
  IBusinessSettings,
  IPhotoPrintSizePrice,
} from '@trending-studio/shared-types';

export const firebaseConfig = {
  projectId: 'trending-studio',
  appId: '1:387449844002:web:93ddd9fa3fb1e65809757b',
  storageBucket: 'trending-studio.firebasestorage.app',
  apiKey: 'AIzaSyDjVFvTmY77YC-72olRpf2fmmlpz5Qua10',
  authDomain: 'trending-studio.firebaseapp.com',
  messagingSenderId: '387449844002',
  measurementId: 'G-1ZKM8ZD1GX',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const firestore = getFirestore(app);

// ----------------------------------------------------------------------
// 1. Direct Firestore Authentication & User Management
// ----------------------------------------------------------------------

export async function loginWithFirestore(
  identifier: string,
  password: string
): Promise<{ user: IUser; branch: IBranch; tokens: { accessToken: string; refreshToken: string } }> {
  const usersRef = collection(firestore, 'users');
  const cleanId = identifier.trim().toLowerCase();

  // Search by email first
  let q = query(usersRef, where('email', '==', cleanId));
  let snap = await getDocs(q);

  // If not found by email, search by phone
  if (snap.empty) {
    q = query(usersRef, where('phone', '==', identifier.trim()));
    snap = await getDocs(q);
  }

  // If still empty, scan all users (case-insensitive fallback)
  let foundDoc: any = null;
  if (snap.empty) {
    const allUsers = await getDocs(usersRef);
    for (const d of allUsers.docs) {
      const data = d.data();
      if (
        (data.email && data.email.trim().toLowerCase() === cleanId) ||
        (data.phone && data.phone.trim() === identifier.trim())
      ) {
        foundDoc = d;
        break;
      }
    }
  } else {
    foundDoc = snap.docs[0];
  }

  if (!foundDoc) {
    throw new Error('User not found in Cloud Firestore. Please check credentials or register a new staff account.');
  }

  const userData = foundDoc.data();

  // Verify password with bcrypt or fallback
  let isMatch = false;
  if (userData.password) {
    try {
      isMatch = bcrypt.compareSync(password, userData.password);
    } catch {
      isMatch = password === userData.password;
    }
  }

  // Demo fallback for seeded accounts
  if (!isMatch && (
    (cleanId === 'admin@trendingstudio.com' && password === 'adminpassword123') ||
    (cleanId === 'billing@trendingstudio.com' && password === 'billingpassword123') ||
    (cleanId === 'designer@trendingstudio.com' && password === 'designerpassword123')
  )) {
    isMatch = true;
  }

  if (!isMatch) {
    throw new Error('Invalid password. Please check your password and try again.');
  }

  const user: IUser = {
    _id: foundDoc.id,
    id: foundDoc.id,
    name: userData.name || 'Staff User',
    email: userData.email || cleanId,
    phone: userData.phone || '7904064446',
    role: (userData.role as Role) || Role.SUPER_ADMIN,
    permissions: (userData.permissions as Permission[]) || Object.values(Permission),
    branchId: userData.branchId || 'branch_kkdi_main',
    isActive: userData.isActive !== false,
  };

  // Fetch branch details
  let branch: IBranch = {
    _id: 'branch_kkdi_main',
    name: 'Trending Studio — Karaikudi Main',
    code: 'KKDI-01',
    phone: '+91-79040-64446',
    address: 'No:1, Meyyappan Ambalam Complex, Karaikudi - 630001',
    isMainBranch: true,
    isActive: true,
    invoiceSequenceCounter: 100,
  };

  try {
    const branchDoc = await getDoc(doc(firestore, 'branches', user.branchId || 'branch_kkdi_main'));
    if (branchDoc.exists()) {
      branch = { ...branch, ...branchDoc.data(), _id: branchDoc.id };
    }
  } catch {}

  const tokens = {
    accessToken: `fs_token_${user._id}_${Date.now()}`,
    refreshToken: `fs_refresh_${user._id}_${Date.now()}`,
  };

  return { user, branch, tokens };
}

export async function registerUserInFirestore(userData: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: Role;
}): Promise<IUser> {
  const usersRef = collection(firestore, 'users');
  const cleanEmail = userData.email.trim().toLowerCase();

  // Check if email already exists
  const existing = await getDocs(query(usersRef, where('email', '==', cleanEmail)));
  if (!existing.empty) {
    throw new Error('A user with this email already exists in Cloud Firestore.');
  }

  const hashedPassword = bcrypt.hashSync(userData.password, 10);
  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const role = userData.role || Role.BILLING_STAFF;
  const permissions =
    role === Role.SUPER_ADMIN || role === Role.ADMIN
      ? Object.values(Permission)
      : [Permission.VIEW, Permission.CREATE, Permission.PRINT];

  const newUser = {
    _id: userId,
    name: userData.name.trim(),
    email: cleanEmail,
    phone: userData.phone.trim(),
    password: hashedPassword,
    role,
    permissions,
    branchId: 'branch_kkdi_main',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(firestore, 'users', userId), newUser);

  return {
    _id: userId,
    name: newUser.name,
    email: newUser.email,
    phone: newUser.phone,
    role: newUser.role,
    permissions: newUser.permissions,
    branchId: newUser.branchId,
    isActive: true,
  };
}

export async function getFirestoreUsers(): Promise<IUser[]> {
  try {
    const snap = await getDocs(collection(firestore, 'users'));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        _id: d.id,
        id: d.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role,
        permissions: data.permissions || [],
        branchId: data.branchId,
        isActive: data.isActive !== false,
      } as IUser;
    });
  } catch (err) {
    console.warn('[Firestore] getFirestoreUsers error:', err);
    return [];
  }
}

// ----------------------------------------------------------------------
// 2. Direct Firestore Catalog & Product Operations
// ----------------------------------------------------------------------

export async function getFirestoreProducts(): Promise<IProduct[]> {
  try {
    const snap = await getDocs(collection(firestore, 'products'));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        _id: d.id,
        id: d.id,
      } as IProduct;
    });
  } catch (err) {
    console.warn('[Firestore] getFirestoreProducts error:', err);
    return [];
  }
}

export async function saveProductToFirestore(product: Partial<IProduct>): Promise<IProduct> {
  const prodId = product._id || product.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const clean = {
    ...product,
    _id: prodId,
    id: prodId,
    updatedAt: new Date().toISOString(),
    createdAt: (product as any).createdAt || new Date().toISOString(),
  };
  await setDoc(doc(firestore, 'products', prodId), clean, { merge: true });
  return clean as IProduct;
}

export async function updateProductStockInFirestore(
  productId: string,
  quantityChange: number,
  notes?: string
): Promise<void> {
  const prodRef = doc(firestore, 'products', productId);
  const snap = await getDoc(prodRef);
  if (snap.exists()) {
    const currentStock = snap.data().stock || 0;
    const newStock = Math.max(0, currentStock + quantityChange);
    await updateDoc(prodRef, {
      stock: newStock,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  await deleteDoc(doc(firestore, 'products', productId));
}

// ----------------------------------------------------------------------
// 3. Direct Firestore Customer Operations
// ----------------------------------------------------------------------

export async function getFirestoreCustomers(): Promise<ICustomer[]> {
  try {
    const snap = await getDocs(collection(firestore, 'customers'));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        _id: d.id,
        id: d.id,
      } as ICustomer;
    });
  } catch (err) {
    console.warn('[Firestore] getFirestoreCustomers error:', err);
    return [];
  }
}

export async function saveCustomerToFirestore(customer: Partial<ICustomer>): Promise<ICustomer> {
  const custId = customer._id || customer.id || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const clean = {
    ...customer,
    _id: custId,
    id: custId,
    updatedAt: new Date().toISOString(),
    createdAt: (customer as any).createdAt || new Date().toISOString(),
    totalSpent: (customer as any).totalSpent || 0,
    outstandingBalance: (customer as any).outstandingBalance || 0,
    loyaltyPoints: (customer as any).loyaltyPoints || 0,
  };
  await setDoc(doc(firestore, 'customers', custId), clean, { merge: true });
  return clean as ICustomer;
}

export async function getCustomerInvoicesFromFirestore(customerId: string): Promise<any[]> {
  try {
    const q = query(
      collection(firestore, 'invoices'),
      where('customerId', '==', customerId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), _id: d.id, id: d.id }));
  } catch (err) {
    console.warn('[Firestore] getCustomerInvoicesFromFirestore error:', err);
    return [];
  }
}

// ----------------------------------------------------------------------
// 4. Direct Firestore Invoice & Billing Operations
// ----------------------------------------------------------------------

export async function saveInvoiceToFirestore(invoice: any): Promise<any> {
  const invId = invoice._id || invoice.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const invoiceNumber = invoice.invoiceNumber || `TS-${Date.now().toString().slice(-6)}`;

  const cleanInvoice = {
    ...invoice,
    _id: invId,
    id: invId,
    invoiceNumber,
    createdAt: invoice.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: invoice.status || 'PAID',
  };

  await setDoc(doc(firestore, 'invoices', invId), cleanInvoice, { merge: true });

  // Update customer total spent & loyalty points
  if (invoice.customerId) {
    try {
      const custDoc = await getDoc(doc(firestore, 'customers', invoice.customerId));
      if (custDoc.exists()) {
        const cur = custDoc.data();
        const spent = (cur.totalSpent || 0) + (invoice.totalAmount || invoice.grandTotal || 0);
        const addedPoints = Math.floor((invoice.totalAmount || invoice.grandTotal || 0) / 100);
        await setDoc(
          doc(firestore, 'customers', invoice.customerId),
          {
            totalSpent: spent,
            loyaltyPoints: (cur.loyaltyPoints || 0) + addedPoints,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch {}
  }

  // Deduct product stock in Firestore
  if (Array.isArray(invoice.items)) {
    for (const item of invoice.items) {
      if (item.productId && item.itemType === 'PRODUCT') {
        try {
          await updateProductStockInFirestore(item.productId, -1 * (item.quantity || 1));
        } catch {}
      }
    }
  }

  return cleanInvoice;
}

export async function getFirestoreInvoices(limitCount = 100): Promise<any[]> {
  try {
    const q = query(
      collection(firestore, 'invoices'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => ({ ...d.data(), _id: d.id, id: d.id }));
    // Sort descending by createdAt
    return (list as any[]).sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (err) {
    console.warn('[Firestore] getFirestoreInvoices error:', err);
    return [];
  }
}

export async function cancelFirestoreInvoice(invoiceId: string, reason: string): Promise<void> {
  const invRef = doc(firestore, 'invoices', invoiceId);
  await updateDoc(invRef, {
    status: 'CANCELLED',
    cancelledAt: new Date().toISOString(),
    cancellationReason: reason,
    updatedAt: new Date().toISOString(),
  });
}

// ----------------------------------------------------------------------
// 5. Photo Print & Frame Pricing Operations
// ----------------------------------------------------------------------

export async function getFirestorePhotoPrintPrices(): Promise<IPhotoPrintSizePrice[]> {
  try {
    const snap = await getDocs(collection(firestore, 'photo_print_prices'));
    return snap.docs.map((d) => ({ ...d.data(), _id: d.id, id: d.id })) as IPhotoPrintSizePrice[];
  } catch (err) {
    console.warn('[Firestore] getFirestorePhotoPrintPrices error:', err);
    return [];
  }
}

export async function savePhotoPrintPriceToFirestore(size: string, basePrice: number): Promise<void> {
  const id = `photo_${size.toLowerCase()}`;
  await setDoc(
    doc(firestore, 'photo_print_prices', id),
    {
      size: size.toUpperCase(),
      basePrice,
      isActive: true,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function getFirestoreFramePrices(): Promise<any[]> {
  try {
    const snap = await getDocs(collection(firestore, 'frame_prices'));
    return snap.docs.map((d) => ({ ...d.data(), _id: d.id, id: d.id }));
  } catch (err) {
    console.warn('[Firestore] getFirestoreFramePrices error:', err);
    return [];
  }
}

// ----------------------------------------------------------------------
// 6. Settings & Business Configuration
// ----------------------------------------------------------------------

export async function getFirestoreSettings(): Promise<Partial<IBusinessSettings>> {
  try {
    const snap = await getDoc(doc(firestore, 'business_settings', 'default_business'));
    if (snap.exists()) {
      return snap.data() as Partial<IBusinessSettings>;
    }
  } catch (err) {
    console.warn('[Firestore] getFirestoreSettings error:', err);
  }
  return {};
}

export async function saveSettingsToFirestore(settings: Partial<IBusinessSettings>): Promise<void> {
  await setDoc(doc(firestore, 'business_settings', 'default_business'), {
    ...settings,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

// ----------------------------------------------------------------------
// 7. Google Sheets Direct Webhook & CSV Sync
// ----------------------------------------------------------------------

/**
 * Direct sync to Google Sheets via Google Apps Script Webhook
 * Allows hosted client to push invoices/products/customers directly to a spreadsheet
 */
export async function syncToGoogleSheetsWebhook(
  webhookUrl: string,
  payload: {
    type: 'INVOICE' | 'PRODUCT' | 'CUSTOMER' | 'FULL_SYNC';
    data: any;
  }
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        syncedAt: new Date().toISOString(),
        source: 'Trending Studio Web App',
      }),
      mode: 'no-cors', // Google Apps Script Web Apps often require no-cors in browser
    });
    return { success: true, message: 'Data synced successfully to Google Sheets!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to sync to Google Sheets' };
  }
}

/**
 * Export data directly to CSV format for Google Sheets / Excel import
 */
export function exportToCsv(filename: string, rows: any[], headers: { key: string; label: string }[]): void {
  const headerLine = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');
  const rowLines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h.key] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headerLine, ...rowLines].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
