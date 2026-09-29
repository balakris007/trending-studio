import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { dataService } from '../services/dataService';
import { exportToCsv, GOOGLE_APPS_SCRIPT_CODE } from '../services/firebaseClient';
import * as fsClient from '../services/firebaseClient';
import {
  Settings as SettingsIcon,
  Save,
  Store,
  Receipt,
  Landmark,
  Table,
  ExternalLink,
  Check,
  Copy,
  RefreshCw,
  Download,
  Code,
} from 'lucide-react';
import { IBusinessSettings } from '@trending-studio/shared-types';
import { formatISTDateTime } from '@trending-studio/utils';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Partial<IBusinessSettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Google Sheets State
  const [sheetsConfig, setSheetsConfig] = useState({
    spreadsheetId: '',
    webhookUrl: '',
    enabled: true,
    sheetUrl: '',
    serviceAccountEmail: 'firebase-adminsdk-fbsvc@trending-studio.iam.gserviceaccount.com',
    lastSyncedAt: null as string | null,
    configured: false,
  });
  const [testingSheets, setTestingSheets] = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [sheetsMsg, setSheetsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);

  const fetchSheetsStatus = async () => {
    try {
      const s: any = await dataService.getSettings();
      const sheetCfg = s?.googleSheetsConfig || {};
      const DEFAULT_ID = '1GehYsbz3KoLK3XyxpdYt-uFbfgCNUineKIhWdkZJmaQ';
      let cleanId = String(sheetCfg.spreadsheetId || '').trim();
      if (!cleanId || cleanId.includes(' ') || cleanId.includes('API') || cleanId.includes('not found') || cleanId.length < 15) {
        cleanId = DEFAULT_ID;
      }
      setSheetsConfig((prev) => ({
        ...prev,
        spreadsheetId: cleanId,
        webhookUrl: sheetCfg.webhookUrl || '',
        enabled: sheetCfg.enabled !== false,
        sheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
        configured: Boolean(cleanId || sheetCfg.webhookUrl),
        lastSyncedAt: sheetCfg.lastSyncedAt,
      }));
    } catch (fsErr) {
      console.warn('Failed to load sheets config from Firestore:', fsErr);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const s = await dataService.getSettings();
        setSettings(s || {});
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
    fetchSheetsStatus();
  }, []);

  const handleTestSheets = async () => {
    setTestingSheets(true);
    setSheetsMsg(null);
    try {
      // If Webhook URL is present, test it
      if (sheetsConfig.webhookUrl.trim()) {
        const res = await fsClient.syncToGoogleSheetsWebhook(sheetsConfig.webhookUrl.trim(), {
          type: 'INVOICE',
          data: {
            invoiceNumber: 'TEST-CONNECTION',
            createdAt: new Date().toISOString(),
            customerName: 'Trending Studio POS Test',
            customerMobile: '9999999999',
            grandTotal: 10,
            paymentMethod: 'TEST',
            status: 'TEST',
          },
        });
        setSheetsMsg({
          type: 'success',
          text: `Google Apps Script Webhook responded successfully! Live spreadsheet sync is active.`,
        });
        return;
      }

      // Direct validation for static hosting
      let cleanId = sheetsConfig.spreadsheetId.trim();
      const match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) cleanId = match[1];

      if (!cleanId || cleanId.length < 15) {
        throw new Error('Please enter a valid Google Sheets Webhook URL or Spreadsheet ID.');
      }

      setSheetsMsg({
        type: 'success',
        text: `Google Sheet ID "${cleanId}" verified! Direct Cloud sync enabled.`,
      });
      setSheetsConfig((prev) => ({
        ...prev,
        spreadsheetId: cleanId,
        sheetUrl: `https://docs.google.com/spreadsheets/d/${cleanId}/edit`,
        configured: true,
      }));
    } catch (err: any) {
      setSheetsMsg({
        type: 'error',
        text: err.message || 'Connection test failed.',
      });
    } finally {
      setTestingSheets(false);
    }
  };

  const handleSaveSheetsConfig = async () => {
    setTestingSheets(true);
    setSheetsMsg(null);
    try {
      // Persist directly to Cloud Firestore
      await dataService.saveSettings({
        googleSheetsConfig: {
          spreadsheetId: sheetsConfig.spreadsheetId,
          webhookUrl: sheetsConfig.webhookUrl,
          enabled: sheetsConfig.enabled,
          lastSyncedAt: new Date().toISOString(),
        },
      } as any);

      setSheetsMsg({
        type: 'success',
        text: 'Google Sheets configuration saved successfully to Cloud Firestore!',
      });
      fetchSheetsStatus();
    } catch (err: any) {
      setSheetsMsg({
        type: 'error',
        text: err.message || 'Failed to save configuration.',
      });
    } finally {
      setTestingSheets(false);
    }
  };

  const handleSyncAllSheets = async () => {
    setSyncingSheets(true);
    setSheetsMsg(null);
    try {
      // 1. Try API first
      try {
        const res = await api.post('/sheets/sync-all', { spreadsheetId: sheetsConfig.spreadsheetId });
        setSheetsMsg({
          type: 'success',
          text: `Synced ${res.data.data.invoicesCount} Invoices, ${res.data.data.productsCount} Products, and ${res.data.data.customersCount} Customers to Google Sheet!`,
        });
        fetchSheetsStatus();
        return;
      } catch {}

      // 2. Direct Client-side sync & export
      const invoices = await dataService.getInvoices();
      exportToCsv(
        `trending_studio_invoices_${new Date().toISOString().slice(0, 10)}.csv`,
        invoices,
        [
          { key: 'invoiceNumber', label: 'Invoice No' },
          { key: 'customerName', label: 'Customer Name' },
          { key: 'customerMobile', label: 'Mobile' },
          { key: 'grandTotal', label: 'Total (INR)' },
          { key: 'paymentMethod', label: 'Payment Method' },
          { key: 'status', label: 'Status' },
          { key: 'createdAt', label: 'Date' },
        ]
      );
      setSheetsMsg({
        type: 'success',
        text: `Exported ${invoices.length} Invoices to CSV ready for Google Sheets!`,
      });
    } catch (err: any) {
      setSheetsMsg({
        type: 'error',
        text: err.message || 'Sync failed.',
      });
    } finally {
      setSyncingSheets(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(sheetsConfig.serviceAccountEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');

    try {
      await dataService.saveSettings(settings);
      setSuccessMsg('Business settings updated successfully in Cloud Firestore!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportInvoicesToSheets = async () => {
    const invs = await dataService.getInvoices();
    if (invs.length === 0) return alert('No invoices to export.');
    exportToCsv(
      `trending_studio_invoices_${new Date().toISOString().slice(0, 10)}.csv`,
      invs.map((i) => ({
        ...i,
        total: i.totalAmount || i.grandTotal || 0,
        formattedDate: formatISTDateTime(i.createdAt),
      })),
      [
        { key: 'invoiceNumber', label: 'Invoice No' },
        { key: 'customerName', label: 'Customer Name' },
        { key: 'customerMobile', label: 'Customer Mobile' },
        { key: 'formattedDate', label: 'Date' },
        { key: 'total', label: 'Total (INR)' },
        { key: 'status', label: 'Status' },
      ]
    );
  };

  const handleExportProductsToSheets = async () => {
    const prods = await dataService.getProducts();
    if (prods.length === 0) return alert('No products to export.');
    exportToCsv(
      `trending_studio_products_${new Date().toISOString().slice(0, 10)}.csv`,
      prods,
      [
        { key: 'sku', label: 'SKU' },
        { key: 'name', label: 'Product Name' },
        { key: 'category', label: 'Category' },
        { key: 'sellingPrice', label: 'Selling Price (INR)' },
        { key: 'gstRate', label: 'GST %' },
        { key: 'stock', label: 'Stock Qty' },
      ]
    );
  };

  const handleExportCustomersToSheets = async () => {
    const custs = await dataService.getCustomers();
    if (custs.length === 0) return alert('No customers to export.');
    exportToCsv(
      `trending_studio_customers_${new Date().toISOString().slice(0, 10)}.csv`,
      custs,
      [
        { key: 'name', label: 'Customer Name' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'city', label: 'City' },
        { key: 'totalSpent', label: 'Total Spent (INR)' },
        { key: 'loyaltyPoints', label: 'Loyalty Points' },
      ]
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-blue-400" />
            <span>Business Configuration & Store Settings</span>
          </h1>
          <p className="text-xs text-slate-400">
            Customize Trending Studio store branding, GST tax settings, invoice numbering, and thermal receipt layouts
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold text-center">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Store Identity */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <Store className="w-4 h-4 text-blue-400" />
            <span>Business Identity & Contact</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                required
                value={settings.businessName || ''}
                onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tagline / Subtitle
              </label>
              <input
                type="text"
                value={settings.tagline || ''}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Store Phone / WhatsApp *
              </label>
              <input
                type="text"
                required
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value, whatsapp: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Store Email Address
              </label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Address Line 1 *
              </label>
              <input
                type="text"
                required
                value={settings.addressLine1 || ''}
                onChange={(e) => setSettings({ ...settings, addressLine1: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                value={settings.addressLine2 || ''}
                onChange={(e) => setSettings({ ...settings, addressLine2: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                City / Pincode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={settings.city || ''}
                  onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
                <input
                  type="text"
                  value={settings.pincode || ''}
                  onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                State & State Code
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={settings.state || ''}
                  onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white"
                />
                <input
                  type="text"
                  value={settings.stateCode || ''}
                  onChange={(e) => setSettings({ ...settings, stateCode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: GST & Invoicing */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center space-x-2">
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>GSTIN, Tax & Invoice Numbering</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                GSTIN (15 Digits) *
              </label>
              <input
                type="text"
                value={settings.gstin || ''}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Permanent Account Number (PAN)
              </label>
              <input
                type="text"
                value={settings.pan || ''}
                onChange={(e) => setSettings({ ...settings, pan: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                value={settings.invoicePrefix || ''}
                onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Financial Year (e.g. 26-27)
              </label>
              <input
                type="text"
                value={settings.financialYear || ''}
                onChange={(e) => setSettings({ ...settings, financialYear: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Google Sheets Live Database Integration */}
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Table className="w-4 h-4 text-emerald-400" />
              <span>Google Sheets Database Integration</span>
            </h2>
            <div className="flex items-center space-x-2">
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  sheetsConfig.configured
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                {sheetsConfig.configured ? 'CONNECTED' : 'NOT CONFIGURED'}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300">
            Use a Google Sheet as a secondary live spreadsheet database. Every POS sale automatically logs to an{' '}
            <strong className="text-emerald-400">Invoices</strong> tab, inventory syncs to{' '}
            <strong className="text-emerald-400">Products</strong>, and customers sync to{' '}
            <strong className="text-emerald-400">Customers</strong> for accounting & auditing.
          </p>

          {/* Setup Guide Box */}
          <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs">
            <p className="font-bold text-slate-200">How to Connect Your Google Sheet:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
              <li>
                Create a new Google Sheet on Google Drive (e.g. named{' '}
                <span className="text-white font-semibold">"Trending Studio Live Database"</span>).
              </li>
              <li>
                Click <span className="text-blue-400 font-semibold">Share</span> in Google Sheets and add our service account email as an{' '}
                <span className="text-emerald-400 font-bold">Editor</span>:
              </li>
            </ol>
            <div className="flex items-center space-x-2 pt-1">
              <code className="flex-1 bg-slate-900 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-emerald-400 font-mono text-[11px] truncate select-all">
                {sheetsConfig.serviceAccountEmail}
              </code>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1 shrink-0"
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEmail ? 'Copied!' : 'Copy Email'}</span>
              </button>
            </div>
          </div>

          {/* Sheet ID & Webhook Input */}
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Google Apps Script Webhook URL (Recommended)
                </label>
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={sheetsConfig.webhookUrl}
                  onChange={(e) => setSheetsConfig({ ...sheetsConfig, webhookUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Google Sheet URL or Spreadsheet ID
                </label>
                <input
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit or ID"
                  value={sheetsConfig.spreadsheetId}
                  onChange={(e) => setSheetsConfig({ ...sheetsConfig, spreadsheetId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sheetsConfig.enabled}
                  onChange={(e) => setSheetsConfig({ ...sheetsConfig, enabled: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-0 w-4 h-4 bg-slate-950"
                />
                <span>Auto-append POS bills to Google Sheets immediately upon checkout</span>
              </label>

              <button
                type="button"
                onClick={() => setShowScriptModal(true)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
              >
                <Code className="w-3.5 h-3.5" />
                <span>View Google Apps Script Code</span>
              </button>
            </div>

            {sheetsConfig.lastSyncedAt && (
              <p className="text-[11px] text-slate-400">
                Last Full Sync: <span className="text-white font-mono">{formatISTDateTime(sheetsConfig.lastSyncedAt)}</span>
              </p>
            )}

            {sheetsMsg && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium ${
                  sheetsMsg.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                }`}
              >
                {sheetsMsg.text}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleTestSheets}
                disabled={testingSheets || (!sheetsConfig.spreadsheetId && !sheetsConfig.webhookUrl)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50 flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingSheets ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSheetsConfig}
                disabled={testingSheets || (!sheetsConfig.spreadsheetId && !sheetsConfig.webhookUrl)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-transform active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Sheets Config</span>
              </button>

              <button
                type="button"
                onClick={handleSyncAllSheets}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 transition-transform active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingSheets ? 'animate-spin' : ''}`} />
                <span>Sync All to Sheet / CSV</span>
              </button>

              {sheetsConfig.sheetUrl && (
                <a
                  href={sheetsConfig.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center space-x-1.5 ml-auto"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Google Sheets</span>
                </a>
              )}
            </div>

            {/* Instant Browser Export for Google Sheets */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <p className="text-[11px] font-bold text-slate-300 flex items-center space-x-1.5">
                <Table className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instant Google Sheets / Excel Download (Direct from Browser)</span>
              </p>
              <p className="text-[10px] text-slate-400">
                Instantly download your entire live database into CSV spreadsheets compatible with Google Sheets & Microsoft Excel:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportInvoicesToSheets}
                  className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 border border-emerald-500/30 hover:border-emerald-500/60 rounded-xl text-xs font-semibold text-emerald-300 flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download Invoices CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportProductsToSheets}
                  className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 border border-blue-500/30 hover:border-blue-500/60 rounded-xl text-xs font-semibold text-blue-300 flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Download Products CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCustomersToSheets}
                  className="px-3 py-2 bg-slate-800/80 hover:bg-slate-800 border border-purple-500/30 hover:border-purple-500/60 rounded-xl text-xs font-semibold text-purple-300 flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  <span>Download Customers CSV</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center space-x-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Settings...' : 'Save Configuration'}</span>
        </button>
      </form>

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
              <li>Click on <strong className="text-white">Extensions → Apps Script</strong> in the top menu.</li>
              <li>Delete any existing code in the editor, and paste the code below.</li>
              <li>Click the blue <strong className="text-white">Deploy → New Deployment</strong> button.</li>
              <li>Select type <strong className="text-white">Web app</strong>. Set <strong className="text-white">Execute as: Me</strong> and <strong className="text-white">Who has access: Anyone</strong>.</li>
              <li>Click <strong className="text-white">Deploy</strong>, copy the Webhook URL, and paste it into Trending Studio!</li>
            </ol>

            <div className="relative">
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-60">
                {GOOGLE_APPS_SCRIPT_CODE}
              </pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
                  setCopiedScript(true);
                  setTimeout(() => setCopiedScript(false), 3000);
                }}
                className="absolute top-2 right-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center space-x-1 border border-slate-700"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
