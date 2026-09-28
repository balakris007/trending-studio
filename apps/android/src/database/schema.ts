/**
 * TRENDING STUDIO — SQLITE OFFLINE DATABASE SCHEMA
 * Mirrors primary business entities on mobile Android devices for zero-latency offline operation.
 */

export const CREATE_TABLES_SQL = `
-- Sync Queue for Outbound Offline Operations
CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    operation_type TEXT NOT NULL,
    entity TEXT NOT NULL,
    local_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    retry_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    error_message TEXT
);

-- Customers Replica
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    server_id TEXT,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    whatsapp TEXT,
    email TEXT,
    address TEXT,
    city TEXT DEFAULT 'Karaikudi',
    gstin TEXT,
    customer_type TEXT DEFAULT 'INDIVIDUAL',
    outstanding_balance REAL DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    sync_status TEXT DEFAULT 'PENDING',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Products Replica
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    server_id TEXT,
    sku TEXT UNIQUE,
    barcode TEXT,
    name TEXT NOT NULL,
    category TEXT,
    hsn_sac TEXT,
    selling_price REAL NOT NULL,
    gst_rate REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    sync_status TEXT DEFAULT 'SYNCED',
    updated_at INTEGER NOT NULL
);

-- Photo Print Seed Pricing Master
CREATE TABLE IF NOT EXISTS photo_print_prices (
    id TEXT PRIMARY KEY,
    size TEXT NOT NULL,
    width REAL NOT NULL,
    height REAL NOT NULL,
    base_price REAL NOT NULL,
    is_active INTEGER DEFAULT 1
);

-- Custom Frame Prices Master
CREATE TABLE IF NOT EXISTS frame_prices (
    id TEXT PRIMARY KEY,
    size TEXT NOT NULL,
    width REAL NOT NULL,
    height REAL NOT NULL,
    frame_type_name TEXT NOT NULL,
    base_price REAL NOT NULL,
    glass_price REAL DEFAULT 0,
    mount_price REAL DEFAULT 0,
    is_active INTEGER DEFAULT 1
);

-- Offline Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    server_id TEXT,
    invoice_number TEXT,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_mobile TEXT NOT NULL,
    place_of_supply TEXT NOT NULL,
    subtotal REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    taxable_amount REAL NOT NULL,
    cgst_amount REAL DEFAULT 0,
    sgst_amount REAL DEFAULT 0,
    igst_amount REAL DEFAULT 0,
    total_tax REAL NOT NULL,
    round_off REAL DEFAULT 0,
    grand_total REAL NOT NULL,
    paid_amount REAL DEFAULT 0,
    balance_due REAL DEFAULT 0,
    payment_status TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    is_offline INTEGER DEFAULT 1,
    version INTEGER DEFAULT 1,
    sync_status TEXT DEFAULT 'PENDING',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Offline Orders
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    server_id TEXT,
    order_number TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_mobile TEXT NOT NULL,
    grand_total REAL NOT NULL,
    advance_paid REAL DEFAULT 0,
    balance_due REAL DEFAULT 0,
    status TEXT NOT NULL,
    priority TEXT DEFAULT 'NORMAL',
    version INTEGER DEFAULT 1,
    sync_status TEXT DEFAULT 'PENDING',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Cached Store Settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);
`;
