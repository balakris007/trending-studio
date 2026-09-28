import { google, sheets_v4 } from 'googleapis';
import path from 'path';
import fs from 'fs';
import {
  BusinessSettingsModel,
  InvoiceModel,
  ProductModel,
  CustomerModel,
  BranchModel,
} from '../models';
import { formatISTDateTime, formatINR } from '@trending-studio/utils';

export class GoogleSheetsService {
  private static serviceAccountEmail = 'firebase-adminsdk-fbsvc@trending-studio.iam.gserviceaccount.com';

  /**
   * Resolve key file path
   */
  private static getKeyFilePath(): string {
    const candidates = [
      path.resolve(process.cwd(), 'serviceAccountKey.json'),
      path.resolve(process.cwd(), 'apps/api/serviceAccountKey.json'),
      path.resolve(__dirname, '../../serviceAccountKey.json'),
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return path.resolve(process.cwd(), 'serviceAccountKey.json');
  }

  /**
   * Get authenticated Google Sheets client
   */
  public static async getSheetsClient(): Promise<sheets_v4.Sheets> {
    const keyPath = this.getKeyFilePath();
    if (!fs.existsSync(keyPath)) {
      throw new Error(`Google service account key not found at ${keyPath}. Please place serviceAccountKey.json in apps/api directory.`);
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient as any });
  }

  /**
   * Extract spreadsheet ID from pure ID or full Google Sheets URL
   */
  public static extractSpreadsheetId(input: string): string {
    if (!input) return '';
    const trimmed = input.trim();
    // Match URL pattern: https://docs.google.com/spreadsheets/d/<ID>/edit
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  }

  /**
   * Get configured spreadsheet ID from BusinessSettings or environment
   */
  public static async getEffectiveSpreadsheetId(): Promise<string> {
    try {
      const settings: any = await BusinessSettingsModel.findOne();
      if (settings?.googleSheetsConfig?.spreadsheetId) {
        return settings.googleSheetsConfig.spreadsheetId;
      }
    } catch {}

    return process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
  }

  /**
   * Return Service Account Email for sharing instructions
   */
  public static getServiceAccountEmail(): string {
    try {
      const keyPath = this.getKeyFilePath();
      if (fs.existsSync(keyPath)) {
        const raw = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        if (raw.client_email) {
          return raw.client_email;
        }
      }
    } catch {}
    return this.serviceAccountEmail;
  }

  /**
   * Test connection to a spreadsheet
   */
  public static async testConnection(spreadsheetIdInput?: string): Promise<{
    success: boolean;
    title?: string;
    sheets?: string[];
    spreadsheetUrl?: string;
    error?: string;
  }> {
    const id = this.extractSpreadsheetId(spreadsheetIdInput || (await this.getEffectiveSpreadsheetId()));
    if (!id) {
      return {
        success: false,
        error: 'No Google Spreadsheet ID provided. Please enter a valid Google Sheet URL or ID.',
      };
    }

    try {
      const sheets = await this.getSheetsClient();
      const res = await sheets.spreadsheets.get({ spreadsheetId: id });
      const title = res.data.properties?.title || 'Untitled Sheet';
      const sheetTitles = (res.data.sheets || []).map((s) => s.properties?.title || '');

      return {
        success: true,
        title,
        sheets: sheetTitles,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
      };
    } catch (err: any) {
      let friendlyMessage = err.message || 'Failed to connect to Google Sheets.';
      if (
        err.message?.includes('has not been used in project') ||
        err.message?.includes('disabled') ||
        err.message?.includes('SERVICE_DISABLED') ||
        err.message?.includes('accessNotConfigured')
      ) {
        friendlyMessage =
          'Google Sheets API is Disabled: Please enable the Google Sheets API in your Google Cloud Project: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=trending-studio (Click the blue "ENABLE" button, then retry).';
      } else if (err.code === 403 || err.message?.includes('The caller does not have permission')) {
        friendlyMessage = `Permission Denied: Please open your Google Sheet, click "Share", and grant "Editor" access to: ${this.getServiceAccountEmail()}`;
      } else if (err.code === 404 || err.message?.includes('Requested entity was not found')) {
        friendlyMessage = `Spreadsheet Not Found: Please verify that the Spreadsheet ID "${id}" is correct and the sheet exists.`;
      }
      return {
        success: false,
        error: friendlyMessage,
      };
    }
  }

