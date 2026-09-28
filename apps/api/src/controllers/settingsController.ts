import { Request, Response } from 'express';
import { BusinessSettingsModel } from '../models';

export class SettingsController {
  public static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      let settings = await BusinessSettingsModel.findOne();
      if (!settings) {
        settings = await BusinessSettingsModel.create({});
      }
      res.status(200).json({ success: true, data: settings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      let settings = await BusinessSettingsModel.findOne();
      if (!settings) {
        settings = new BusinessSettingsModel(req.body);
      } else {
        Object.assign(settings, req.body);
      }
      await settings.save();
      res.status(200).json({ success: true, message: 'Settings updated', data: settings });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
