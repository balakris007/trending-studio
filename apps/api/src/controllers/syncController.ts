import { Request, Response } from 'express';
import { SyncService } from '../services/syncService';
import { SyncOperationModel } from '../models';

export class SyncController {
  public static async push(req: Request, res: Response): Promise<void> {
    try {
      const response = await SyncService.processSyncPush(
        req.body,
        req.user?.name || 'Sync User'
      );
      res.status(200).json(response);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async pull(req: Request, res: Response): Promise<void> {
    try {
      const response = await SyncService.processSyncPull(req.body);
      res.status(200).json(response);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async resolve(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, entityId, choice, clientPayload, manualPayload } = req.body;
      const resolved = await SyncService.resolveConflict(
        entityType,
        entityId,
        choice,
        clientPayload,
        manualPayload
      );
      res.status(200).json({ success: true, message: 'Conflict resolved', data: resolved });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async status(req: Request, res: Response): Promise<void> {
    try {
      const pendingCount = await SyncOperationModel.countDocuments({ status: 'PENDING' });
      const recentOps = await SyncOperationModel.find()
        .sort({ createdAt: -1 })
        .limit(20);

      res.status(200).json({
        success: true,
        data: {
          serverTime: new Date().toISOString(),
          pendingOperations: pendingCount,
          recentOperations: recentOps,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
