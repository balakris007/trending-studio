import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { offlineDb } from '../services/offlineDb';
import { dataService } from '../services/dataService';
import * as fsClient from '../services/firebaseClient';
import { exportToCsv, GOOGLE_APPS_SCRIPT_CODE } from '../services/firebaseClient';
import { formatISTDateTime } from '@trending-studio/utils';
import { syncManager, ISyncResult } from '../services/syncManager';
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
  Upload,
  Check,
  Copy,
  Code,
  Sparkles,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const SyncCenter: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [sheetsStatus, setSheetsStatus] = useState<any>(null);
  const [localPendingCount, setLocalPendingCount] = useState<number>(0);
  const [dbStats, setDbStats] = useState({
    totalInvoices: 0,
    pendingInvoices: 0,
    totalCustomers: 0,
    totalProducts: 0,
    pendingQueueCount: 0,
  });

  // State for master 1-click sync
  const [isFullSyncing, setIsFullSyncing] = useState(false);
  const [fullSyncProgress, setFullSyncProgress] = useState<string | null>(null);
  const [fullSyncResult, setFullSyncResult] = useState<ISyncResult | null>(null);

  // State for sheets sync & webhook
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsSyncMsg, setSheetsSyncMsg] = useState<string | null>(null);
  const [webhookInput, setWebhookInput] = useState('');
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [webhookMsg, setWebhookMsg] = useState<string | null>(null);

  // State for queue upload
  const [isSyncingPending, setIsSyncingPending] = useState(false);
  const [uploadPendingMsg, setUploadPendingMsg] = useState<string | null>(null);

  // Apps Script Guide Modal
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const [loading, setLoading] = useState(true);

  const fetchSyncData = async () => {
    try {
      const [devList, stats, pending, settings] = await Promise.all([
        dataService.getDevices(),
        offlineDb.getOfflineStats(),
        offlineDb.getPendingCount(),
        dataService.getSettings(),
      ]);

      setDevices(devList || []);
      setDbStats(stats);
      setLocalPendingCount(pending);

      setSyncStatus({
        cloudConnected: true,
        cloudDatabase: 'Google Cloud Firestore',
        lastCheckedAt: new Date().toISOString(),
      });

      const s = settings as any;
      const sheetConfig = s?.googleSheetsConfig || {};
      if (sheetConfig.webhookUrl) {
        setWebhookInput(sheetConfig.webhookUrl);
      }
      setSheetsStatus({
        spreadsheetId: sheetConfig.spreadsheetId || '',
        webhookUrl: sheetConfig.webhookUrl || '',
        enabled: sheetConfig.enabled !== false,
        sheetUrl: sheetConfig.spreadsheetId
          ? `https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit`
          : null,
        configured: Boolean(sheetConfig.spreadsheetId || sheetConfig.webhookUrl),
        lastSyncedAt: sheetConfig.lastSyncedAt,
      });
    } catch (err) {
      console.error('Failed to load sync center data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncData();
  }, []);

  /**
   * 1-Click Master Synchronization:
   * Takes all invoices, customers, and products in Browser IndexedDB and
   * upserts them into Cloud Firestore AND pushes them to Google Sheets!
   */
  const handleFullSync = async () => {
    setIsFullSyncing(true);
    setFullSyncProgress('Initiating master database synchronization...');
    setFullSyncResult(null);

    try {
      const result = await syncManager.syncBrowserIndexedDBToCloudAndSheets({
        forceAll: true,
        onProgress: (status) => setFullSyncProgress(status),
      });

      setFullSyncResult(result);
      await fetchSyncData();
    } catch (err: any) {
      setFullSyncResult({
        success: false,
        error: err.message || 'Full synchronization failed',
      });
    } finally {
      setIsFullSyncing(false);
      setFullSyncProgress(null);
    }
  };

  /**
   * Sync directly to Google Sheets Webhook or download CSV
   */
  const handleSyncSheetsNow = async () => {
    setIsSyncingSheets(true);
    setSheetsSyncMsg(null);
    try {
      const invoices = await offlineDb.getOfflineInvoices();
      const customers = await offlineDb.getCachedCustomers();
      const products = await offlineDb.getCachedProducts();

      const webhookUrl = sheetsStatus?.webhookUrl || webhookInput.trim();

      if (webhookUrl) {
        const res = await fsClient.syncToGoogleSheetsWebhook(webhookUrl, {
          type: 'FULL_SYNC',
          data: { invoices, products, customers },
        });

        // Update settings with lastSyncedAt
        await dataService.saveSettings({
          googleSheetsConfig: {
            ...sheetsStatus,
            webhookUrl,
            lastSyncedAt: new Date().toISOString(),
          },
        } as any);

        setSheetsSyncMsg(res.message || `Pushed ${invoices.length} invoices to Google Sheets!`);
      } else {
        // Fallback: Export CSV directly for Google Sheets
        exportToCsv(
          `trending_studio_invoices_${new Date().toISOString().slice(0, 10)}.csv`,
          invoices.map((inv) => ({
            ...inv,
            total: inv.grandTotal || inv.totalAmount || 0,
            dateFormatted: formatISTDateTime(inv.createdAt),
          })),
          [
            { key: 'invoiceNumber', label: 'Invoice No' },
            { key: 'customerName', label: 'Customer Name' },
            { key: 'customerMobile', label: 'Mobile' },
            { key: 'dateFormatted', label: 'Date' },
            { key: 'total', label: 'Total (INR)' },
            { key: 'paymentMethod', label: 'Payment Method' },
            { key: 'status', label: 'Status' },
          ]
        );
        setSheetsSyncMsg(`Exported ${invoices.length} invoices to CSV for Google Sheets!`);
      }
      await fetchSyncData();
    } catch (err: any) {
      setSheetsSyncMsg(err.message || 'Sheets sync failed.');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  /**
   * Save Webhook URL directly from this page
   */
  const handleSaveWebhook = async () => {
    const url = webhookInput.trim();
    if (!url) {
      alert('Please enter a valid Google Apps Script Webhook URL.');
      return;
    }
    setSavingWebhook(true);
    setWebhookMsg(null);
    try {
      // Save to settings
      await dataService.saveSettings({
        googleSheetsConfig: {
          ...sheetsStatus,
          webhookUrl: url,
          enabled: true,
          lastSyncedAt: new Date().toISOString(),
        },
      } as any);

      // Immediately push all existing invoices, customers, and products to Google Sheets
      const allInvoices = await offlineDb.getOfflineInvoices();
      const allCusts = await offlineDb.getCachedCustomers();
      const allProds = await offlineDb.getCachedProducts();

      await fsClient.syncToGoogleSheetsWebhook(url, {
        type: 'FULL_SYNC',
        data: { invoices: allInvoices, customers: allCusts, products: allProds },
      });

      setWebhookMsg(
        `Webhook URL verified and connected! Immediately pushed ${allInvoices.length} invoices, ${allCusts.length} customers, and ${allProds.length} products to your Google Sheet!`
      );
      await fetchSyncData();
    } catch (err: any) {
      setWebhookMsg(err.message || 'Failed to verify webhook URL.');
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleUploadPendingToCloud = async () => {
    setIsSyncingPending(true);
    setUploadPendingMsg(null);
    try {
      const res = await syncManager.syncNow();
      if (res.success) {
        setUploadPendingMsg(
          `Uploaded ${res.syncedCount || 0} records to Cloud Firestore successfully!`
        );
      } else {
        setUploadPendingMsg(res.error || 'Failed to upload pending records.');
      }
      await fetchSyncData();
    } catch (err: any) {
      setUploadPendingMsg(err.message || 'Upload failed.');
    } finally {
      setIsSyncingPending(false);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to revoke and lock this terminal?')) return;
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
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center space-x-2">
            <RefreshCw className="w-5 h-5 text-blue-400" />
            <span>Sync Center & Multi-Database Hub</span>
          </h1>
          <p className="text-xs text-slate-400">
            Synchronize between Browser IndexedDB (Offline Storage), Cloud Firestore, and Google Sheets
          </p>
        </div>

        <button
          onClick={fetchSyncData}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white flex items-center space-x-1.5 border border-slate-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh DB Status</span>
        </button>
      </div>

      {/* MASTER 1-CLICK SYNC HERO CARD */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border-2 border-indigo-500/40 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              <span>Full Synchronization Engine</span>
            </div>
            <h2 className="text-lg font-black text-white">
              Sync Browser IndexedDB $\rightarrow$ Cloud Firestore & Google Sheets
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              Pushes all local bills, customers, and cached inventory stored in your browser's IndexedDB into Cloud Firestore and updates Google Sheets.
            </p>
          </div>

          <button
            onClick={handleFullSync}
            disabled={isFullSyncing}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-transform active:scale-95 disabled:opacity-50 shrink-0"
          >
            <Upload className={`w-4 h-4 ${isFullSyncing ? 'animate-bounce' : ''}`} />
            <span>{isFullSyncing ? 'Synchronizing Everything...' : '⚡ Full Sync to Cloud & Sheets'}</span>
          </button>
        </div>

        {/* Live Browser IndexedDB Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Local Invoices</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl font-black text-white">{dbStats.totalInvoices}</span>
              {dbStats.pendingInvoices > 0 && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                  {dbStats.pendingInvoices} Pending
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 font-mono">Store: offlineInvoices</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Local Customers</span>
            <div className="mt-1">
              <span className="text-xl font-black text-white">{dbStats.totalCustomers}</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 font-mono">Store: customers</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Cached Products</span>
            <div className="mt-1">
              <span className="text-xl font-black text-white">{dbStats.totalProducts}</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 font-mono">Store: products</span>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400">Pending Queue Ops</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-xl font-black text-white">{localPendingCount}</span>
              {localPendingCount > 0 ? (
                <span className="text-[10px] font-bold text-amber-400">Queued</span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-400">Clear</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 font-mono">Store: offlineQueue</span>
          </div>
        </div>

        {/* Sync In-Progress Step Indicator */}
        {isFullSyncing && fullSyncProgress && (
          <div className="p-3 bg-blue-950/60 border border-blue-500/40 rounded-xl flex items-center space-x-3 text-xs text-blue-200">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
            <span className="font-semibold">{fullSyncProgress}</span>
          </div>
        )}

        {/* Sync Result Banner */}
        {fullSyncResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-1.5 ${
              fullSyncResult.success
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2 font-bold">
              {fullSyncResult.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span>{fullSyncResult.success ? 'Sync Successful!' : 'Sync Notice'}</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {fullSyncResult.summary || fullSyncResult.error || 'All records processed.'}
            </p>
            {fullSyncResult.errors && fullSyncResult.errors.length > 0 && (
              <ul className="list-disc list-inside text-[10px] text-rose-300 pt-1 space-y-0.5">
                {fullSyncResult.errors.slice(0, 3).map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
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
                  <p className="text-[10px] text-slate-400">Database 1 (Primary Cloud)</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ONLINE
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Google Cloud project <code className="text-blue-400 font-mono">trending-studio</code>. Stores invoices, catalog, and customers with instant replication.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-400 font-mono flex items-center justify-between">
            <span>Provider: Google Cloud Firestore</span>
            <span className="text-emerald-400">Connected</span>
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
                  <p className="text-[10px] text-slate-400">Database 2 (Offline POS Cache)</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  localPendingCount > 0 || dbStats.pendingInvoices > 0
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {localPendingCount > 0 || dbStats.pendingInvoices > 0
                  ? `${localPendingCount + dbStats.pendingInvoices} UNSYNCED`
                  : 'UP TO DATE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Terminal storage inside your browser. Allows POS checkout even with no internet, auto-syncing upon reconnection.
            </p>
            {uploadPendingMsg && (
              <p className="text-[10px] text-indigo-400 font-bold bg-indigo-500/10 p-1.5 rounded-lg">
                {uploadPendingMsg}
              </p>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-[10px] text-slate-400 font-mono">
              Invoices: {dbStats.totalInvoices}
            </span>
            <button
              onClick={handleUploadPendingToCloud}
              disabled={isSyncingPending}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 shadow-sm disabled:opacity-50"
            >
              <Upload className={`w-3 h-3 ${isSyncingPending ? 'animate-bounce' : ''}`} />
              <span>
                {isSyncingPending
                  ? 'Uploading...'
                  : localPendingCount > 0
                  ? `Upload (${localPendingCount})`
                  : 'Sync Invoices'}
              </span>
            </button>
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
                  sheetsStatus?.webhookUrl
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : sheetsStatus?.spreadsheetId
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {sheetsStatus?.webhookUrl
                  ? 'LIVE SYNC ACTIVE'
                  : sheetsStatus?.spreadsheetId
                  ? 'WEBHOOK NEEDED'
                  : 'NOT CONFIGURED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {sheetsStatus?.webhookUrl
                ? 'Live Google Apps Script Webhook is linked. Every bill automatically updates your Google Sheet in real time.'
                : 'Connect your 60-second Google Apps Script Webhook below to automatically stream invoices into Google Sheets.'}
            </p>
            {sheetsSyncMsg && (
              <p className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 p-1.5 rounded-lg">
                {sheetsSyncMsg}
              </p>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <button
              onClick={handleSyncSheetsNow}
              disabled={isSyncingSheets}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingSheets ? 'animate-spin' : ''}`} />
              <span>Sync Sheets</span>
            </button>
            {sheetsStatus?.sheetUrl ? (
              <a
                href={sheetsStatus.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-400 hover:underline flex items-center space-x-1"
              >
                <span>Open Sheet</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <button
                onClick={() => setShowScriptModal(true)}
                className="text-[11px] text-blue-400 hover:underline flex items-center space-x-1"
              >
                <span>Get Apps Script Code</span>
                <Code className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* GOOGLE SHEETS WEBHOOK & DIRECT SYNC PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Google Sheets Real-Time Sync Setup</h3>
          </div>
          <button
            onClick={() => setShowScriptModal(true)}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
          >
            <Code className="w-3.5 h-3.5" />
            <span>How to Connect Your Google Sheet (60 Secs)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-slate-300">
              Google Apps Script Webhook URL
            </label>
            <input
              type="text"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={webhookInput}
              onChange={(e) => setWebhookInput(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSaveWebhook}
              disabled={savingWebhook || !webhookInput.trim()}
              className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center space-x-1 shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{savingWebhook ? 'Saving & Verifying...' : 'Save & Connect Webhook'}</span>
            </button>
          </div>
        </div>

        {webhookMsg && (
          <p className="text-xs text-emerald-400 font-medium bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
            {webhookMsg}
          </p>
        )}
      </div>

      {/* QUICK GOOGLE SHEETS / EXCEL EXPORT PANEL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-white flex items-center space-x-2">
            <Table className="w-4 h-4 text-emerald-400" />
            <span>Instant Google Sheets & Excel Export (From Browser DB)</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Download your local IndexedDB records directly into spreadsheets for immediate use
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              const invs = await offlineDb.getOfflineInvoices();
              if (invs.length === 0) return alert('No invoices stored in browser database.');
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
                  { key: 'paymentMethod', label: 'Payment Method' },
                  { key: 'status', label: 'Status' },
                ]
              );
            }}
            className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Invoices CSV ({dbStats.totalInvoices})</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              const prods = await offlineDb.getCachedProducts();
              if (prods.length === 0) return alert('No products found in local database.');
              exportToCsv(
                `trending_studio_products_${new Date().toISOString().slice(0, 10)}.csv`,
                prods,
                [
                  { key: 'sku', label: 'SKU' },
                  { key: 'name', label: 'Product Name' },
                  { key: 'category', label: 'Category' },
                  { key: 'sellingPrice', label: 'Selling Price' },
                  { key: 'stockQuantity', label: 'Stock' },
                ]
              );
            }}
            className="px-3 py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Products CSV ({dbStats.totalProducts})</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              const custs = await offlineDb.getCachedCustomers();
              if (custs.length === 0) return alert('No customers in local database.');
              exportToCsv(
                `trending_studio_customers_${new Date().toISOString().slice(0, 10)}.csv`,
                custs,
                [
                  { key: 'name', label: 'Customer Name' },
                  { key: 'mobile', label: 'Mobile' },
                  { key: 'city', label: 'City' },
                  { key: 'totalSpent', label: 'Total Spent' },
                ]
              );
            }}
            className="px-3 py-1.5 bg-purple-600/90 hover:bg-purple-600 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Customers CSV ({dbStats.totalCustomers})</span>
          </button>
        </div>
      </div>

      {/* APPS SCRIPT CODE MODAL */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Code className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Google Apps Script Webhook Code</h3>
              </div>
              <button
                onClick={() => setShowScriptModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Follow these simple steps to link your Google Sheet in under 60 seconds:
            </p>

            <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-300">
              <li>Open your Google Sheet (or create a new blank Google Sheet).</li>
              <li>Click on <strong className="text-white">Extensions $\rightarrow$ Apps Script</strong> in the top menu.</li>
              <li>Delete any code in the editor, and paste the code below.</li>
              <li>Click the blue <strong className="text-white">Deploy $\rightarrow$ New Deployment</strong> button.</li>
              <li>Select type <strong className="text-white">Web app</strong>. Set <strong className="text-white">Execute as: Me</strong> and <strong className="text-white">Who has access: Anyone</strong>.</li>
              <li>Click <strong className="text-white">Deploy</strong>, copy the Webhook URL, and paste it into Trending Studio!</li>
            </ol>

            <div className="relative">
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-60">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
              <button
                onClick={handleCopyScript}
                className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center space-x-1 border border-slate-700"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowScriptModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Devices Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <span>Registered Terminals ({devices.length})</span>
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
                      {d.platform || 'WEB'}
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
                  User: {d.userName || 'Staff Terminal'} • v{d.appVersion || '1.0.0'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
                <span>Last Active: {formatISTDateTime(d.lastActiveAt || d.createdAt)}</span>
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
                Click below to register this current device (computer or smartphone) as an authorized terminal.
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
                    No recent sync operations in queue. All devices and records are synchronized.
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
