import { initFirebase } from '../config/firebase';
import {
  UserModel,
  BusinessSettingsModel,
  BranchModel,
  PhotoPrintPriceModel,
  FrameTypeModel,
  FramePriceModel,
  ProductModel,
  CustomerModel,
} from '../models';
import { INITIAL_PHOTO_PRINT_PRICES } from '@trending-studio/pricing-engine';
import { Role, Permission, CustomerType } from '@trending-studio/shared-types';

export async function seedDatabase() {
  console.log('[Seed] Connecting to Google Firebase Cloud Firestore...');
  const { isMock } = initFirebase();
  console.log(`[Seed] Connected to Firebase Firestore${isMock ? ' (Offline Memory Mode)' : ''}.`);

  // 1. Seed Business Settings
  await BusinessSettingsModel.deleteMany({});
  const business = await BusinessSettingsModel.create({
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
  });
  console.log('[Seed] Business settings initialized.');

  // 2. Seed Main Branch
  await BranchModel.deleteMany({});
  const mainBranch = await BranchModel.create({
    name: 'Trending Studio — Karaikudi Main',
    code: 'KKDI-01',
    phone: '+91-79040-64446',
    address: 'No:1, Meyyappan Ambalam Complex, Karaikudi - 630001',
    isMainBranch: true,
    isActive: true,
    invoiceSequenceCounter: 100,
  });
  console.log('[Seed] Main branch created.');

  // 3. Seed Users
  await UserModel.deleteMany({});
  await UserModel.create([
    {
      name: 'Trending Studio Admin',
      email: 'admin@trendingstudio.com',
      phone: '7904064446',
      password: 'adminpassword123',
      role: Role.SUPER_ADMIN,
      branchId: mainBranch._id,
      isActive: true,
      permissions: Object.values(Permission),
    },
    {
      name: 'Counter Billing Staff',
      email: 'billing@trendingstudio.com',
      phone: '9876543210',
      password: 'billingpassword123',
      role: Role.BILLING_STAFF,
      branchId: mainBranch._id,
      isActive: true,
      permissions: [
        Permission.VIEW,
        Permission.CREATE,
        Permission.PRINT,
      ],
    },
    {
      name: 'Studio Designer',
      email: 'designer@trendingstudio.com',
      phone: '9876543211',
      password: 'designerpassword123',
      role: Role.DESIGNER,
      branchId: mainBranch._id,
      isActive: true,
      permissions: [Permission.VIEW, Permission.UPDATE],
    },
  ]);
  console.log('[Seed] Default users seeded.');

  // 4. Seed Photo Print Price Matrix
  await PhotoPrintPriceModel.deleteMany({});
  const photoPricesToInsert = INITIAL_PHOTO_PRINT_PRICES.map((p) => ({
    size: p.size.toUpperCase(),
    widthInches: p.width,
    heightInches: p.height,
    basePrice: p.price,
    isActive: true,
    category: p.width >= 20 || p.height >= 24 ? 'LARGE_FORMAT' : p.width >= 12 ? 'POSTER' : 'STANDARD',
  }));
  await PhotoPrintPriceModel.insertMany(photoPricesToInsert);
  console.log(`[Seed] ${photoPricesToInsert.length} Photo print size prices seeded.`);

  // 5. Seed Frame Types
  await FrameTypeModel.deleteMany({});
  const frameTypes = await FrameTypeModel.insertMany([
    {
      code: 'TEAK_SYNTHETIC',
      name: 'Teak Wood Synthetic Moulding (1.25 inch)',
      mouldingWidthInches: 1.25,
      ratePerInch: 7.0,
      isActive: true,
    },
    {
      code: 'CLASSIC_GOLD',
      name: 'Royal Classic Gold Ornate (1.5 inch)',
      mouldingWidthInches: 1.5,
      ratePerInch: 9.5,
      isActive: true,
    },
    {
      code: 'MATTE_BLACK',
      name: 'Sleek Minimalist Matte Black (1 inch)',
      mouldingWidthInches: 1.0,
      ratePerInch: 6.0,
      isActive: true,
    },
    {
      code: 'DEEP_SHADOW_BOX',
      name: '3D Deep Shadow Box for Collages (2 inch)',
      mouldingWidthInches: 2.0,
      ratePerInch: 12.0,
      isActive: true,
    },
  ]);
  console.log('[Seed] Frame types seeded.');

  // 6. Seed Frame Prices
  await FramePriceModel.deleteMany({});
  await FramePriceModel.insertMany([
    {
      size: '12X18',
      widthInches: 12,
      heightInches: 18,
      frameTypeId: frameTypes[0]._id,
      frameTypeName: frameTypes[0].name,
      basePrice: 650,
      glassPrice: 150,
      mountBoardPrice: 100,
      isActive: true,
    },
    {
      size: '16X24',
      widthInches: 16,
      heightInches: 24,
      frameTypeId: frameTypes[0]._id,
      frameTypeName: frameTypes[0].name,
      basePrice: 950,
      glassPrice: 220,
      mountBoardPrice: 150,
      isActive: true,
    },
    {
      size: '20X30',
      widthInches: 20,
      heightInches: 30,
      frameTypeId: frameTypes[1]._id,
      frameTypeName: frameTypes[1].name,
      basePrice: 1650,
      glassPrice: 350,
      mountBoardPrice: 250,
      isActive: true,
    },
  ]);
  console.log('[Seed] Frame pre-configured prices seeded.');

  // 7. Seed Catalog Products
  await ProductModel.deleteMany({});
  await ProductModel.insertMany([
    {
      sku: 'GIFT-MUG-001',
      name: 'Customized Ceramic Photo Mug',
      category: 'Customized Gifts',
      barcode: '890123456701',
      hsnSac: '6911',
      purchasePrice: 110,
      sellingPrice: 250,
      gstRate: 18,
      stock: 45,
      minStock: 10,
      unit: 'PCS',
      isActive: true,
      description: 'High gloss sublimation ceramic mug with custom photo print',
    },
    {
      sku: 'GIFT-CUSH-002',
      name: 'Customized Magic Sequins Pillow',
      category: 'Customized Gifts',
      barcode: '890123456702',
      hsnSac: '6304',
      purchasePrice: 220,
      sellingPrice: 450,
      gstRate: 12,
      stock: 25,
      minStock: 5,
      unit: 'PCS',
      isActive: true,
      description: 'Reversible heart/square magic sequins cushion with photo',
    },
    {
      sku: 'ACRYLIC-CUT-003',
      name: 'LED Acrylic Night Lamp Photo Cutout',
      category: 'Customized Gifts',
      barcode: '890123456703',
      hsnSac: '9405',
      purchasePrice: 380,
      sellingPrice: 750,
      gstRate: 18,
      stock: 18,
      minStock: 5,
      unit: 'PCS',
      isActive: true,
      description: 'Warm LED wooden base with precision engraved acrylic cutout',
    },
    {
      sku: 'ALBUM-PREM-004',
      name: 'Trending Studio Karizma Photo Album 12x18 (30 Sheets)',
      category: 'Photo Albums',
      barcode: '890123456704',
      hsnSac: '4911',
      purchasePrice: 1400,
      sellingPrice: 2600,
      gstRate: 18,
      stock: 12,
      minStock: 3,
      unit: 'PCS',
      isActive: true,
      description: 'Non-tearable velvet finish wedding & event album',
    },
  ]);
  console.log('[Seed] Catalog products seeded.');

  // 8. Seed Customer
  await CustomerModel.deleteMany({});
  await CustomerModel.create([
    {
      name: 'Kuralarasan',
      mobile: '7904064446',
      whatsapp: '7904064446',
      city: 'Karaikudi',
      state: 'Tamil Nadu',
      pincode: '630001',
      customerType: CustomerType.INDIVIDUAL,
      outstandingBalance: 0,
      loyaltyPoints: 50,
    },
    {
      name: 'Priya Ramanathan',
      mobile: '9443312345',
      city: 'Karaikudi',
      state: 'Tamil Nadu',
      customerType: CustomerType.INDIVIDUAL,
      outstandingBalance: 0,
      loyaltyPoints: 10,
    },
  ]);
  console.log('[Seed] Sample customers seeded.');

  console.log('[Seed] Database initialization completed successfully!');
}

// Only execute directly when run as CLI script
const isDirectRun = 
  typeof process !== 'undefined' && 
  process.argv[1] && 
  (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'));

if (isDirectRun) {
  seedDatabase()
    .then(() => {
      console.log('[Seed] Finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Error during seeding:', err);
      process.exit(1);
    });
}

