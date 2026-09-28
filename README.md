# TRENDING STUDIO — MERN + Android Business Management & GST Billing System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v24.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
[![Expo](https://img.shields.io/badge/Expo-SDK_52-black.svg)](https://expo.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Cloud_Firestore-orange.svg)](https://firebase.google.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v3.4-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

Production-grade, offline-first Enterprise Resource Planning (ERP), Point of Sale (POS), and GST Billing ecosystem designed specifically for:
**TRENDING STUDIO**  
*Photo Printing • Photo Frames • Customized Gifts • Studio Services*  
12, Sekkalai Road, Karaikudi - 630001, Sivaganga District, Tamil Nadu  
**Phone:** `+91-79040-64446` | **GSTIN:** `33ABCDE1234F1Z5` | **State Code:** `33 (Tamil Nadu)`

---

## 1. System Architecture Overview (Google Firebase Cloud Firestore)

```
                                  +------------------------------------+
                                  |         TRENDING STUDIO            |
                                  |    Google Firebase Firestore       |
                                  +------------------------------------+
                                                    ^
                                                    | (Firebase Admin SDK / gRPC)
                                                    v
                                  +------------------------------------+
                                  |      Express REST & Socket API     |
                                  |     (Port 5000, JWT + RBAC)        |
                                  +------------------------------------+
                                            ^               ^
                    (HTTPS / REST / WSS)    |               |    (HTTPS / REST / WSS)
                 +--------------------------+               +--------------------------+
                 |                                                                     |
                 v                                                                     v
+----------------------------------+                               +----------------------------------+
|      Web Admin & POS Console     |                               |    Android Native Mobile App     |
|   React 18 + Vite + Tailwind     |                               |    Expo SDK 52 + React Native    |
|   Browser Storage (PWA/SPA)      |                               |    SQLite Local DB (Offline)     |
+----------------------------------+                               +----------------------------------+
                 |                                                                 |
                 v                                                                 v
+----------------------------------+                               +----------------------------------+
|   Thermal 58/80mm & A4 Invoices  |                               |   Bluetooth ESC/POS 58mm / 80mm  |
|   Standard Browser / USB Print   |                               |   Portable Wireless POS Printer  |
+----------------------------------+                               +----------------------------------+
```

### Shared Monorepo Core (`packages/`)
All domain rules, calculation formulas, validation constraints, and synchronization routines are isolated in **pure, zero-dependency TypeScript packages**. The Web frontend, Android application, and Backend API consume the exact same packages, preventing mathematical drift:
* `@trending-studio/shared-types`: Canonical domain models, enums (`Role`, `Permission`, `OrderStatus`, `PaymentMethod`, `SyncStatus`), and API DTOs.
* `@trending-studio/utils`: Currency formatting (INR), nearest rupee GST round-off, official invoice numbering (`TS/26-27/000001`), mobile & GSTIN validators.
* `@trending-studio/validation`: Zod schemas for login, customer, product, order, invoice, settings, and sync operations.
* `@trending-studio/gst-engine`: Intra-state (CGST 9% + SGST 9%) vs Inter-state (IGST 18%), tax-inclusive/exclusive arithmetic, and GSTR-1 HSN summaries.
* `@trending-studio/pricing-engine`: Dynamic photo print pricing (4x6 to 36x60), paper finish multipliers (Matte +10%, Metallic +25%, etc.), lamination surcharges (Velvet, Sparkle, Thermal), and custom frame perimeter calculations ($2 \times (W + H) \times \text{rate}$).
* `@trending-studio/billing-engine`: Authoritative composite cart calculations, line item discounts, round-off, split tenders, and reconciliation validators.
* `@trending-studio/sync-engine`: Idempotency keys, optimistic locking conflict detector, non-overlapping 3-way merge, and conflict resolution policies.

---

## 2. Directory Structure

```
trending-studio/
├── firebase.json             # Firebase project config (Firestore rules & emulators)
├── firestore.rules           # Production Cloud Firestore Security Rules
├── firestore.indexes.json    # Composite Query Indexes for Firestore
├── packages/
│   ├── shared-types/         # Interfaces, Enums, DTOs
│   ├── utils/                # INR, GSTIN, RoundOff, Invoice Numbering
│   ├── validation/           # Zod Schemas
│   ├── gst-engine/           # Intra/Inter state GST, HSN summaries
│   ├── pricing-engine/       # Dynamic print matrix & frame perimeter formulas
│   ├── billing-engine/       # Cart calculation & reconciliation
│   └── sync-engine/          # Idempotency & Conflict Resolution
├── apps/
│   ├── api/                  # Express REST API + Socket.IO + Firebase Admin
│   │   ├── src/
│   │   │   ├── config/       # firebase.ts (Firebase Admin SDK & credentials)
│   │   │   ├── controllers/  # Auth, Invoices, Orders, Products, Customers, Sync
│   │   │   ├── database/     # firestoreModel.ts (Universal Firestore Model Adapter)
│   │   │   ├── middlewares/  # JWT Auth, RBAC permissions, Zod validation, Audit
│   │   │   ├── models/       # Firestore Collections (User, Invoice, Customer, etc.)
│   │   │   ├── services/     # InvoiceService, SyncService, BackupService
│   │   │   └── scripts/      # Database Seeder (seed.ts)
│   │   └── tests/            # Vitest unit and acceptance test suites (27 tests)
│   ├── web/                  # React 18 + Vite Admin & POS Console
│   └── android/              # React Native + Expo SDK 52 Native Mobile App
├── package.json              # Monorepo Workspaces & Root Scripts
└── tsconfig.base.json        # Shared TypeScript Base Configuration
```

---

## 3. Firebase Database Setup & Configuration

Trending Studio connects directly to **Google Cloud Firestore**.

### How to Connect to Your Firebase Project

1. **Create / Select a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/) and create a project (e.g., `trending-studio-kkdi`).
   - Navigate to **Build** > **Firestore Database** and click **Create Database** in Native Mode.
2. **Download Service Account Key**:
   - Go to **Project Settings** > **Service accounts**.
   - Click **Generate new private key** and save the JSON file.
   - Place this file in `apps/api/serviceAccountKey.json` (or set `FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json`).
3. **Alternative: Environment Credentials in `.env`**:
   Instead of a file, you can set the environment variables in `apps/api/.env`:
   ```env
   DATABASE_PROVIDER=firebase
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project-id.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgI...\n-----END PRIVATE KEY-----\n"
   ```
4. **Local Development (No Credentials Required)**:
   - If no service account key is provided yet, Trending Studio automatically activates its high-speed in-memory Firestore adapter mode. You can develop, test, and run the complete system out-of-the-box!

---

## 4. Quickstart & Local Development

### Prerequisites
* **Node.js**: `v20.x` or `v24.x` (LTS recommended)
* **npm**: `v10.x` or `v11.x`

### Step 1: Install Dependencies & Build Shared Packages
```bash
# In the root repository directory
npm install
npm run build:packages
```

### Step 2: Seed Firestore Database with Trending Studio Catalog
```bash
npm run seed
```
This populates:
* Business profile (Trending Studio, Karaikudi - 630001, GSTIN: `33ABCDE1234F1Z5`).
* Main branch: `Trending Studio — Karaikudi Main`.
* Pre-configured users:
  * **Admin:** `admin` / `admin123` (Full system access)
  * **Counter Staff:** `staff` / `staff123` (POS Billing & Receipts)
* Seed photo print rates (4x6 @ ₹10 to 36x60 @ ₹2700).
* Frame mouldings (Teak Wood, Classic Gold, Minimalist Matte Black).
* Retail inventory products (Customized Ceramic Magic Mug, 3D Crystal Keychain).
* Sample customers.

### Step 3: Run Development Services

You can run individual apps or run them in parallel:

```bash
# Terminal 1: Run Backend API with Firebase (Port 5000)
npm run dev:api

# Terminal 2: Run Web Admin & POS (Port 5173)
npm run dev:web

# Terminal 3: Run Android Expo Dev Server
npm run dev:android
```

Open `http://localhost:5173` in your browser to access the Web Admin & POS.

---

## 5. Acceptance & Unit Test Verification

To run all 27 authoritative Vitest test suites (covering GST arithmetic, dynamic pricing, composite billing, reconciliation, conflict merge, and the 30-step master acceptance flow):

```bash
npm run test --workspace=trending-studio-api
```

Output:
```
 ✓ tests/acceptance.test.ts (18 tests)
 ✓ tests/engines.test.ts (9 tests)
 Test Files  2 passed (2)
      Tests  27 passed (27)
```

To type-check all monorepo workspaces:
```bash
# Type-check Android App
npm run type-check --workspace=trending-studio-android

# Type-check Backend API
npm run build --workspace=trending-studio-api

# Build Web Admin Production Bundle
npm run build --workspace=trending-studio-web
```

---

## 6. Deploying Firebase Security Rules

Deploy the included production security rules and composite indexes to your Firebase project:

```bash
# Login to Firebase CLI
npx firebase-tools login

# Select your Firebase project
npx firebase-tools use trending-studio-kkdi

# Deploy Firestore Security Rules & Indexes
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

---

## 7. Android Mobile Build & EAS Release Guidelines

The Android application is built with Expo SDK 52 and Expo Router, pre-configured in `apps/android/eas.json`.

### Build Profiles

1. **Development APK (with Expo Dev Client for debugging):**
   ```bash
   cd apps/android
   npx eas-cli build --profile development --platform android
   ```
2. **Preview / Internal Testing APK (Direct standalone installation on Android phones/tablets):**
   ```bash
   cd apps/android
   npx eas-cli build --profile preview --platform android
   ```
3. **Production AAB (Google Play Store Release):**
   ```bash
   cd apps/android
   npx eas-cli build --profile production --platform android
   ```

---

## 8. Security & Compliance Checklist

* [x] **Database Provider**: Google Cloud Firestore with Firebase Admin SDK and fallback adapter.
* [x] **GST Compliance**: Strict CGST 9% + SGST 9% (Intra-state Tamil Nadu 33) and IGST 18% (Inter-state) mathematical precision with zero rounding drift.
* [x] **Sequential Numbering**: Monotonically incrementing financial year invoice numbers (`TS/26-27/000001`) with atomic branch counters.
* [x] **Authentication**: Short-lived JWT access tokens (15m) + secure HTTP-only refresh tokens (7d) with automatic rotation.
* [x] **Role-Based Access Control (RBAC)**: Strict permission checking across 10 roles.
* [x] **Firestore Security Rules**: Complete `firestore.rules` preventing role escalation, data corruption, and unauthorized reads/writes.
* [x] **Hardware ESC/POS Thermal Printing**: Byte protocol builder supporting standard 58mm and 80mm ESC/POS wireless printers with paper cutting.

---
**Trending Studio — Karaikudi** • Engineered for Reliability, Speed, and Operational Excellence.
