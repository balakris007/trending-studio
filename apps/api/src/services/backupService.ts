import fs from 'fs';
import path from 'path';
import {
  CustomerModel,
  ProductModel,
  InvoiceModel,
  OrderModel,
  PaymentModel,
  BusinessSettingsModel,
  PhotoPrintPriceModel,
  FramePriceModel,
  FrameTypeModel,
  BranchModel,
  AuditLogModel,
} from '../models';

export interface BackupMetadata {
  id: string;
  filename: string;
  createdAt: string;
  sizeBytes: number;
  recordCounts: Record<string, number>;
}

export class BackupService {
  private static backupDir = path.resolve('./backups');

  private static ensureDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a full JSON backup snapshot of all business data
   */
  public static async createBackup(): Promise<BackupMetadata> {
    this.ensureDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-trending-studio-${timestamp}.json`;
    const filePath = path.join(this.backupDir, filename);

    const [
      customers,
      products,
      invoices,
      orders,
      payments,
      settings,
      photoPrices,
      framePrices,
      frameTypes,
      branches,
      auditLogs,
    ] = await Promise.all([
      CustomerModel.find().lean(),
      ProductModel.find().lean(),
      InvoiceModel.find().lean(),
      OrderModel.find().lean(),
      PaymentModel.find().lean(),
      BusinessSettingsModel.find().lean(),
      PhotoPrintPriceModel.find().lean(),
      FramePriceModel.find().lean(),
      FrameTypeModel.find().lean(),
      BranchModel.find().lean(),
      AuditLogModel.find().lean(),
    ]);

    const backupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      business: 'Trending Studio',
      collections: {
        customers,
        products,
        invoices,
        orders,
        payments,
        settings,
        photoPrices,
        framePrices,
        frameTypes,
        branches,
        auditLogs,
      },
    };

    const content = JSON.stringify(backupData, null, 2);
    fs.writeFileSync(filePath, content, 'utf8');
    const stats = fs.statSync(filePath);

    return {
      id: filename,
      filename,
      createdAt: new Date().toISOString(),
      sizeBytes: stats.size,
      recordCounts: {
        customers: customers.length,
        products: products.length,
        invoices: invoices.length,
        orders: orders.length,
        payments: payments.length,
      },
    };
  }

  /**
   * List available backups
   */
  public static listBackups(): BackupMetadata[] {
    this.ensureDir();
    const files = fs.readdirSync(this.backupDir).filter((f) => f.endsWith('.json'));

    return files.map((f) => {
      const p = path.join(this.backupDir, f);
      const stats = fs.statSync(p);
      return {
        id: f,
        filename: f,
        createdAt: stats.birthtime.toISOString(),
        sizeBytes: stats.size,
        recordCounts: {},
      };
    });
  }

  /**
   * Restore a backup file
   */
  public static async restoreBackup(filename: string): Promise<boolean> {
    const filePath = path.join(this.backupDir, filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file ${filename} does not exist`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const cols = data.collections;

    if (cols.settings && cols.settings.length > 0) {
      await BusinessSettingsModel.deleteMany({});
      await BusinessSettingsModel.insertMany(cols.settings);
    }
    if (cols.photoPrices && cols.photoPrices.length > 0) {
      await PhotoPrintPriceModel.deleteMany({});
      await PhotoPrintPriceModel.insertMany(cols.photoPrices);
    }
    if (cols.framePrices && cols.framePrices.length > 0) {
      await FramePriceModel.deleteMany({});
      await FramePriceModel.insertMany(cols.framePrices);
    }

    return true;
  }
}
