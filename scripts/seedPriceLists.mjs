import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'trending-studio',
  appId: '1:387449844002:web:93ddd9fa3fb1e65809757b',
  storageBucket: 'trending-studio.firebasestorage.app',
  apiKey: 'AIzaSyDjVFvTmY77YC-72olRpf2fmmlpz5Qua10',
  authDomain: 'trending-studio.firebaseapp.com',
  messagingSenderId: '387449844002',
  measurementId: 'G-1ZKM8ZD1GX',
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// --- 1. PHOTO PRINT PRICE LIST (From Image 1) ---
const PHOTO_PRINTS = [
  { size: '4x6', width: 4, height: 6, price: 10, category: 'STANDARD' },
  { size: '6x8', width: 6, height: 8, price: 25, category: 'STANDARD' },
  { size: '10x8', width: 10, height: 8, price: 45, category: 'STANDARD' },
  { size: '12x8', width: 12, height: 8, price: 50, category: 'STANDARD' },
  { size: '12x10', width: 12, height: 10, price: 60, category: 'STANDARD' },
  { size: '10x15', width: 10, height: 15, price: 75, category: 'STANDARD' },
  { size: '12x15', width: 12, height: 15, price: 90, category: 'STANDARD' },
  { size: '12x18', width: 12, height: 18, price: 110, category: 'STANDARD' },
  { size: '12x20', width: 12, height: 20, price: 120, category: 'POSTER' },
  { size: '12x24', width: 12, height: 24, price: 150, category: 'POSTER' },
  { size: '16x20', width: 16, height: 20, price: 400, category: 'POSTER' },
  { size: '16x24', width: 16, height: 24, price: 480, category: 'POSTER' },
  { size: '20x24', width: 20, height: 24, price: 600, category: 'POSTER' },
  { size: '20x30', width: 20, height: 30, price: 750, category: 'LARGE_FORMAT' },
  { size: '24x30', width: 24, height: 30, price: 900, category: 'LARGE_FORMAT' },
  { size: '24x36', width: 24, height: 36, price: 1080, category: 'LARGE_FORMAT' },
  { size: '36x40', width: 36, height: 40, price: 1800, category: 'LARGE_FORMAT' },
  { size: '36x60', width: 36, height: 60, price: 2700, category: 'LARGE_FORMAT' },
];

// --- 2. PRINT WITH FRAME PRICE MATRIX (From Image 2) ---
// Columns: Half Inch (0.5"), 1 Inch (1.0"), 1 1/2 Half Inch (1.5"), 2 Inch (2.0")
const PRINT_WITH_FRAME_MATRIX = [
  { size: '4x6', width: 4, height: 6, halfInch: 60, oneInch: null, oneAndHalfInch: null, twoInch: null },
  { size: '6x8', width: 6, height: 8, halfInch: 120, oneInch: null, oneAndHalfInch: null, twoInch: null },
  { size: '10x8', width: 10, height: 8, halfInch: null, oneInch: 260, oneAndHalfInch: null, twoInch: null },
  { size: '12x8', width: 12, height: 8, halfInch: null, oneInch: 310, oneAndHalfInch: null, twoInch: null },
  { size: '12x10', width: 12, height: 10, halfInch: null, oneInch: 390, oneAndHalfInch: null, twoInch: null },
  { size: '10x15', width: 10, height: 15, halfInch: null, oneInch: 490, oneAndHalfInch: null, twoInch: null },
  { size: '12x15', width: 12, height: 15, halfInch: null, oneInch: 590, oneAndHalfInch: 675, twoInch: null },
  { size: '12x18', width: 12, height: 18, halfInch: null, oneInch: 700, oneAndHalfInch: 810, twoInch: null },
  { size: '12x20', width: 12, height: 20, halfInch: null, oneInch: 780, oneAndHalfInch: 900, twoInch: null },
  { size: '12x24', width: 12, height: 24, halfInch: null, oneInch: 940, oneAndHalfInch: 1080, twoInch: null },
  { size: '16x20', width: 16, height: 20, halfInch: null, oneInch: 1050, oneAndHalfInch: 1200, twoInch: 1280 },
  { size: '16x24', width: 16, height: 24, halfInch: null, oneInch: 1250, oneAndHalfInch: 1440, twoInch: 1540 },
  { size: '20x24', width: 20, height: 24, halfInch: null, oneInch: 1560, oneAndHalfInch: 1800, twoInch: 1920 },
  { size: '20x30', width: 20, height: 30, halfInch: null, oneInch: 1950, oneAndHalfInch: 2250, twoInch: 2400 },
  { size: '24x30', width: 24, height: 30, halfInch: null, oneInch: 2340, oneAndHalfInch: 2700, twoInch: 2880 },
  { size: '24x36', width: 24, height: 36, halfInch: null, oneInch: 2810, oneAndHalfInch: 3240, twoInch: 3460 },
  { size: '36x30', width: 36, height: 30, halfInch: null, oneInch: 3510, oneAndHalfInch: 4050, twoInch: 4320 },
  { size: '36x40', width: 36, height: 40, halfInch: null, oneInch: 4680, oneAndHalfInch: 5400, twoInch: 5760 },
  { size: '36x60', width: 36, height: 60, halfInch: null, oneInch: 7020, oneAndHalfInch: 8100, twoInch: 8640 },
];

