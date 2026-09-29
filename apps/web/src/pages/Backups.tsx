import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  FileText,
  Package,
  Users,
  HardDrive,
  FileJson,
  ExternalLink,
} from 'lucide-react';
import { dataService } from '../services/dataService';
import * as fsClient from '../services/firebaseClient';

export const Backups: React.FC = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<any | null>(null);
  const [restorePreview, setRestorePreview] = useState<any | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [sheetId, setSheetId] = useState<string>('1GehYsbz3KoLK3XyxpdYt-uFbfgCNUineKIhWdkZJmaQ');

  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadBackups = async () => {
    setLoading(true);
    try {
      const list = await dataService.getBackups();
      setBackups(list || []);
      const settings: any = await dataService.getSettings();
      if (settings?.googleSheetsConfig?.spreadsheetId) {
        setSheetId(settings.googleSheetsConfig.spreadsheetId);
      }
    } catch (err: any) {
      console.warn('Backup history load notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  // 1. Create Full JSON Backup Snapshot & Download
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const snapshot = await dataService.createFullBackup();
      const filename = snapshot.metadata.filename;
      const jsonStr = JSON.stringify(snapshot, null, 2);

      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      showNotice(
        `✅ Backup snapshot created! Downloaded ${filename} (${snapshot.metadata.totalRecords} total records across Firestore).`
      );
      await loadBackups();
    } catch (err: any) {
      showNotice(err.message || 'Failed to create backup snapshot.', 'error');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // 2. Select & Parse JSON File for Restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.data) {
          throw new Error('Invalid Trending Studio backup file: missing "data" node.');
        }
        setRestoreFile(parsed);
        setRestorePreview({
          filename: file.name,
          createdAt: parsed.metadata?.createdAt || new Date().toISOString(),
          version: parsed.metadata?.version || 'Unknown',
          invoices: parsed.data.invoices?.length || 0,
          customers: parsed.data.customers?.length || 0,
          products: parsed.data.products?.length || 0,
          frameTypes: parsed.data.frameTypes?.length || 0,
          photoPrintPrices: parsed.data.photoPrintPrices?.length || 0,
          devices: parsed.data.devices?.length || 0,
        });
      } catch (err: any) {
        showNotice(`File read error: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  };

  // 3. Confirm and Execute Restore
  const handleExecuteRestore = async () => {
    if (!restoreFile) return;
    if (
      !window.confirm(
        '⚠️ Are you sure you want to restore this backup? Existing records in Cloud Firestore will be merged and updated.'
      )
    ) {
      return;
    }

    setIsRestoring(true);
    try {
      const res = await dataService.restoreBackup(restoreFile);
      const counts = res.restoredCounts;
      showNotice(
        `✅ Restore completed successfully! Restored: ${counts.products} products, ${counts.customers} customers, ${counts.invoices} invoices, ${counts.frameTypes} frame types, ${counts.devices} devices.`
      );
      setRestoreFile(null);
      setRestorePreview(null);
      await loadBackups();
    } catch (err: any) {
      showNotice(`Restore failed: ${err.message}`, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // 4. Quick CSV Exports
  const handleExportCsv = async (type: 'invoices' | 'customers' | 'products' | 'users') => {
    try {
      if (type === 'invoices') {
        const invs = await fsClient.getFirestoreInvoices(1000);
        fsClient.exportToCsv(
          `trending-studio-invoices-${Date.now()}.csv`,
          invs,
          [
            { key: 'invoiceNumber', label: 'Invoice No' },
            { key: 'customerName', label: 'Customer Name' },
            { key: 'customerMobile', label: 'Customer Mobile' },
            { key: 'grandTotal', label: 'Amount (INR)' },
            { key: 'paymentMethod', label: 'Payment Method' },
            { key: 'status', label: 'Status' },
            { key: 'createdAt', label: 'Invoice Date' },
          ]
        );
      } else if (type === 'customers') {
        const custs = await fsClient.getFirestoreCustomers();
        fsClient.exportToCsv(
          `trending-studio-customers-${Date.now()}.csv`,
          custs,
          [
            { key: 'name', label: 'Customer Name' },
            { key: 'mobile', label: 'Mobile' },
            { key: 'city', label: 'City' },
            { key: 'totalSpent', label: 'Total Spent (INR)' },
            { key: 'outstandingBalance', label: 'Outstanding Balance (INR)' },
            { key: 'createdAt', label: 'Registered Date' },
          ]
        );
      } else if (type === 'products') {
        const prods = await fsClient.getFirestoreProducts();
        fsClient.exportToCsv(
          `trending-studio-products-${Date.now()}.csv`,
          prods,
          [
            { key: 'sku', label: 'SKU' },
            { key: 'name', label: 'Product Name' },
            { key: 'category', label: 'Category' },
            { key: 'sellingPrice', label: 'Selling Price (INR)' },
            { key: 'purchasePrice', label: 'Purchase Price (INR)' },
            { key: 'stockQuantity', label: 'Stock Quantity' },
          ]
        );
      } else if (type === 'users') {
        const users = await fsClient.getFirestoreUsers();
        fsClient.exportToCsv(
          `trending-studio-staff-${Date.now()}.csv`,
          users,
          [
            { key: '_id', label: 'User ID' },
            { key: 'name', label: 'Staff Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'role', label: 'Role' },
            { key: 'address', label: 'Address' },
            { key: 'idProofType', label: 'ID Proof Type' },
            { key: 'idProofNumber', label: 'ID Proof Number' },
            { key: 'createdAt', label: 'Registered Date' },
          ]
        );
      }
      showNotice(`Exported ${type} to CSV successfully!`);
    } catch (err: any) {
      showNotice(`Failed to export ${type}: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-semibold">
            <Database className="w-3.5 h-3.5" />
            <span>Disaster Recovery & Data Resilience</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Backups & Recovery</h1>
          <p className="text-xs text-slate-400 max-w-xl">
            Export full JSON disaster snapshots, restore past store states, generate spreadsheets, and verify automated mirroring to your Google Sheet.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={loadBackups}
            disabled={loading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${isCreatingBackup ? 'animate-bounce' : ''}`} />
            <span>{isCreatingBackup ? 'Creating Snapshot...' : 'Create Full Backup Snapshot'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Primary Actions: Create & Restore Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: 1-Click JSON Snapshot Download */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl">
                <FileJson className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Full JSON Database Snapshot</h3>
                <p className="text-xs text-slate-400">Export complete business state to a single file</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Downloads an immutable, encrypted JSON archive containing all invoices, customer ledgers, inventory stock, staff accounts, frame types, and pricing models directly from Google Cloud Firestore.
            </p>

            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Collections included:</span>
                <span className="text-white font-bold">10 Collections</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Format:</span>
                <span className="text-blue-400 font-bold">Standard UTF-8 JSON</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Sensitive data:</span>
                <span className="text-emerald-400 font-bold">Passwords stripped for safety</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateBackup}
            disabled={isCreatingBackup}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>{isCreatingBackup ? 'Extracting Firestore Snapshot...' : 'Download JSON Snapshot Now'}</span>
          </button>
        </div>

        {/* Card 2: Restore from JSON Snapshot */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Restore from Backup Snapshot</h3>
                <p className="text-xs text-slate-400">Recover data from a previously saved JSON snapshot</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Upload a previously downloaded `.json` snapshot file to restore records. Useful when recovering deleted records or transitioning devices.
            </p>

            {!restorePreview ? (
              <label className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group">
                <FileJson className="w-8 h-8 text-slate-500 group-hover:text-blue-400 mb-2 transition-colors" />
                <span className="text-xs font-bold text-slate-300">Click to Select Backup JSON File</span>
                <span className="text-[11px] text-slate-500 mt-1">trending-studio-backup-*.json</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="bg-slate-950/80 rounded-2xl p-4 border border-emerald-500/30 space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="font-bold text-white truncate max-w-[200px]">
                    {restorePreview.filename}
                  </span>
                  <button
                    onClick={() => {
                      setRestoreFile(null);
                      setRestorePreview(null);
                    }}
                    className="text-slate-400 hover:text-rose-400 font-bold"
                  >
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="text-slate-400">Invoices: <span className="text-white font-bold">{restorePreview.invoices}</span></div>
                  <div className="text-slate-400">Customers: <span className="text-white font-bold">{restorePreview.customers}</span></div>
                  <div className="text-slate-400">Products: <span className="text-white font-bold">{restorePreview.products}</span></div>
                  <div className="text-slate-400">Frame Types: <span className="text-white font-bold">{restorePreview.frameTypes}</span></div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleExecuteRestore}
            disabled={!restoreFile || isRestoring}
            className={`w-full py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              restoreFile && !isRestoring
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{isRestoring ? 'Restoring Firestore Records...' : 'Execute Data Restoration'}</span>
          </button>
        </div>
      </div>

      {/* Emergency CSV Exports & Google Sheet Link */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CSV Exports */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Emergency CSV / Excel Spreadsheet Exports</h3>
          </div>
          <p className="text-xs text-slate-400">
            Export raw tabular spreadsheets for accounting audits, GST returns, or offline Excel inspection.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <button
              onClick={() => handleExportCsv('invoices')}
              className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center transition-all group"
            >
              <FileText className="w-5 h-5 text-blue-400 group-hover:scale-110 mb-1 transition-transform" />
              <span className="text-xs font-bold text-white">Invoices CSV</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Billing & Tax</span>
            </button>

            <button
              onClick={() => handleExportCsv('customers')}
              className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center transition-all group"
            >
              <Users className="w-5 h-5 text-emerald-400 group-hover:scale-110 mb-1 transition-transform" />
              <span className="text-xs font-bold text-white">Customers CSV</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Directory & Balances</span>
            </button>

            <button
              onClick={() => handleExportCsv('products')}
              className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center transition-all group"
            >
              <Package className="w-5 h-5 text-amber-400 group-hover:scale-110 mb-1 transition-transform" />
              <span className="text-xs font-bold text-white">Products CSV</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Inventory & Stock</span>
            </button>

            <button
              onClick={() => handleExportCsv('users')}
              className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center transition-all group"
            >
              <ShieldCheck className="w-5 h-5 text-purple-400 group-hover:scale-110 mb-1 transition-transform" />
              <span className="text-xs font-bold text-white">Staff Roster CSV</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Employees & ID</span>
            </button>
          </div>
        </div>

        {/* Google Sheet Live Connection */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Google Sheet Live Mirror</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Target Sheet ID:</span>
                <span className="text-white font-mono font-bold text-[11px] truncate max-w-[150px]">
                  {sheetId}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Real-time Mirroring:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Invoices, Customers, and Products are continuously updated in your connected Google Sheet.
            </p>
          </div>

          <a
            href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-700"
          >
            <span>Open Connected Google Sheet</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Snapshot History Table */}
      {backups.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-bold text-white">Cloud Firestore Backup History</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">{backups.length} snapshots recorded</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {backups.slice(0, 8).map((b) => (
              <div key={b.id || b._id} className="py-3 flex items-center justify-between text-xs font-mono">
                <div className="space-y-0.5">
                  <div className="text-white font-bold">{b.filename || b.id}</div>
                  <div className="text-[11px] text-slate-500">
                    {b.createdAt ? new Date(b.createdAt).toLocaleString() : 'Just now'} • Version {b.version || '2.2.0'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-bold">
                    {b.totalRecords ? `${b.totalRecords} Records` : 'Complete'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default Backups;
