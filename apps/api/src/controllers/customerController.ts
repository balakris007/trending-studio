import { Request, Response } from 'express';
import { CustomerModel, CustomerLedgerModel } from '../models';
import { SyncStatus } from '@trending-studio/shared-types';

export class CustomerController {
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const search = (req.query.search as string) || '';
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '50', 10);

      const query: any = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { mobile: { $regex: search, $options: 'i' } },
          { gstin: { $regex: search, $options: 'i' } },
        ];
      }

      const total = await CustomerModel.countDocuments(query);
      const customers = await CustomerModel.find(query)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      res.status(200).json({
        success: true,
        data: customers,
        meta: { page, limit, total },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const customer = await CustomerModel.findById(req.params.id);
      if (!customer) {
        res.status(404).json({ success: false, error: 'Customer not found' });
        return;
      }
      res.status(200).json({ success: true, data: customer });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const existing = await CustomerModel.findOne({ mobile: req.body.mobile });
      if (existing) {
        // Return existing customer for smooth POS billing workflow
        res.status(200).json({
          success: true,
          message: 'Existing customer retrieved',
          data: existing,
        });
        return;
      }

      const customer = await CustomerModel.create({
        ...req.body,
        syncStatus: SyncStatus.SYNCED,
        version: 1,
      });

      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data: customer,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const customer = await CustomerModel.findById(req.params.id);
      if (!customer) {
        res.status(404).json({ success: false, error: 'Customer not found' });
        return;
      }

      Object.assign(customer, req.body);
      customer.version = (customer.version || 1) + 1;
      await customer.save();

      res.status(200).json({ success: true, data: customer });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async getLedger(req: Request, res: Response): Promise<void> {
    try {
      const ledger = await CustomerLedgerModel.find({ customerId: req.params.id })
        .sort({ transactionDate: -1 })
        .limit(100);

      res.status(200).json({ success: true, data: ledger });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
