import { Request, Response } from 'express';
import { BackupService } from '../services/backupService';

export class BackupController {
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const backup = await BackupService.createBackup();
      res.status(201).json({
        success: true,
        message: 'Backup snapshot created successfully',
        data: backup,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const backups = BackupService.listBackups();
      res.status(200).json({ success: true, data: backups });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async restore(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.body;
      await BackupService.restoreBackup(filename);
      res.status(200).json({ success: true, message: 'Data restored successfully' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