  /**
   * Ensure standard sheets (Invoices, Products, Customers, Daily Summary) and headers exist
   */
  public static async ensureSheetStructure(spreadsheetIdInput?: string): Promise<void> {
    const id = this.extractSpreadsheetId(spreadsheetIdInput || (await this.getEffectiveSpreadsheetId()));
    if (!id) return;

    const sheets = await this.getSheetsClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId: id });
    const existingSheets = new Set((meta.data.sheets || []).map((s) => s.properties?.title || ''));

    const requiredSheets = ['Invoices', 'Products', 'Customers', 'Daily Summary'];
    const addSheetRequests: sheets_v4.Schema$Request[] = [];

    for (const title of requiredSheets) {
      if (!existingSheets.has(title)) {
        addSheetRequests.push({
          addSheet: {
            properties: {
              title,
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        });
      }
    }

    if (addSheetRequests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: id,
        requestBody: {
          requests: addSheetRequests,
        },
      });
    }

    // Set up standard headers for all tabs
    const invoiceHeaders = [
      'Invoice No',
      'Date & Time (IST)',
      'Customer Name',
      'Mobile',
      'GSTIN',
      'Items Summary',
      'Total Items',
      'Taxable Amt (₹)',
      'CGST (9%) (₹)',
      'SGST (9%) (₹)',
      'Total Tax (₹)',
      'Round Off (₹)',
      'Grand Total (₹)',
      'Paid Amt (₹)',
      'Balance Due (₹)',
      'Payment Method',
      'Status',
      'Branch',
      'Synced Timestamp',
    ];

    const productHeaders = [
      'SKU',
      'Barcode',
      'Product Name',
      'Category',
      'Selling Price (₹)',
      'GST Rate (%)',
      'Current Stock',
      'Min Stock Alert',
      'Stock Status',
      'HSN/SAC',
      'Last Updated',
    ];

    const customerHeaders = [
      'Customer Name',
      'Mobile',
      'WhatsApp',
      'City',
      'Address',
      'GSTIN',
      'Outstanding Due (₹)',
      'Loyalty Points',
      'Created Date',
    ];

    const summaryHeaders = [
      'Date (DD/MM/YYYY)',
      'Total Bills',
      'Gross Sales (₹)',
      'Taxable Total (₹)',
      'Total GST (₹)',
      'Cash Tendered (₹)',
      'UPI Tendered (₹)',
      'Card Tendered (₹)',
      'Last Synced At',
    ];

    await Promise.all([
      this.ensureHeaders(sheets, id, 'Invoices', invoiceHeaders),
      this.ensureHeaders(sheets, id, 'Products', productHeaders),
      this.ensureHeaders(sheets, id, 'Customers', customerHeaders),
      this.ensureHeaders(sheets, id, 'Daily Summary', summaryHeaders),
    ]);
  }

  /**
   * Helper to write headers if row 1 is empty
   */
  private static async ensureHeaders(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    sheetName: string,
    headers: string[]
  ): Promise<void> {
    try {
      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetName}'!A1:Z1`,
      });

      if (!existing.data.values || existing.data.values.length === 0 || existing.data.values[0].length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `'${sheetName}'!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [headers],
          },
        });
      }
    } catch (err) {
      console.warn(`[GoogleSheets] Header check warning for ${sheetName}:`, err);
    }
  }

  /**
   * Append a single invoice in real-time when created at POS
   */
  public static async appendInvoice(invoice: any): Promise<boolean> {
    try {
      const spreadsheetId = await this.getEffectiveSpreadsheetId();
      if (!spreadsheetId) {
        return false;
      }

      const settings: any = await BusinessSettingsModel.findOne();
      if (settings?.googleSheetsConfig?.enabled === false) {
        return false;
      }

      await this.ensureSheetStructure(spreadsheetId);
      const sheets = await this.getSheetsClient();

      const itemsSummary = (invoice.items || [])
        .map((it: any) => `${it.name} (${it.quantity}x @ ₹${it.unitPrice})`)
        .join('; ');

      const totalItems = (invoice.items || []).reduce((acc: number, it: any) => acc + (it.quantity || 1), 0);

      const paymentMethod =
        (invoice.payments && invoice.payments.length > 0)
          ? invoice.payments.map((p: any) => p.method).join(', ')
          : 'CASH';

      const row = [
        invoice.invoiceNumber,
        formatISTDateTime(invoice.createdAt || new Date().toISOString()),
        invoice.customerName || 'Walk-in Customer',
        invoice.customerMobile || 'N/A',
        invoice.customerGstin || 'N/A',
        itemsSummary,
        totalItems,
        invoice.taxableAmount || 0,
        invoice.cgstAmount || 0,
        invoice.sgstAmount || 0,
        invoice.totalTax || 0,
        invoice.roundOff || 0,
        invoice.grandTotal || 0,
        invoice.paidAmount || 0,
        invoice.balanceDue || 0,
        paymentMethod,
        invoice.paymentStatus || 'PAID',
        'Karaikudi Main',
        new Date().toISOString(),
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "'Invoices'!A:S",
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row],
        },
      });

      console.log(`[GoogleSheets] Appended invoice ${invoice.invoiceNumber} to spreadsheet ${spreadsheetId}`);
      return true;
    } catch (err: any) {
      console.error('[GoogleSheets] Failed to append invoice to Google Sheet:', err.message);
      return false;
    }
  }

  /**
   * Sync all data (Invoices, Products, Customers, Daily Summary) to Google Sheets
   */
  public static async syncAll(spreadsheetIdInput?: string): Promise<{
    success: boolean;
    invoicesCount: number;
    productsCount: number;
    customersCount: number;
    timestamp: string;
    spreadsheetUrl: string;
    error?: string;
  }> {
    const id = this.extractSpreadsheetId(spreadsheetIdInput || (await this.getEffectiveSpreadsheetId()));
    if (!id) {
      return {
        success: false,
        invoicesCount: 0,
        productsCount: 0,
        customersCount: 0,
        timestamp: new Date().toISOString(),
        spreadsheetUrl: '',
        error: 'No Google Spreadsheet ID configured. Please configure and test in Settings.',
      };
    }

    try {
      await this.ensureSheetStructure(id);
      const sheets = await this.getSheetsClient();

      // 1. Fetch all records from database
      const [invoices, products, customers] = await Promise.all([
        InvoiceModel.find({}).sort({ createdAt: -1 }),
        ProductModel.find({}).sort({ name: 1 }),
        CustomerModel.find({}).sort({ name: 1 }),
      ]);

      // 2. Format Invoices
      const invoiceHeaders = [
        'Invoice No',
        'Date & Time (IST)',
        'Customer Name',
        'Mobile',
        'GSTIN',
        'Items Summary',
        'Total Items',
        'Taxable Amt (₹)',
        'CGST (9%) (₹)',
        'SGST (9%) (₹)',
        'Total Tax (₹)',
        'Round Off (₹)',
        'Grand Total (₹)',
        'Paid Amt (₹)',
        'Balance Due (₹)',
        'Payment Method',
        'Status',
        'Branch',
        'Synced Timestamp',
      ];

      const invoiceRows = invoices.map((inv: any) => {
        const itemsSummary = (inv.items || [])
          .map((it: any) => `${it.name} (${it.quantity}x @ ₹${it.unitPrice})`)
          .join('; ');
        const totalItems = (inv.items || []).reduce((acc: number, it: any) => acc + (it.quantity || 1), 0);
        const paymentMethod =
          (inv.payments && inv.payments.length > 0)
            ? inv.payments.map((p: any) => p.method).join(', ')
            : 'CASH';

        return [
          inv.invoiceNumber,
          formatISTDateTime(inv.createdAt),
          inv.customerName || 'Walk-in Customer',
          inv.customerMobile || 'N/A',
          inv.customerGstin || 'N/A',
          itemsSummary,
          totalItems,
          inv.taxableAmount || 0,
          inv.cgstAmount || 0,
          inv.sgstAmount || 0,
          inv.totalTax || 0,
          inv.roundOff || 0,
          inv.grandTotal || 0,
          inv.paidAmount || 0,
          inv.balanceDue || 0,
          paymentMethod,
          inv.paymentStatus || 'PAID',
          'Karaikudi Main',
          new Date().toISOString(),
        ];
      });

      // 3. Format Products
      const productHeaders = [
        'SKU',
        'Barcode',
        'Product Name',
        'Category',
        'Selling Price (₹)',
        'GST Rate (%)',
        'Current Stock',
        'Min Stock Alert',
        'Stock Status',
        'HSN/SAC',
        'Last Updated',
      ];

      const productRows = products.map((p: any) => [
        p.sku,
        p.barcode || 'N/A',
        p.name,
        p.category || 'General',
        p.sellingPrice || 0,
        p.gstRate || 18,
        p.stock || 0,
        p.minStock || 5,
        (p.stock <= (p.minStock || 5)) ? 'LOW STOCK' : 'IN STOCK',
        p.hsnSac || '4911',
        formatISTDateTime(p.updatedAt || p.createdAt || new Date().toISOString()),
      ]);

      // 4. Format Customers
      const customerHeaders = [
        'Customer Name',
        'Mobile',
        'WhatsApp',
        'City',
        'Address',
        'GSTIN',
        'Outstanding Due (₹)',
        'Loyalty Points',
        'Created Date',
      ];

      const customerRows = customers.map((c: any) => [
        c.name,
        c.mobile,
        c.whatsapp || c.mobile,
        c.city || 'Karaikudi',
        c.address || '',
        c.gstin || 'N/A',
        c.outstandingBalance || 0,
        c.loyaltyPoints || 0,
        formatISTDateTime(c.createdAt || new Date().toISOString()),
      ]);

      // 5. Daily Summary Computation
      const summaryMap = new Map<string, { count: number; gross: number; taxable: number; tax: number; cash: number; upi: number; card: number }>();
      for (const inv of invoices as any[]) {
        const dateKey = new Date(inv.createdAt).toLocaleDateString('en-IN');
        const curr = summaryMap.get(dateKey) || { count: 0, gross: 0, taxable: 0, tax: 0, cash: 0, upi: 0, card: 0 };
        curr.count += 1;
        curr.gross += inv.grandTotal || 0;
        curr.taxable += inv.taxableAmount || 0;
        curr.tax += inv.totalTax || 0;

        for (const p of inv.payments || []) {
          if (p.method === 'CASH') curr.cash += p.amount || 0;
          else if (p.method === 'UPI') curr.upi += p.amount || 0;
          else if (p.method === 'CARD') curr.card += p.amount || 0;
        }

        summaryMap.set(dateKey, curr);
      }

      const summaryHeaders = [
        'Date (DD/MM/YYYY)',
        'Total Bills',
        'Gross Sales (₹)',
        'Taxable Total (₹)',
        'Total GST (₹)',
        'Cash Tendered (₹)',
        'UPI Tendered (₹)',
        'Card Tendered (₹)',
        'Last Synced At',
      ];

      const summaryRows = Array.from(summaryMap.entries()).map(([date, s]) => [
        date,
        s.count,
        s.gross,
        s.taxable,
        s.tax,
        s.cash,
        s.upi,
        s.card,
        new Date().toISOString(),
      ]);

      // 6. Overwrite sheets with clean data
      await Promise.all([
        sheets.spreadsheets.values.update({
          spreadsheetId: id,
          range: "'Invoices'!A1",
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [invoiceHeaders, ...invoiceRows] },
        }),
        sheets.spreadsheets.values.update({
          spreadsheetId: id,
          range: "'Products'!A1",
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [productHeaders, ...productRows] },
        }),
        sheets.spreadsheets.values.update({
          spreadsheetId: id,
          range: "'Customers'!A1",
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [customerHeaders, ...customerRows] },
        }),
        sheets.spreadsheets.values.update({
          spreadsheetId: id,
          range: "'Daily Summary'!A1",
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [summaryHeaders, ...summaryRows] },
        }),
      ]);

      // 7. Update last synced timestamp in business settings
      try {
        const settings: any = await BusinessSettingsModel.findOne();
        if (settings) {
          if (!settings.googleSheetsConfig) settings.googleSheetsConfig = {};
          settings.googleSheetsConfig.lastSyncedAt = new Date().toISOString();
          settings.googleSheetsConfig.spreadsheetId = id;
          settings.googleSheetsConfig.enabled = true;
          await settings.save();
        }
      } catch {}

      return {
        success: true,
        invoicesCount: invoices.length,
        productsCount: products.length,
        customersCount: customers.length,
        timestamp: new Date().toISOString(),
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
      };
    } catch (err: any) {
      console.error('[GoogleSheets] Full sync failed:', err);
      let friendlyMessage = err.message || 'Full sync failed.';
      if (
        err.message?.includes('has not been used in project') ||
        err.message?.includes('disabled') ||
        err.message?.includes('SERVICE_DISABLED') ||
        err.message?.includes('accessNotConfigured')
      ) {
        friendlyMessage =
          'Google Sheets API is Disabled: Please enable the Google Sheets API in your Google Cloud Project: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=trending-studio (Click the blue "ENABLE" button, then retry).';
      } else if (err.code === 403 || err.message?.includes('The caller does not have permission')) {
        friendlyMessage = `Permission Denied: Please share your Google Sheet with: ${this.getServiceAccountEmail()} with Editor permission.`;
      }
      return {
        success: false,
        invoicesCount: 0,
        productsCount: 0,
        customersCount: 0,
        timestamp: new Date().toISOString(),
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
        error: friendlyMessage,
      };
    }
  }
}
