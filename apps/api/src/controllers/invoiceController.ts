import { Request, Response } from 'express';
import { InvoiceModel, PaymentModel, CustomerLedgerModel, CustomerModel } from '../models';
import { InvoiceService } from '../services/invoiceService';
import { PaymentStatus, PaymentMethod } from '@trending-studio/shared-types';
import { logAudit } from '../middlewares/audit';

export class InvoiceController {
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '50', 10);
      const search = (req.query.search as string) || '';
      const status = req.query.status as string;

      const query: any = {};
      if (search) {
        query.$or = [
          { invoiceNumber: { $regex: search, $options: 'i' } },
          { customerName: { $regex: search, $options: 'i' } },
          { customerMobile: { $regex: search, $options: 'i' } },
        ];
      }
      if (status) {
        query.paymentStatus = status;
      }

      const total = await InvoiceModel.countDocuments(query);
      const invoices = await InvoiceModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      res.status(200).json({
        success: true,
        data: invoices,
        meta: { page, limit, total },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const invoice = await InvoiceModel.findById(req.params.id);
      if (!invoice) {
        res.status(404).json({ success: false, error: 'Invoice not found' });
        return;
      }
      res.status(200).json({ success: true, data: invoice });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const invoice = await InvoiceService.createInvoice(
        req.body,
        req.user?.id || 'system',
        req.user?.name || 'Staff'
      );

      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        data: invoice,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async recordPayment(req: Request, res: Response): Promise<void> {
    try {
      const { amount, method, referenceNumber, notes } = req.body;
      const invoice = await InvoiceModel.findById(req.params.id);
      if (!invoice) {
        res.status(404).json({ success: false, error: 'Invoice not found' });
        return;
      }

      const paidAmount = invoice.paidAmount + Number(amount);
      const balanceDue = Math.max(0, invoice.grandTotal - paidAmount);
      const paymentStatus = balanceDue === 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

      invoice.paidAmount = paidAmount;
      invoice.balanceDue = balanceDue;
      invoice.paymentStatus = paymentStatus;

      invoice.payments.push({
        id: `pay_${Date.now()}`,
        method: method || PaymentMethod.CASH,
        amount: Number(amount),
        referenceNumber,
        receivedAt: new Date().toISOString(),
        receivedBy: req.user?.name || 'Staff',
        notes,
      });

      await invoice.save();

      // Update customer ledger
      const customer = await CustomerModel.findById(invoice.customerId);
      if (customer) {
        customer.outstandingBalance = Math.max(0, customer.outstandingBalance - Number(amount));
        await customer.save();

        await CustomerLedgerModel.create({
          customerId: customer._id,
          transactionDate: new Date(),
          transactionType: 'PAYMENT',
          referenceId: invoice._id.toString(),
          referenceNumber: invoice.invoiceNumber,
          debit: 0,
          credit: Number(amount),
          balance: customer.outstandingBalance,
          notes: notes || `Payment against ${invoice.invoiceNumber}`,
        });
      }

      await PaymentModel.create({
        invoiceId: invoice._id,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        amount: Number(amount),
        method,
        referenceNumber,
        branchId: invoice.branchId,
        collectedBy: req.user?.id,
        collectedByName: req.user?.name || 'Staff',
        notes,
      });

      res.status(200).json({
        success: true,
        message: 'Payment recorded',
        data: invoice,
      });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async cancel(req: Request, res: Response): Promise<void> {
    try {
      const { reason } = req.body;
      const invoice = await InvoiceModel.findById(req.params.id);
      if (!invoice) {
        res.status(404).json({ success: false, error: 'Invoice not found' });
        return;
      }

      invoice.cancelledAt = new Date().toISOString();
      invoice.cancelledReason = reason || 'Cancelled by manager';
      invoice.cancelledBy = req.user?.id as any;
      await invoice.save();

      await logAudit({
        action: 'INVOICE_CANCELLED',
        module: 'BILLING',
        recordId: invoice._id.toString(),
        oldValue: { invoiceNumber: invoice.invoiceNumber },
        newValue: { cancelledReason: reason },
        userId: req.user?.id,
        userName: req.user?.name,
      });

      res.status(200).json({ success: true, message: 'Invoice cancelled', data: invoice });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
