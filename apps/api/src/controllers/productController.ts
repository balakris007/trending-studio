import { Request, Response } from 'express';
import { ProductModel, InventoryTransactionModel } from '../models';
import { InventoryTransactionType, SyncStatus } from '@trending-studio/shared-types';

export class ProductController {
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const search = (req.query.search as string) || '';
      const barcode = (req.query.barcode as string) || '';
      const category = (req.query.category as string) || '';

      const query: any = { isActive: true };
      if (barcode) {
        query.barcode = barcode;
      } else if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
          { barcode: { $regex: search, $options: 'i' } },
        ];
      }
      if (category) {
        query.category = category;
      }

      const products = await ProductModel.find(query).sort({ name: 1 });
      res.status(200).json({ success: true, data: products });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const product = await ProductModel.findById(req.params.id);
      if (!product) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }
      res.status(200).json({ success: true, data: product });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const product = await ProductModel.create({
        ...req.body,
        syncStatus: SyncStatus.SYNCED,
        version: 1,
      });

      res.status(201).json({ success: true, data: product });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const product = await ProductModel.findById(req.params.id);
      if (!product) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      Object.assign(product, req.body);
      product.version = (product.version || 1) + 1;
      await product.save();

      res.status(200).json({ success: true, data: product });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async adjustStock(req: Request, res: Response): Promise<void> {
    try {
      const { quantityChange, type, notes } = req.body;
      const product = await ProductModel.findById(req.params.id);
      if (!product) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      const prevStock = product.stock;
      const newStock = prevStock + Number(quantityChange);
      product.stock = newStock;
      await product.save();

      await InventoryTransactionModel.create({
        productId: product._id,
        productName: product.name,
        branchId: req.user?.branchId,
        type: type || InventoryTransactionType.ADJUSTMENT,
        quantityChange: Number(quantityChange),
        previousStock: prevStock,
        newStock,
        notes,
        performedBy: req.user?.name || 'Staff',
      });

      res.status(200).json({
        success: true,
        message: 'Stock updated',
        data: { currentStock: newStock },
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
