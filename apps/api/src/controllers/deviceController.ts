import { Request, Response } from 'express';
import { DeviceModel } from '../models';

export class DeviceController {
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const devices = await DeviceModel.find().sort({ lastActive: -1 });
      res.status(200).json({ success: true, data: devices });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId, deviceName, deviceModel, platform, appVersion } = req.body;
      let device = await DeviceModel.findOne({ deviceId });

      if (device) {
        device.deviceName = deviceName || device.deviceName;
        device.deviceModel = deviceModel || device.deviceModel;
        device.appVersion = appVersion || device.appVersion;
        device.lastActive = new Date();
        await device.save();
      } else {
        device = await DeviceModel.create({
          deviceId,
          deviceName,
          deviceModel,
          platform: platform || 'ANDROID',
          appVersion: appVersion || '1.0.0',
          branchId: req.user?.branchId,
          userId: req.user?.id,
          userName: req.user?.name,
          registeredAt: new Date(),
          lastActive: new Date(),
        });
      }

      res.status(200).json({ success: true, data: device });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async revoke(req: Request, res: Response): Promise<void> {
    try {
      const device = await DeviceModel.findById(req.params.id);
      if (!device) {
        res.status(404).json({ success: false, error: 'Device not found' });
        return;
      }

      device.isRevoked = true;
      await device.save();

      res.status(200).json({
        success: true,
        message: 'Device revoked. Mobile terminal is now locked.',
        data: device,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async unrevoke(req: Request, res: Response): Promise<void> {
    try {
      const device = await DeviceModel.findById(req.params.id);
      if (!device) {
        res.status(404).json({ success: false, error: 'Device not found' });
        return;
      }

      device.isRevoked = false;
      await device.save();

      res.status(200).json({
        success: true,
        message: 'Device unlocked. Terminal is now active.',
        data: device,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
