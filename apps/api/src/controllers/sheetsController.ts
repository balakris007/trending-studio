import { Request, Response } from 'express';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { BusinessSettingsModel } from '../models';

export class SheetsController {
  /**
   * Get Google Sheets status and service account email
   */
  public static async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const settings: any = await BusinessSettingsModel.findOne();
      const spreadsheetId = await GoogleSheetsService.getEffectiveSpreadsheetId();
      const serviceAccountEmail = GoogleSheetsService.getServiceAccountEmail();

      const configured = Boolean(spreadsheetId);
      const enabled = settings?.googleSheetsConfig?.enabled ?? true;
      const lastSyncedAt = settings?.googleSheetsConfig?.lastSyncedAt || null;

      res.json({
        success: true,
        data: {
          configured,
          enabled,
          spreadsheetId,
          sheetUrl: spreadsheetId ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit` : null,
          serviceAccountEmail,
          lastSyncedAt,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Test connection to a spreadsheet ID or URL
   */
  public static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { spreadsheetId } = req.body;
      const result = await GoogleSheetsService.testConnection(spreadsheetId);

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Save Google Sheets configuration
   */
  public static async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { spreadsheetId, enabled } = req.body;
      const cleanId = GoogleSheetsService.extractSpreadsheetId(spreadsheetId);

      if (!cleanId && enabled) {
        res.status(400).json({ success: false, error: 'Please enter a valid Google Spreadsheet ID or URL.' });
        return;
      }

      // If providing an ID, test connection first
      if (cleanId) {
        const test = await GoogleSheetsService.testConnection(cleanId);
        if (!test.success) {
          res.status(400).json({ success: false, error: test.error });
          return;
        }

        // Auto-provision tabs and headers
        await GoogleSheetsService.ensureSheetStructure(cleanId);
      }

      let settings: any = await BusinessSettingsModel.findOne();
      if (!settings) {
        settings = new BusinessSettingsModel({
          businessName: 'Trending Studio',
        });
      }

      if (!settings.googleSheetsConfig) {
        settings.googleSheetsConfig = {};
      }

      settings.googleSheetsConfig.spreadsheetId = cleanId;
      settings.googleSheetsConfig.enabled = enabled !== false;
      await settings.save();

      res.json({
        success: true,
        data: {
          configured: Boolean(cleanId),
          enabled: settings.googleSheetsConfig.enabled,
          spreadsheetId: cleanId,
          sheetUrl: cleanId ? `https://docs.google.com/spreadsheets/d/${cleanId}/edit` : null,
          serviceAccountEmail: GoogleSheetsService.getServiceAccountEmail(),
          lastSyncedAt: settings.googleSheetsConfig.lastSyncedAt || null,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Trigger full synchronization of all collections to Google Sheets
   */
  public static async syncAll(req: Request, res: Response): Promise<void> {
    try {
      const { spreadsheetId } = req.body;
      const result = await GoogleSheetsService.syncAll(spreadsheetId);

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Format & Initialize sheet structure (Invoices, Products, Customers, Daily Summary)
   */
  public static async initStructure(req: Request, res: Response): Promise<void> {
    try {
      const { spreadsheetId } = req.body;
      const cleanId = GoogleSheetsService.extractSpreadsheetId(spreadsheetId);
      await GoogleSheetsService.ensureSheetStructure(cleanId);
      res.json({ success: true, message: 'Google Sheets tables and headers initialized successfully!' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
