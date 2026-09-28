import { Request, Response } from 'express';
import { FrameTypeModel, FramePriceModel } from '../models';
import { calculateCustomFramePrice } from '@trending-studio/pricing-engine';

export class FramePriceController {
  public static async listTypes(req: Request, res: Response): Promise<void> {
    try {
      const types = await FrameTypeModel.find({ isActive: true });
      res.status(200).json({ success: true, data: types });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async listPrices(req: Request, res: Response): Promise<void> {
    try {
      const prices = await FramePriceModel.find({ isActive: true }).populate('frameTypeId');
      res.status(200).json({ success: true, data: prices });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async calculate(req: Request, res: Response): Promise<void> {
    try {
      const {
        widthInches,
        heightInches,
        frameTypeId,
        hasGlass,
        glassType,
        hasMount,
        mountBorderInches,
      } = req.body;

      const frameType = frameTypeId ? await FrameTypeModel.findById(frameTypeId) : null;

      const calculation = calculateCustomFramePrice({
        widthInches: Number(widthInches),
        heightInches: Number(heightInches),
        frameType: frameType ? (frameType.toObject() as any) : undefined,
        hasGlass,
        glassType,
        hasMount,
        mountBorderInches: Number(mountBorderInches),
      });

      res.status(200).json({ success: true, data: calculation });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
