import { Request, Response } from 'express';
import { InvoiceModel, PaymentModel, OrderModel, ProductModel } from '../models';
import { generateHsnSummary } from '@trending-studio/gst-engine';
import { round2 } from '@trending-studio/utils';

export class ReportController {
  public static async getDailySummary(req: Request, res: Response): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [invoicesToday, paymentsToday, ordersToday, lowStock] = await Promise.all([
        InvoiceModel.find({ createdAt: { $gte: today } }),
        PaymentModel.find({ createdAt: { $gte: today } }),
        OrderModel.find({ createdAt: { $gte: today } }),
        ProductModel.find({ $expr: { $lte: ['$stock', '$minStock'] } }),
      ]);

      let totalSales = 0;
      let totalTax = 0;
      let cashTotal = 0;
      let upiTotal = 0;
      let cardTotal = 0;

      for (const inv of invoicesToday) {
        totalSales += inv.grandTotal;
        totalTax += inv.totalTax;
      }

      for (const p of paymentsToday) {
        if (p.method === 'CASH') cashTotal += p.amount;
        else if (p.method === 'UPI') upiTotal += p.amount;
        else if (p.method === 'CARD') cardTotal += p.amount;
      }

      res.status(200).json({
        success: true,
        data: {
          todaySales: round2(totalSales),
          todayTax: round2(totalTax),
          todayInvoicesCount: invoicesToday.length,
          todayOrdersCount: ordersToday.length,
          cashCollected: round2(cashTotal),
          upiCollected: round2(upiTotal),
          cardCollected: round2(cardTotal),
          lowStockCount: lowStock.length,
          lowStockProducts: lowStock,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getGstReport(req: Request, res: Response): Promise<void> {
    try {
      const fromDate = req.query.from ? new Date(req.query.from as string) : new Date(0);
      const toDate = req.query.to ? new Date(req.query.to as string) : new Date();

      const invoices = await InvoiceModel.find({
        createdAt: { $gte: fromDate, $lte: toDate },
      });

      const allItems: any[] = [];
      let totalTaxable = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      for (const inv of invoices) {
        totalTaxable += inv.taxableAmount;
        totalCgst += inv.cgstAmount;
        totalSgst += inv.sgstAmount;
        totalIgst += inv.igstAmount;

        for (const it of inv.items) {
          allItems.push({
            hsnSac: it.hsnSac,
            taxableAmount: it.taxableAmount,
            gstRate: it.gstRate,
            cgstAmount: it.cgstAmount,
            sgstAmount: it.sgstAmount,
            igstAmount: it.igstAmount,
            totalAmount: it.totalAmount,
          });
        }
      }

      const hsnSummary = generateHsnSummary(allItems);

      res.status(200).json({
        success: true,
        data: {
          invoiceCount: invoices.length,
          totalTaxable: round2(totalTaxable),
          totalCgst: round2(totalCgst),
          totalSgst: round2(totalSgst),
          totalIgst: round2(totalIgst),
          totalTax: round2(totalCgst + totalSgst + totalIgst),
          hsnSummary,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
