import { Request, Response } from 'express';
import { OrderModel } from '../models';
import { OrderService } from '../services/orderService';
import { OrderStatus } from '@trending-studio/shared-types';

export class OrderController {
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const status = req.query.status as string;
      const search = req.query.search as string;
      const query: any = {};

      if (status) {
        query.status = status;
      }
      if (search) {
        query.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { customerName: { $regex: search, $options: 'i' } },
          { customerMobile: { $regex: search, $options: 'i' } },
        ];
      }

      const orders = await OrderModel.find(query).sort({ createdAt: -1 });
      res.status(200).json({ success: true, data: orders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const order = await OrderModel.findById(req.params.id);
      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }
      res.status(200).json({ success: true, data: order });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const order = await OrderService.createOrder(
        req.body,
        req.user?.id || 'system',
        req.user?.name || 'Staff'
      );
      res.status(201).json({ success: true, data: order });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async updateStage(req: Request, res: Response): Promise<void> {
    try {
      const { status, assignedTo, notes } = req.body;
      const order = await OrderService.updateStage(
        req.params.id as string,
        status as OrderStatus,
        assignedTo,
        notes,
        req.user?.id,
        req.user?.name
      );

      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      res.status(200).json({ success: true, data: order });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async uploadPhotos(req: Request, res: Response): Promise<void> {
    try {
      const { photoUrls } = req.body;
      const order = await OrderModel.findById(req.params.id);
      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }

      if (Array.isArray(photoUrls)) {
        order.photosUploaded.push(...photoUrls);
        await order.save();
      }

      res.status(200).json({
        success: true,
        message: 'Photos attached to order',
        data: order,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