async function seed() {
  console.log('🚀 Starting Cloud Firestore sync for Trending Studio Karaikudi...');
  const now = new Date().toISOString();

  // 1. Seed Photo Print Prices
  console.log('📸 Uploading Photo Print prices (18 sizes)...');
  for (const item of PHOTO_PRINTS) {
    const id = `photo_${item.size.toLowerCase()}`;
    const payload = {
      _id: id,
      id,
      size: item.size.toUpperCase(),
      widthInches: item.width,
      heightInches: item.height,
      basePrice: item.price,
      price: item.price,
      category: item.category,
      isActive: true,
      store: 'Trending Studio Karaikudi',
      updatedAt: now,
    };
    await setDoc(doc(firestore, 'photo_print_prices', id), payload, { merge: true });
    console.log(`  ✓ Photo Print: ${item.size} => ₹${item.price}`);
  }

  // 2. Seed Master Matrix Document
  console.log('\n🖼️ Uploading Print with Frame Master Matrix...');
  await setDoc(
    doc(firestore, 'print_with_frame_prices', 'matrix_all'),
    {
      id: 'matrix_all',
      title: 'Trending Studio Print with Frame Price List',
      store: 'Trending Studio Karaikudi',
      phone: '+91-79040-64446',
      address: 'No:1, Meyyappan Ambalam Complex, Gnanandha Mahal (Opp), Near Periyar Statue, Karaikudi - 630001',
      columns: ['Size', 'Half Inch (0.5")', '1 Inch (1.0")', '1/2 Half Inch (1.5")', '2 Inch (2.0")'],
      matrix: PRINT_WITH_FRAME_MATRIX,
      updatedAt: now,
    },
    { merge: true }
  );

  // 3. Seed Individual Frame Price Combinations
  let frameCount = 0;
  for (const row of PRINT_WITH_FRAME_MATRIX) {
    const options = [
      { key: 'half_inch', name: 'Half Inch (0.5")', width: 0.5, price: row.halfInch },
      { key: '1_inch', name: '1 Inch (1.0")', width: 1.0, price: row.oneInch },
      { key: '1_5_inch', name: '1/2 Half Inch (1.5")', width: 1.5, price: row.oneAndHalfInch },
      { key: '2_inch', name: '2 Inch (2.0")', width: 2.0, price: row.twoInch },
    ];

    for (const opt of options) {
      if (opt.price !== null) {
        const docId = `pwf_${row.size.toLowerCase()}_${opt.key}`;
        const payload = {
          _id: docId,
          id: docId,
          size: row.size.toUpperCase(),
          widthInches: row.width,
          heightInches: row.height,
          mouldingKey: opt.key,
          mouldingName: opt.name,
          mouldingWidthInches: opt.width,
          totalPrice: opt.price,
          price: opt.price,
          type: 'PRINT_WITH_FRAME',
          isActive: true,
          store: 'Trending Studio Karaikudi',
          updatedAt: now,
        };
        await setDoc(doc(firestore, 'print_with_frame_prices', docId), payload, { merge: true });
        await setDoc(doc(firestore, 'frame_prices', docId), payload, { merge: true });
        frameCount++;
      }
    }
  }
  console.log(`  ✓ Uploaded ${frameCount} Print with Frame price configurations!`);

  // 4. Also register as Products in Firestore so they can be searched, scanned, and billed
  console.log('\n📦 Registering catalog items in products collection...');
  let prodCount = 0;
  // Photo prints as catalog products
  for (const p of PHOTO_PRINTS) {
    const prodId = `prod_print_${p.size.toLowerCase()}`;
    const productPayload = {
      _id: prodId,
      id: prodId,
      sku: `PRN-${p.size.toUpperCase()}`,
      name: `Photo Print ${p.size.toUpperCase()}`,
      category: 'PHOTO_PRINTS',
      sellingPrice: p.price,
      purchasePrice: Math.round(p.price * 0.4),
      stock: 9999,
      unit: 'PCS',
      hsnSac: '4911',
      gstRate: 18,
      isActive: true,
      description: `Trending Studio authentic lab photo print size ${p.size}`,
      updatedAt: now,
    };
    await setDoc(doc(firestore, 'products', prodId), productPayload, { merge: true });
    prodCount++;
  }

  // Print with frames as catalog products
  for (const row of PRINT_WITH_FRAME_MATRIX) {
    const opts = [
      { key: 'HALF', name: '0.5" Moulding', price: row.halfInch },
      { key: '1IN', name: '1" Moulding', price: row.oneInch },
      { key: '1.5IN', name: '1.5" Moulding', price: row.oneAndHalfInch },
      { key: '2IN', name: '2" Moulding', price: row.twoInch },
    ];
    for (const opt of opts) {
      if (opt.price !== null) {
        const prodId = `prod_pwf_${row.size.toLowerCase()}_${opt.key.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const productPayload = {
          _id: prodId,
          id: prodId,
          sku: `PWF-${row.size.toUpperCase()}-${opt.key}`,
          name: `Print with Frame ${row.size.toUpperCase()} (${opt.name})`,
          category: 'FRAMES',
          sellingPrice: opt.price,
          purchasePrice: Math.round(opt.price * 0.45),
          stock: 9999,
          unit: 'PCS',
          hsnSac: '4414',
          gstRate: 18,
          isActive: true,
          description: `Trending Studio Print with Frame complete set size ${row.size} with ${opt.name}`,
          updatedAt: now,
        };
        await setDoc(doc(firestore, 'products', prodId), productPayload, { merge: true });
        prodCount++;
      }
    }
  }

  console.log(`  ✓ Registered ${prodCount} catalog products in Cloud Firestore!`);
  console.log('\n🎉 ALL PHOTO PRINT & FRAME DATA SUCCESSFULLY UPDATED IN CLOUD FIRESTORE!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Failed to update Firestore:', err);
  process.exit(1);
});
