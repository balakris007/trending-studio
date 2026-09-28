import fs from 'fs';
import path from 'path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';
import { INITIAL_PHOTO_PRINT_PRICES } from '@trending-studio/pricing-engine';
import { Role, Permission, CustomerType } from '@trending-studio/shared-types';

async function seedLiveFirebase() {
  console.log('===============================================================');
  console.log('  TRENDING STUDIO — GOOGLE CLOUD FIRESTORE SYNCHRONIZATION');
  console.log('===============================================================');

  const keyPath = path.resolve(__dirname, '../apps/api/serviceAccountKey.json');
  if (!fs.existsSync(keyPath)) {
    console.error(`[Error] Service account key not found at: ${keyPath}`);
    return;
  }

  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  console.log(`[Firebase] Project: ${serviceAccount.project_id}`);
  console.log(`[Firebase] Service Account: ${serviceAccount.client_email}`);

  let app;
  if (!getApps().length) {
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  } else {
    app = getApps()[0];
  }

  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });

  console.log('[Firebase] Verifying connection to Google Cloud Firestore...');
  try {
    // Probe database
    await db.collection('system').doc('ping').set({
      ping: 'pong',
      updatedAt: new Date().toISOString(),
      system: 'Trending Studio POS',
    });
    console.log('[Firebase] Live Google Cloud Firestore connected successfully!');
  } catch (err: any) {
    if (err.code === 5 || err.message?.includes('NOT_FOUND')) {
      console.log('\n---------------------------------------------------------------');
      console.log('  ACTION REQUIRED IN FIREBASE CONSOLE:');
      console.log('  Your Firebase project exists, but Cloud Firestore database has not');
      console.log('  been activated yet.');
      console.log('');
      console.log(`  1. Open this URL in your browser:`);
      console.log(`     https://console.firebase.google.com/project/${serviceAccount.project_id}/firestore`);
      console.log('  2. Click "Create database"');
      console.log('  3. Choose location: "asia-south1 (Mumbai)"');
      console.log('  4. Select "Start in test mode" and click "Enable"');
      console.log('');
      console.log('  After clicking Enable in Firebase Console, re-run this command:');
      console.log('  npm run sync:firebase');
      console.log('---------------------------------------------------------------\n');
      return;
    } else {
      console.error('[Firebase] Connection error:', err.message);
      return;
    }
  }

  // 1. Business Settings
  console.log('[Sync] Uploading Business Settings to Firestore...');
  await db.collection('business_settings').doc('default_business').set({
    businessName: 'Trending Studio',
    tagline: 'Gifts & Frames',
    phone: '+91-79040-64446',
    whatsapp: '+91-79040-64446',
    email: 'trendingstudiokkdi@gmail.com',
    addressLine1: 'No:1, Meyyappan Ambalam Complex',
    addressLine2: 'Gnanandha Mahal (Opp), Near Periyar Statue',
    city: 'Karaikudi',
    district: 'Sivaganga',
    state: 'Tamil Nadu',
    pincode: '630001',
    stateCode: '33',
    gstin: '33ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    invoicePrefix: 'TS',
    financialYear: '26-27',
    thermalHeader: [
      '        TRENDING STUDIO',
      '        GIFTS & FRAMES',
      ' Karaikudi - 630001 | 79040-64446',
      ' GSTIN: 33ABCDE1234F1Z5',
    ],
    thermalFooter: [
      '    Thank You! Visit Again!',
      ' Photo Printing * Frames * Gifts',
    ],
    bankDetails: {
      accountName: 'Trending Studio',
      accountNumber: '987654321012',
      bankName: 'State Bank of India',
      ifscCode: 'SBIN0000854',
      branchName: 'Karaikudi Main',
      upiId: '7904064446@upi',
      upiQrPayload: 'upi://pay?pa=7904064446@upi&pn=Trending%20Studio',
    },
    taxConfig: {
      defaultGstRate: 18,
      enableUtgst: false,
      pricesIncludeTax: false,
    },
    updatedAt: new Date().toISOString(),
  });

  // 2. Main Branch
  console.log('[Sync] Uploading Main Branch to Firestore...');
  const mainBranchId = 'branch_kkdi_main';
  await db.collection('branches').doc(mainBranchId).set({
    name: 'Trending Studio — Karaikudi Main',
    code: 'KKDI-01',
    phone: '+91-79040-64446',
    address: 'No:1, Meyyappan Ambalam Complex, Karaikudi - 630001',
    isMainBranch: true,
    isActive: true,
    invoiceSequenceCounter: 100,
    updatedAt: new Date().toISOString(),
  });

  // 3. Users with secure bcrypt password
  console.log('[Sync] Uploading Users to Firestore...');
  const adminPass = await bcrypt.hash('adminpassword123', 10);
  const staffPass = await bcrypt.hash('billingpassword123', 10);
  const designerPass = await bcrypt.hash('designerpassword123', 10);

  await db.collection('users').doc('user_admin').set({
    name: 'Trending Studio Admin',
    email: 'admin@trendingstudio.com',
    phone: '7904064446',
    password: adminPass,
    role: Role.SUPER_ADMIN,
    branchId: mainBranchId,
    isActive: true,
    refreshTokens: [],
    permissions: Object.values(Permission),
    updatedAt: new Date().toISOString(),
  });

  await db.collection('users').doc('user_staff').set({
    name: 'Counter Billing Staff',
    email: 'billing@trendingstudio.com',
    phone: '9876543210',
    password: staffPass,
    role: Role.BILLING_STAFF,
    branchId: mainBranchId,
    isActive: true,
    refreshTokens: [],
    permissions: [Permission.VIEW, Permission.CREATE, Permission.PRINT],
    updatedAt: new Date().toISOString(),
  });

  await db.collection('users').doc('user_designer').set({
    name: 'Studio Designer',
    email: 'designer@trendingstudio.com',
    phone: '9876543211',
    password: designerPass,
    role: Role.DESIGNER,
    branchId: mainBranchId,
    isActive: true,
    refreshTokens: [],
    permissions: [Permission.VIEW, Permission.UPDATE],
    updatedAt: new Date().toISOString(),
  });

  // 4. Photo Print Price Matrix
  console.log('[Sync] Uploading Photo Print Prices to Firestore...');
  for (const p of INITIAL_PHOTO_PRINT_PRICES) {
    const id = `photo_${p.size.toLowerCase()}`;
    await db.collection('photo_print_prices').doc(id).set({
      size: p.size.toUpperCase(),
      widthInches: p.width,
      heightInches: p.height,
      basePrice: p.price,
      isActive: true,
      category: p.width >= 20 || p.height >= 24 ? 'LARGE_FORMAT' : p.width >= 12 ? 'POSTER' : 'STANDARD',
      updatedAt: new Date().toISOString(),
    });
  }

  // 5. Frame Types
  console.log('[Sync] Uploading Frame Types to Firestore...');
  const frameTypes = [
    { id: 'frame_teak', code: 'TEAK_SYNTHETIC', name: 'Teak Wood Synthetic Moulding (1.25 inch)', mouldingWidthInches: 1.25, ratePerInch: 7.0, isActive: true },
    { id: 'frame_gold', code: 'CLASSIC_GOLD', name: 'Royal Classic Gold Ornate (1.5 inch)', mouldingWidthInches: 1.5, ratePerInch: 9.5, isActive: true },
    { id: 'frame_black', code: 'MATTE_BLACK', name: 'Sleek Minimalist Matte Black (1 inch)', mouldingWidthInches: 1.0, ratePerInch: 6.0, isActive: true },
    { id: 'frame_box', code: 'DEEP_SHADOW_BOX', name: '3D Deep Shadow Box for Collages (2 inch)', mouldingWidthInches: 2.0, ratePerInch: 12.0, isActive: true },
  ];
  for (const ft of frameTypes) {
    await db.collection('frame_types').doc(ft.id).set({ ...ft, updatedAt: new Date().toISOString() });
  }

  // 6. Frame Prices
  console.log('[Sync] Uploading Frame Size Prices to Firestore...');
  const framePrices = [
    { id: 'fp_12x18', size: '12X18', widthInches: 12, heightInches: 18, frameTypeId: 'frame_teak', frameTypeName: frameTypes[0].name, basePrice: 650, glassPrice: 150, mountBoardPrice: 100, isActive: true },
    { id: 'fp_16x24', size: '16X24', widthInches: 16, heightInches: 24, frameTypeId: 'frame_teak', frameTypeName: frameTypes[0].name, basePrice: 950, glassPrice: 220, mountBoardPrice: 150, isActive: true },
    { id: 'fp_20x30', size: '20X30', widthInches: 20, heightInches: 30, frameTypeId: 'frame_gold', frameTypeName: frameTypes[1].name, basePrice: 1650, glassPrice: 350, mountBoardPrice: 250, isActive: true },
  ];
  for (const fp of framePrices) {
    await db.collection('frame_prices').doc(fp.id).set({ ...fp, updatedAt: new Date().toISOString() });
  }

  // 7. Products
  console.log('[Sync] Uploading Catalog Products to Firestore...');
  const products = [
    { id: 'prod_mug_001', sku: 'GIFT-MUG-001', name: 'Customized Ceramic Photo Mug', category: 'Customized Gifts', barcode: '890123456701', hsnSac: '6911', purchasePrice: 110, sellingPrice: 250, gstRate: 18, stock: 45, minStock: 10, unit: 'PCS', isActive: true, description: 'High gloss sublimation ceramic mug with custom photo print' },
    { id: 'prod_cush_002', sku: 'GIFT-CUSH-002', name: 'Customized Magic Sequins Pillow', category: 'Customized Gifts', barcode: '890123456702', hsnSac: '6304', purchasePrice: 220, sellingPrice: 450, gstRate: 12, stock: 25, minStock: 5, unit: 'PCS', isActive: true, description: 'Reversible heart/square magic sequins cushion with photo' },
    { id: 'prod_lamp_003', sku: 'ACRYLIC-CUT-003', name: 'LED Acrylic Night Lamp Photo Cutout', category: 'Customized Gifts', barcode: '890123456703', hsnSac: '9405', purchasePrice: 380, sellingPrice: 750, gstRate: 18, stock: 18, minStock: 5, unit: 'PCS', isActive: true, description: 'Warm LED wooden base with precision engraved acrylic cutout' },
    { id: 'prod_album_004', sku: 'ALBUM-PREM-004', name: 'Trending Studio Karizma Photo Album 12x18 (30 Sheets)', category: 'Photo Albums', barcode: '890123456704', hsnSac: '4911', purchasePrice: 1400, sellingPrice: 2600, gstRate: 18, stock: 12, minStock: 3, unit: 'PCS', isActive: true, description: 'Non-tearable velvet finish wedding & event album' },
  ];
  for (const pr of products) {
    await db.collection('products').doc(pr.id).set({ ...pr, updatedAt: new Date().toISOString() });
  }

  // 8. Customers
  console.log('[Sync] Uploading Customers to Firestore...');
  const customers = [
    { id: 'cust_kural', name: 'Kuralarasan', mobile: '7904064446', whatsapp: '7904064446', city: 'Karaikudi', state: 'Tamil Nadu', pincode: '630001', customerType: CustomerType.INDIVIDUAL, outstandingBalance: 0, loyaltyPoints: 50 },
    { id: 'cust_priya', name: 'Priya Ramanathan', mobile: '9443312345', city: 'Karaikudi', state: 'Tamil Nadu', customerType: CustomerType.INDIVIDUAL, outstandingBalance: 0, loyaltyPoints: 10 },
  ];
  for (const c of customers) {
    await db.collection('customers').doc(c.id).set({ ...c, updatedAt: new Date().toISOString() });
  }

  console.log('\n===============================================================');
  console.log('  SUCCESS: All collections are now live in Google Cloud Firestore!');
  console.log('  You can inspect them anytime in Firebase Console:');
  console.log(`  https://console.firebase.google.com/project/${serviceAccount.project_id}/firestore`);
  console.log('===============================================================');
}

seedLiveFirebase().catch(console.error);
