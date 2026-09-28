import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
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
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Recursively strips undefined values so Cloud Firestore setDoc/updateDoc never fails.
 * Firestore strictly forbids 'undefined' values in document payloads.
 */
export function sanitizeForFirestore<T>(val: T): T {
  if (val === undefined) {
    return null as any;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (val instanceof Date) {
    return val.toISOString() as any;
  }
  if (Array.isArray(val)) {
    return val
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    if (v !== undefined) {
      clean[k] = sanitizeForFirestore(v);
    }
  }
  return clean as any;
}

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

// ----------------------------------------------------------------------
// Mobile Number OTP Authentication
// ----------------------------------------------------------------------

export async function sendMobileOtp(phone: string): Promise<{ success: boolean; otp: string; phone: string; userName?: string }> {
  const cleanPhone = phone.trim().replace(/[^0-9]/g, '').slice(-10);
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  // Look for registered user in Firestore
  const usersRef = collection(firestore, 'users');
  const allUsers = await getDocs(usersRef);
  let foundUser: any = null;

  for (const d of allUsers.docs) {
    const data = d.data();
    const userPhone = (data.phone || '').replace(/[^0-9]/g, '').slice(-10);
    if (userPhone === cleanPhone) {
      foundUser = { ...data, _id: d.id };
      break;
    }
  }

  // Generate 6-digit random OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins validity

  // Save OTP in Firestore
  await setDoc(doc(firestore, 'otps', cleanPhone), {
    phone: cleanPhone,
    otp,
    expiresAt,
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    otp,
    phone: cleanPhone,
    userName: foundUser?.name || 'Staff User',
  };
}

export async function verifyMobileOtpAndLogin(
  phone: string,
  otp: string
): Promise<{ user: IUser; branch: IBranch; tokens: { accessToken: string; refreshToken: string } }> {
  const cleanPhone = phone.trim().replace(/[^0-9]/g, '').slice(-10);
  const cleanOtp = otp.trim();

  // Demo master fallback is 123456
  let isValid = cleanOtp === '123456';

  if (!isValid) {
    const otpDoc = await getDoc(doc(firestore, 'otps', cleanPhone));
    if (otpDoc.exists()) {
      const data = otpDoc.data();
      if (data.otp === cleanOtp && data.expiresAt > Date.now()) {
        isValid = true;
      }
    }
  }

  if (!isValid) {
    throw new Error('Invalid or expired OTP. Please check the 6-digit code or request a new OTP.');
  }

  // Find user by phone
  const usersRef = collection(firestore, 'users');
  const allUsers = await getDocs(usersRef);
  let foundDoc: any = null;

  for (const d of allUsers.docs) {
    const data = d.data();
    const userPhone = (data.phone || '').replace(/[^0-9]/g, '').slice(-10);
    if (userPhone === cleanPhone) {
      foundDoc = d;
      break;
    }
  }

  let user: IUser;
  if (foundDoc) {
    const userData = foundDoc.data();
    user = {
      _id: foundDoc.id,
      id: foundDoc.id,
      name: userData.name || 'Mobile Staff',
      email: userData.email || `${cleanPhone}@trendingstudio.com`,
      phone: cleanPhone,
      role: (userData.role as Role) || Role.BILLING_STAFF,
      permissions: (userData.permissions as Permission[]) || [Permission.VIEW, Permission.CREATE, Permission.PRINT],
      branchId: userData.branchId || 'branch_kkdi_main',
      isActive: userData.isActive !== false,
    };
  } else {
    // If Owner phone (7904064446), create as Super Admin
    const isOwner = cleanPhone === '7904064446';
    const newId = `usr_mobile_${cleanPhone}`;
    user = {
      _id: newId,
      id: newId,
      name: isOwner ? 'Trending Studio Owner' : `Staff (${cleanPhone})`,
      email: `${cleanPhone}@trendingstudio.com`,
      phone: cleanPhone,
      role: isOwner ? Role.SUPER_ADMIN : Role.BILLING_STAFF,
      permissions: Object.values(Permission),
      branchId: 'branch_kkdi_main',
      isActive: true,
    };
    await setDoc(doc(firestore, 'users', newId), {
      ...user,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const branch: IBranch = {
    _id: 'branch_kkdi_main',
    name: 'Trending Studio — Karaikudi Main',
    code: 'KKDI-01',
    phone: '+91-79040-64446',
    address: 'No:1, Meyyappan Ambalam Complex, Karaikudi - 630001',
    isMainBranch: true,
    isActive: true,
    invoiceSequenceCounter: 100,
  };

  const tokens = {
    accessToken: `fs_token_${user._id}_${Date.now()}`,
    refreshToken: `fs_refresh_${user._id}_${Date.now()}`,
  };

  // Clean up used OTP
  try {
    await deleteDoc(doc(firestore, 'otps', cleanPhone));
  } catch {}

  return { user, branch, tokens };
}

// ----------------------------------------------------------------------
// Gmail / Google Account Admin Authentication
// ----------------------------------------------------------------------

export async function loginWithGoogleAdmin(): Promise<{ user: IUser; branch: IBranch; tokens: { accessToken: string; refreshToken: string } }> {
  googleProvider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, googleProvider);
  const gUser = result.user;
  const email = (gUser.email || '').toLowerCase().trim();

  // Find user by email in Firestore
  const usersRef = collection(firestore, 'users');
  const allUsers = await getDocs(usersRef);
  let foundDoc: any = null;

  for (const d of allUsers.docs) {
    const data = d.data();
    if (data.email && data.email.toLowerCase().trim() === email) {
      foundDoc = d;
      break;
    }
  }

  let user: IUser;
  if (foundDoc) {
    const userData = foundDoc.data();
    user = {
      _id: foundDoc.id,
      id: foundDoc.id,
      name: userData.name || gUser.displayName || 'Google Admin',
      email: userData.email || email,
      phone: userData.phone || gUser.phoneNumber || '7904064446',
      role: (userData.role as Role) || Role.SUPER_ADMIN,
      permissions: Object.values(Permission),
      branchId: userData.branchId || 'branch_kkdi_main',
      isActive: userData.isActive !== false,
    };
  } else {
    // Auto-provision Google Admin in Firestore
    const userId = `usr_google_${gUser.uid}`;
    user = {
      _id: userId,
      id: userId,
      name: gUser.displayName || 'Trending Studio Admin',
      email,
      phone: gUser.phoneNumber || '7904064446',
      role: Role.SUPER_ADMIN,
      permissions: Object.values(Permission),
      branchId: 'branch_kkdi_main',
      isActive: true,
    };
    await setDoc(doc(firestore, 'users', userId), {
      ...user,
      photoURL: gUser.photoURL,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const branch: IBranch = {
    _id: 'branch_kkdi_main',
    name: 'Trending Studio — Karaikudi Main',
    code: 'KKDI-01',
    phone: '+91-79040-64446',
    address: 'No:1, Meyyappan Ambalam Complex, Karaikudi - 630001',
    isMainBranch: true,
    isActive: true,
    invoiceSequenceCounter: 100,
  };

  const tokens = {
    accessToken: `fs_token_${user._id}_${Date.now()}`,
    refreshToken: `fs_refresh_${user._id}_${Date.now()}`,
  };

  return { user, branch, tokens };
}

// ----------------------------------------------------------------------
// Password Reset via Mobile/Email OTP
// ----------------------------------------------------------------------

export async function requestPasswordResetOtp(identifier: string): Promise<{ success: boolean; otp: string; phone: string; userName: string }> {
  const clean = identifier.trim().toLowerCase();
  const cleanPhone = clean.replace(/[^0-9]/g, '').slice(-10);

  const usersRef = collection(firestore, 'users');
  const allUsers = await getDocs(usersRef);
  let foundDoc: any = null;

  for (const d of allUsers.docs) {
    const data = d.data();
    const uPhone = (data.phone || '').replace(/[^0-9]/g, '').slice(-10);
    const uEmail = (data.email || '').toLowerCase().trim();
    if ((cleanPhone.length === 10 && uPhone === cleanPhone) || uEmail === clean) {
      foundDoc = d;
      break;
    }
  }

  if (!foundDoc) {
    throw new Error('No registered staff user found with that email or phone number.');
  }

  const userData = foundDoc.data();
  const targetPhone = (userData.phone || cleanPhone || '7904064446').replace(/[^0-9]/g, '').slice(-10);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await setDoc(doc(firestore, 'otps', `reset_${targetPhone}`), {
    phone: targetPhone,
    otp,
    userId: foundDoc.id,
    expiresAt: Date.now() + 10 * 60 * 1000,
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    otp,
    phone: targetPhone,
    userName: userData.name || 'Staff User',
  };
}

export async function resetUserPassword(
  identifier: string,
  otp: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const clean = identifier.trim().toLowerCase();
  const cleanPhone = clean.replace(/[^0-9]/g, '').slice(-10);

  // Validate OTP (allow master 123456 or Firestore stored OTP)
  let isValid = otp.trim() === '123456';
  let userId: string | null = null;

  const otpDoc = await getDoc(doc(firestore, 'otps', `reset_${cleanPhone}`));
  if (otpDoc.exists()) {
    const data = otpDoc.data();
    if (data.otp === otp.trim() && data.expiresAt > Date.now()) {
      isValid = true;
      userId = data.userId;
    }
  }

  // Also check if doc was stored under raw phone
  if (!isValid) {
    const rawOtpDoc = await getDoc(doc(firestore, 'otps', cleanPhone));
    if (rawOtpDoc.exists()) {
      const data = rawOtpDoc.data();
      if (data.otp === otp.trim() && data.expiresAt > Date.now()) {
        isValid = true;
      }
    }
  }

  if (!isValid) {
    throw new Error('Invalid or expired verification OTP. Please check the code or request a new one.');
  }

  // Find user if not yet extracted
  if (!userId) {
    const usersRef = collection(firestore, 'users');
    const allUsers = await getDocs(usersRef);
    for (const d of allUsers.docs) {
      const data = d.data();
      const uPhone = (data.phone || '').replace(/[^0-9]/g, '').slice(-10);
      const uEmail = (data.email || '').toLowerCase().trim();
      if ((cleanPhone.length === 10 && uPhone === cleanPhone) || uEmail === clean) {
        userId = d.id;
        break;
      }
    }
  }

  if (!userId) {
    throw new Error('User record could not be matched for password update.');
  }

  // Hash new password using bcrypt
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  await updateDoc(doc(firestore, 'users', userId), {
    password: hashedPassword,
    updatedAt: new Date().toISOString(),
  });

  // Clean up reset OTP
  try {
    await deleteDoc(doc(firestore, 'otps', `reset_${cleanPhone}`));
    await deleteDoc(doc(firestore, 'otps', cleanPhone));
  } catch {}

  return {
    success: true,
    message: 'Your password has been successfully reset! You can now log in with your new password.',
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
  const sanitized = sanitizeForFirestore(clean);
  await setDoc(doc(firestore, 'products', prodId), sanitized, { merge: true });
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
  const sanitized = sanitizeForFirestore(clean);
  await setDoc(doc(firestore, 'customers', custId), sanitized, { merge: true });
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
    isOffline: false,
    syncStatus: 'SYNCED',
  };

  const sanitized = sanitizeForFirestore(cleanInvoice);
  await setDoc(doc(firestore, 'invoices', invId), sanitized, { merge: true });

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
          sanitizeForFirestore({
            totalSpent: spent,
            loyaltyPoints: (cur.loyaltyPoints || 0) + addedPoints,
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
      }
    } catch (custErr) {
      console.warn('[Firestore] Customer metrics update skipped:', custErr);
    }
  }

  // Deduct product stock in Firestore
  if (Array.isArray(invoice.items)) {
    for (const item of invoice.items) {
      if (item.productId && (item.itemType === 'PRODUCT' || !item.itemType)) {
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
  const sanitized = sanitizeForFirestore({
    ...settings,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(doc(firestore, 'business_settings', 'default_business'), sanitized, { merge: true });
}

// ----------------------------------------------------------------------
// 7. Google Sheets Direct Webhook & CSV Sync
// ----------------------------------------------------------------------

/**
 * Direct sync to Google Sheets via Google Apps Script Webhook
 * Sends text/plain to avoid CORS preflight options check on Google Apps Script
 */
export async function syncToGoogleSheetsWebhook(
  webhookUrl: string,
  payload: {
    type: 'INVOICE' | 'PRODUCT' | 'CUSTOMER' | 'FULL_SYNC';
    data: any;
  }
): Promise<{ success: boolean; message?: string }> {
  try {
    const cleanUrl = webhookUrl.trim();
    if (!cleanUrl) {
      throw new Error('Google Sheets Webhook URL is empty');
    }
    await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        ...payload,
        syncedAt: new Date().toISOString(),
        source: 'Trending Studio POS Terminal',
      }),
      mode: 'no-cors',
    });
    return { success: true, message: 'Data pushed to Google Sheets successfully!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to sync to Google Sheets' };
  }
}

/**
 * Export data directly to CSV format for Google Sheets / Excel import using Blob & UTF-8 BOM
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

  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copy-pasteable Google Apps Script for live Google Sheets synchronization
 */
export const GOOGLE_APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var type = payload.type;
    var data = payload.data;
    
    if (type === 'INVOICE') {
      var invSheet = ss.getSheetByName('Invoices') || ss.insertSheet('Invoices');
      if (invSheet.getLastRow() === 0) {
        invSheet.appendRow(['Invoice No', 'Date', 'Customer', 'Mobile', 'Amount (INR)', 'Payment', 'Status']);
      }
      invSheet.appendRow([
        data.invoiceNumber || data._id,
        data.createdAt || new Date().toISOString(),
        data.customerName || '',
        data.customerMobile || '',
        data.grandTotal || data.totalAmount || 0,
        data.paymentMethod || 'CASH',
        data.status || 'PAID'
      ]);
    } else if (type === 'FULL_SYNC') {
      if (data.invoices && data.invoices.length > 0) {
        var invSheet = ss.getSheetByName('Invoices') || ss.insertSheet('Invoices');
        invSheet.clear();
        invSheet.appendRow(['Invoice No', 'Date', 'Customer', 'Mobile', 'Amount (INR)', 'Payment', 'Status']);
        for (var i = 0; i < data.invoices.length; i++) {
          var inv = data.invoices[i];
          invSheet.appendRow([
            inv.invoiceNumber || inv._id,
            inv.createdAt || '',
            inv.customerName || '',
            inv.customerMobile || '',
            inv.grandTotal || inv.totalAmount || 0,
            inv.paymentMethod || 'CASH',
            inv.status || 'PAID'
          ]);
        }
      }
      if (data.products && data.products.length > 0) {
        var prodSheet = ss.getSheetByName('Products') || ss.insertSheet('Products');
        prodSheet.clear();
        prodSheet.appendRow(['SKU', 'Product Name', 'Category', 'Selling Price', 'Stock']);
        for (var j = 0; j < data.products.length; j++) {
          var p = data.products[j];
          prodSheet.appendRow([p.sku || '', p.name || '', p.category || '', p.sellingPrice || 0, p.stock || p.stockQuantity || 0]);
        }
      }
      if (data.customers && data.customers.length > 0) {
        var custSheet = ss.getSheetByName('Customers') || ss.insertSheet('Customers');
        custSheet.clear();
        custSheet.appendRow(['Name', 'Mobile', 'City', 'Total Spent (INR)']);
        for (var k = 0; k < data.customers.length; k++) {
          var c = data.customers[k];
          custSheet.appendRow([c.name || '', c.mobile || '', c.city || '', c.totalSpent || 0]);
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

// ----------------------------------------------------------------------
// 8. Orders Management in Cloud Firestore
// ----------------------------------------------------------------------

export async function getFirestoreOrders(): Promise<any[]> {
  try {
    const ordersRef = collection(firestore, 'orders');
    const snap = await getDocs(ordersRef);
    if (snap.empty) {
      // Derive orders from recent invoices if no explicit orders created yet
      const invoices = await getFirestoreInvoices(20);
      return invoices.map((inv: any, idx: number) => ({
        _id: `ord_${inv._id || inv.id || idx}`,
        id: `ord_${inv._id || inv.id || idx}`,
        orderNumber: `ORD-${(inv.invoiceNumber || 'INV-1001').replace('INV-', '')}`,
        invoiceId: inv._id || inv.id,
        customerName: inv.customerName || 'Walk-in Customer',
        customerPhone: inv.customerMobile || '7904064446',
        items: inv.items || [],
        totalAmount: inv.totalAmount || inv.grandTotal || 0,
        advancePaid: inv.totalAmount || inv.grandTotal || 0,
        balanceAmount: 0,
        status: idx % 2 === 0 ? 'READY' : 'PRINTING',
        promisedDeliveryDate: new Date(Date.now() + 86400000).toISOString(),
        createdAt: inv.createdAt || new Date().toISOString(),
        notes: 'In-store studio order',
      }));
    }
    return snap.docs.map((d) => ({ ...d.data(), _id: d.id, id: d.id }));
  } catch (err) {
    console.warn('[Firebase] Failed to fetch orders from Firestore:', err);
    return [];
  }
}

export async function saveOrderToFirestore(order: any): Promise<any> {
  const orderId = order._id || order.id || `ord_${Date.now()}`;
  const data = {
    ...order,
    _id: orderId,
    id: orderId,
    updatedAt: new Date().toISOString(),
    createdAt: order.createdAt || new Date().toISOString(),
  };
  await setDoc(doc(firestore, 'orders', orderId), data, { merge: true });
  return data;
}

export async function updateOrderStatusInFirestore(orderId: string, status: string): Promise<void> {
  const orderRef = doc(firestore, 'orders', orderId);
  await setDoc(orderRef, { status, updatedAt: new Date().toISOString() }, { merge: true });
}

// ----------------------------------------------------------------------
// 9. Devices & Terminal Management in Cloud Firestore
// ----------------------------------------------------------------------

export async function getFirestoreDevices(): Promise<any[]> {
  try {
    const devRef = collection(firestore, 'devices');
    const snap = await getDocs(devRef);
    if (snap.empty) {
      const currentDevId = localStorage.getItem('ts_device_id') || 'web_terminal_01';
      const defaultDev = {
        _id: currentDevId,
        id: currentDevId,
        deviceId: currentDevId,
        deviceName: 'Trending Studio Counter 1 (Web POS)',
        platform: 'WEB',
        appVersion: '1.0.0',
        isRevoked: false,
        lastActiveAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(firestore, 'devices', currentDevId), defaultDev);
      return [defaultDev];
    }
    return snap.docs.map((d) => ({ ...d.data(), _id: d.id, id: d.id }));
  } catch (err) {
    console.warn('[Firebase] Failed to fetch devices from Firestore:', err);
    return [];
  }
}

export async function registerDeviceInFirestore(device: any): Promise<any> {
  const id = device.deviceId || device._id || `dev_${Date.now()}`;
  const data = {
    ...device,
    _id: id,
    id,
    isRevoked: false,
    lastActiveAt: new Date().toISOString(),
    createdAt: device.createdAt || new Date().toISOString(),
  };
  await setDoc(doc(firestore, 'devices', id), data, { merge: true });
  return data;
}

export async function updateDeviceStatusInFirestore(deviceId: string, isRevoked: boolean): Promise<void> {
  const devRef = doc(firestore, 'devices', deviceId);
  await setDoc(devRef, { isRevoked, updatedAt: new Date().toISOString() }, { merge: true });
}

