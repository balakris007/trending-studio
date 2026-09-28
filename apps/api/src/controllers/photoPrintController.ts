import { Request, Response } from 'express';
import { PhotoPrintPriceModel } from '../models';
import { calculatePhotoPrintPrice } from '@trending-studio/pricing-engine';

export class PhotoPrintController {
  public static async getPricing(req: Request, res: Response): Promise<void> {
    try {
      const prices = await PhotoPrintPriceModel.find({ isActive: true }).sort({ widthInches: 1 });
      res.status(200).json({ success: true, data: prices });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updatePricing(req: Request, res: Response): Promise<void> {
    try {
      const { size, basePrice, isActive } = req.body;
      const updated = await PhotoPrintPriceModel.findOneAndUpdate(
        { size: size.toUpperCase() },
        { basePrice, isActive },
        { new: true, upsert: true }
      );
      res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async calculate(req: Request, res: Response): Promise<void> {
    try {
      const { size, quantity, paperFinish, lamination, customBasePrice } = req.body;
      const catalog = await PhotoPrintPriceModel.find({ isActive: true });

      const calculation = calculatePhotoPrintPrice({
        size,
        quantity: Number(quantity) || 1,
        paperFinish,
        lamination,
        customBasePrice,
        priceCatalog: catalog.map((c: any) => ({
          id: c._id.toString(),
          size: c.size,
          widthInches: c.widthInches,
          heightInches: c.heightInches,
          basePrice: c.basePrice,
          isActive: c.isActive,
        })),
      });

      res.status(200).json({ success: true, data: calculation });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
