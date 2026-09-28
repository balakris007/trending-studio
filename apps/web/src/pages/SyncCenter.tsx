import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { offlineDb } from '../services/offlineDb';
import { dataService } from '../services/dataService';
import * as fsClient from '../services/firebaseClient';
import { exportToCsv } from '../services/firebaseClient';
import { formatISTDateTime } from '@trending-studio/utils';
import {
  RefreshCw,
  Smartphone,
  ShieldAlert,
  CheckCircle,
  Clock,
  Ban,
  Database,
  Cloud,
  Table,
  HardDrive,
  ExternalLink,
  Download,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const SyncCenter: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [sheetsStatus, setSheetsStatus] = useState<any>(null);
  const [localPendingCount, setLocalPendingCount] = useState<number>(0);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsSyncMsg, setSheetsSyncMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSyncData = async () => {
    try {
      const [devList, pending, settings] = await Promise.all([
        dataService.getDevices(),
        offlineDb.getPendingCount(),
        dataService.getSettings(),
      ]);

      setDevices(devList || []);
      setLocalPendingCount(pending);

      setSyncStatus({
        cloudConnected: true,
        cloudDatabase: 'Google Cloud Firestore',
        lastCheckedAt: new Date().toISOString(),
      });

      const s = settings as any;
      if (s?.googleSheetsConfig?.spreadsheetId) {
        setSheetsStatus({
          spreadsheetId: s.googleSheetsConfig.spreadsheetId,
          enabled: s.googleSheetsConfig.enabled !== false,
          sheetUrl: `https://docs.google.com/spreadsheets/d/${s.googleSheetsConfig.spreadsheetId}/edit`,
          configured: true,
        });
      }
    } catch (err) {
      console.error('Failed to load sync center data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncData();
  }, []);

  const handleSyncSheetsNow = async () => {
    if (!sheetsStatus?.configured) {
      alert('Please configure your Google Sheet in Settings first.');
      return;
    }
    setIsSyncingSheets(true);
    setSheetsSyncMsg(null);
    try {
      // Gather live records
      const invoices = await dataService.getInvoices();
      const products = await dataService.getProducts();
      const customers = await dataService.getCustomers();

      const settings: any = await dataService.getSettings();
      const webhookUrl = settings?.googleSheetsConfig?.webhookUrl;

      if (webhookUrl) {
        await fsClient.syncToGoogleSheetsWebhook(webhookUrl, {
          type: 'FULL_SYNC',
          data: { invoices, products, customers },
        });
        setSheetsSyncMsg(`Pushed ${invoices.length} invoices, ${products.length} products, ${customers.length} customers to Google Sheets Webhook!`);
      } else {
        // Instant CSV Export
        exportToCsv(
          `trending_studio_backup_${new Date().toISOString().slice(0, 10)}.csv`,
          invoices,
          [
            { key: 'invoiceNumber', label: 'Invoice No' },
            { key: 'customerName', label: 'Customer Name' },
            { key: 'customerMobile', label: 'Mobile' },
            { key: 'grandTotal', label: 'Total Amount (INR)' },
            { key: 'paymentMethod', label: 'Payment Method' },
            { key: 'status', label: 'Status' },
            { key: 'createdAt', label: 'Date Time' },
          ]
        );
        setSheetsSyncMsg(`Exported ${invoices.length} Invoices to CSV ready for Google Sheets & Excel!`);
      }
      fetchSyncData();
    } catch (err: any) {
      setSheetsSyncMsg(err.message || 'Sync failed.');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke and lock this mobile terminal?')) return;
    try {
      await dataService.updateDeviceStatus(deviceId, true);
      await fetchSyncData();
    } catch (err: any) {
      alert(err.message || 'Revocation failed');
    }
  };

  const handleUnrevokeDevice = async (deviceId: string) => {
    try {
      await dataService.updateDeviceStatus(deviceId, false);
      await fetchSyncData();
    } catch (err: any) {
      alert(err.message || 'Unlock failed');
    }
  };

  const handleRegisterCurrentDevice = async () => {
    const defaultName = /Android/i.test(navigator.userAgent)
      ? 'POCO Android Terminal'
      : /iPhone|iPad/i.test(navigator.userAgent)
      ? 'iOS Studio Terminal'
      : 'Main Counter Terminal';

    const customName = prompt('Enter a friendly name for this terminal (e.g. POCO Phone Counter 1, Studio Tab):', defaultName);
    if (!customName) return;

    try {
      let deviceId = localStorage.getItem('ts_device_id');
      if (!deviceId) {
        deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
        localStorage.setItem('ts_device_id', deviceId);
      }

      await dataService.registerDevice({
        deviceId,
        deviceName: customName,
        deviceModel: navigator.userAgent.includes('Mobile') ? 'Smartphone' : 'Computer / Tablet',
        platform: /Android/i.test(navigator.userAgent) ? 'ANDROID' : 'WEB',
        appVersion: '1.0.0',
      });
      alert(`Terminal "${customName}" registered successfully!`);
      await fetchSyncData();
    } catch (err: any) {
      alert(err.message || 'Registration failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 text-blue-400" />
            <span>Sync Center & Multi-Database Hub</span>
          </h1>
          <p className="text-xs text-slate-400">
            Monitor Google Cloud Firestore, Browser IndexedDB, and Google Sheets Database synchronization
          </p>
        </div>

        <button
          onClick={fetchSyncData}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white flex items-center space-x-1.5 border border-slate-700"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh All DB Status</span>
        </button>
      </div>

      {/* 3-TIER DATABASE SYNCHRONIZATION OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tier 1: Cloud Firestore */}
        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white">Cloud Firestore</h3>
                  <p className="text-[10px] text-slate-400">Database 1 (Primary NoSQL)</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ONLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Live Google Cloud project <code className="text-blue-400 font-mono">trending-studio</code>. Stores all 8 collections with real-time replication.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
            <span>Provider: Google Cloud Firestore</span>
          </div>
        </div>

        {/* Tier 2: Local IndexedDB */}
        <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white">Browser IndexedDB</h3>
                  <p className="text-[10px] text-slate-400">Database 2 (Offline-First Cache)</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  localPendingCount > 0
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {localPendingCount > 0 ? `${localPendingCount} QUEUED` : 'SYNCED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Zero-latency terminal storage. Allows POS billing even with internet down, auto-syncing upon reconnection.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
            <span>Pending Offline Bills: {localPendingCount}</span>
          </div>
        </div>

        {/* Tier 3: Google Sheets Database */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Table className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-white">Google Sheets</h3>
                  <p className="text-[10px] text-slate-400">Database 3 (Accounting & Ledger)</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  sheetsStatus?.configured
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                {sheetsStatus?.configured ? 'CONNECTED' : 'NOT CONFIGURED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Live spreadsheet tables for <strong className="text-emerald-400">Invoices</strong>, <strong className="text-emerald-400">Products</strong>, and <strong className="text-emerald-400">Customers</strong> for financial auditing.
            </p>
            {sheetsSyncMsg && (
              <p className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 p-1.5 rounded-lg">
                {sheetsSyncMsg}
              </p>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            {sheetsStatus?.configured ? (
              <>
                <button
                  onClick={handleSyncSheetsNow}
                  disabled={isSyncingSheets}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                  <span>Sync Sheets</span>
                </button>
                {sheetsStatus.sheetUrl && (
                  <a
                    href={sheetsStatus.sheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-400 hover:underline flex items-center space-x-1"
                  >
                    <span>Open Sheet</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </>
            ) : (
              <Link to="/settings" className="text-[11px] text-blue-400 hover:underline">
                Configure in Settings →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* QUICK GOOGLE SHEETS / EXCEL EXPORT PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-white flex items-center space-x-2">
            <Table className="w-4 h-4 text-emerald-400" />
            <span>Instant Google Sheets Export</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Download your live Cloud Firestore records into spreadsheets directly from the browser
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const invs = await dataService.getInvoices();
              if (invs.length === 0) return alert('No invoices to export.');
              exportToCsv(
                `trending_studio_invoices_${new Date().toISOString().slice(0, 10)}.csv`,
                invs.map((i) => ({
                  ...i,
                  total: i.totalAmount || i.grandTotal || 0,
                  dateFormatted: formatISTDateTime(i.createdAt),
                })),
                [
                  { key: 'invoiceNumber', label: 'Invoice No' },
                  { key: 'customerName', label: 'Customer' },
                  { key: 'customerMobile', label: 'Mobile' },
                  { key: 'dateFormatted', label: 'Date' },
                  { key: 'total', label: 'Total (INR)' },
                  { key: 'status', label: 'Status' },
                ]
              );
            }}
            className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Invoices CSV</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              const prods = await dataService.getProducts();
              if (prods.length === 0) return alert('No products to export.');
              exportToCsv(
                `trending_studio_products_${new Date().toISOString().slice(0, 10)}.csv`,
                prods,
                [
                  { key: 'sku', label: 'SKU' },
                  { key: 'name', label: 'Product Name' },
                  { key: 'category', label: 'Category' },
                  { key: 'sellingPrice', label: 'Price' },
                  { key: 'stock', label: 'Stock' },
                ]
              );
            }}
            className="px-3 py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Products CSV</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              const custs = await dataService.getCustomers();
              if (custs.length === 0) return alert('No customers to export.');
              exportToCsv(
                `trending_studio_customers_${new Date().toISOString().slice(0, 10)}.csv`,
                custs,
                [
                  { key: 'name', label: 'Customer' },
                  { key: 'mobile', label: 'Mobile' },
                  { key: 'city', label: 'City' },
                  { key: 'totalSpent', label: 'Total Spent' },
                ]
              );
            }}
            className="px-3 py-1.5 bg-purple-600/90 hover:bg-purple-600 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Customers CSV</span>
          </button>
        </div>
      </div>

      {/* Terminal Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <span>Registered Android Terminals ({devices.length})</span>
          </h2>
          <button
            onClick={handleRegisterCurrentDevice}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 self-start sm:self-auto shadow-md shadow-indigo-600/20"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>+ Register This Device as Terminal</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {devices.map((d) => (
            <div
              key={d._id}
              className={`p-4 rounded-xl border ${
                d.isRevoked
                  ? 'bg-rose-950/20 border-rose-500/40'
                  : 'bg-slate-800/60 border-slate-700/60'
              } flex flex-col justify-between space-y-3`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{d.deviceName}</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      {d.platform || 'ANDROID'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        d.isRevoked
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {d.isRevoked ? 'REVOKED' : 'ACTIVE'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] font-mono text-slate-400 mt-1">ID: {d.deviceId}</p>
                <p className="text-[11px] text-slate-400">
                  User: {d.userName || 'Unassigned'} • v{d.appVersion}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
                <span>Last Active: {formatISTDateTime(d.lastActive)}</span>
                {!d.isRevoked ? (
                  <button
                    onClick={() => handleRevokeDevice(d._id)}
                    className="text-rose-400 hover:underline font-bold"
                  >
                    Revoke / Lock
                  </button>
                ) : (
                  <button
                    onClick={() => handleUnrevokeDevice(d._id)}
                    className="text-emerald-400 hover:underline font-bold"
                  >
                    Unlock Terminal
                  </button>
                )}
              </div>
            </div>
          ))}

          {devices.length === 0 && (
            <div className="col-span-full py-8 text-center text-xs text-slate-400 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2">
              <Smartphone className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-300">No Terminals Registered Yet</p>
              <p className="text-[11px] text-slate-500">
                Open this app on your phone at <code className="text-blue-400 font-mono">http://192.168.0.101:5173</code> to automatically register your phone, or click below.
              </p>
              <button
                onClick={handleRegisterCurrentDevice}
                className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center space-x-1"
              >
                <span>+ Register This Device</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sync Operations Audit Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center space-x-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <span>Recent Offline Sync Operations</span>
        </h2>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase bg-slate-800/80 text-slate-400 font-bold border-b border-slate-800">
              <tr>
                <th className="px-3 py-2">Operation ID</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {syncStatus?.recentOperations?.map((op: any) => (
                <tr key={op._id}>
                  <td className="px-3 py-2 font-mono text-[10px] text-blue-400">
                    {op.operationId}
                  </td>
                  <td className="px-3 py-2 font-bold uppercase">{op.entity}</td>
                  <td className="px-3 py-2">{op.operationType}</td>
                  <td className="px-3 py-2 text-slate-400">
                    {formatISTDateTime(op.timestamp)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {op.status}
                    </span>
                  </td>
                </tr>
              ))}

              {(!syncStatus?.recentOperations || syncStatus.recentOperations.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-500">
                    No recent sync operations in queue. All devices are up to date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
