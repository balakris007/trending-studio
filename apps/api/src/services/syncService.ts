import {
  SyncOperationModel,
  CustomerModel,
  ProductModel,
  OrderModel,
  InvoiceModel,
  PhotoPrintPriceModel,
  FramePriceModel,
  BusinessSettingsModel,
} from '../models';
import { InvoiceService } from './invoiceService';
import { OrderService } from './orderService';
import { detectSyncConflict, applyConflictResolution } from '@trending-studio/sync-engine';
import {
  ISyncPushRequest,
  ISyncPushResponse,
  ISyncPushResult,
  ISyncPullRequest,
  ISyncPullResponse,
  SyncOperationType,
  SyncStatus,
} from '@trending-studio/shared-types';

export class SyncService {
  /**
   * Process push operations batch from mobile device with idempotency checks
   */
  public static async processSyncPush(
    req: ISyncPushRequest,
    userName: string
  ): Promise<ISyncPushResponse> {
    const results: ISyncPushResult[] = [];

    for (const op of req.operations) {
      // 1. Idempotency Check: Have we already processed this operationId?
      const existingOp = await SyncOperationModel.findOne({
        operationId: op.operationId,
      });

      if (existingOp) {
        results.push({
          operationId: op.operationId,
          localId: op.localId,
          serverId: existingOp.serverId || op.localId,
          entity: op.entity,
          status: 'DUPLICATE_SKIPPED',
          serverVersion: existingOp.version,
        });
        continue;
      }

      try {
        let serverId = op.serverId || '';
        let assignedInvoiceNumber: string | undefined;
        let assignedOrderNumber: string | undefined;
        let serverVersion = 1;

        if (op.entity === 'customer') {
          if (op.operationType === SyncOperationType.CREATE) {
            const newCust = await CustomerModel.create({
              ...op.payload,
              localId: op.localId,
              syncStatus: SyncStatus.SYNCED,
              version: 1,
            });
            serverId = newCust._id.toString();
            serverVersion = newCust.version;
          } else if (op.operationType === SyncOperationType.UPDATE) {
            const existing = await CustomerModel.findOne({
              $or: [{ _id: op.serverId }, { localId: op.localId }],
            });
            const conflict = detectSyncConflict(op, existing);
            if (conflict.hasConflict && conflict.strategy === 'REQUIRE_MANUAL_RESOLUTION') {
              results.push({
                operationId: op.operationId,
                localId: op.localId,
                serverId: existing?._id.toString() || '',
                entity: op.entity,
                status: 'CONFLICT',
                serverVersion: existing?.version || 1,
                conflictDetails: {
                  reason: conflict.reason || 'Version conflict',
                  serverPayload: existing?.toObject(),
                },
              });
              continue;
            }

            if (existing) {
              const payloadToApply = conflict.mergedPayload || op.payload;
              Object.assign(existing, payloadToApply);
              existing.version = (existing.version || 1) + 1;
              await existing.save();
              serverId = existing._id.toString();
              serverVersion = existing.version;
            }
          }
        } else if (op.entity === 'invoice') {
          // Authoritatively process offline bill
          const invoice = await InvoiceService.createInvoice(
            {
              ...op.payload,
              localId: op.localId,
              deviceId: req.deviceId,
              branchId: req.branchId,
            },
            req.userId,
            userName
          );
          serverId = invoice._id.toString();
          assignedInvoiceNumber = invoice.invoiceNumber;
          serverVersion = invoice.version || 1;
        } else if (op.entity === 'order') {
          const order = await OrderService.createOrder(
            {
              ...op.payload,
              localId: op.localId,
              branchId: req.branchId,
            },
            req.userId,
            userName
          );
          serverId = order._id.toString();
          assignedOrderNumber = order.orderNumber;
          serverVersion = order.version || 1;
        }

        // Record operation in Sync log for audit and replay protection
        await SyncOperationModel.create({
          operationId: op.operationId,
          deviceId: req.deviceId,
          userId: req.userId,
          entity: op.entity,
          localId: op.localId,
          serverId,
          operationType: op.operationType,
          version: serverVersion,
          timestamp: new Date(op.timestamp),
          payload: op.payload,
          status: SyncStatus.SYNCED,
        });

        results.push({
          operationId: op.operationId,
          localId: op.localId,
          serverId,
          entity: op.entity,
          status: 'PROCESSED',
          assignedInvoiceNumber,
          assignedOrderNumber,
          serverVersion,
        });
      } catch (err: any) {
        console.error(`Failed to process sync op ${op.operationId}:`, err);
        results.push({
          operationId: op.operationId,
          localId: op.localId,
          serverId: '',
          entity: op.entity,
          status: 'REJECTED',
          serverVersion: 0,
          conflictDetails: {
            reason: err.message || 'Processing error',
            serverPayload: null,
          },
        });
      }
    }

    return {
      success: true,
      processedCount: results.filter((r) => r.status === 'PROCESSED').length,
      results,
      serverTime: new Date().toISOString(),
    };
  }

  /**
   * Process pull request: send delta of updated records since lastSyncedAt
   */
  public static async processSyncPull(
    req: ISyncPullRequest
  ): Promise<ISyncPullResponse> {
    const sinceDate = req.lastSyncedAt ? new Date(req.lastSyncedAt) : new Date(0);

    const [customers, products, photoPrintPrices, framePrices, orders, invoices, settings] =
      await Promise.all([
        CustomerModel.find({ updatedAt: { $gt: sinceDate } }).lean(),
        ProductModel.find({ updatedAt: { $gt: sinceDate } }).lean(),
        PhotoPrintPriceModel.find().lean(),
        FramePriceModel.find().lean(),
        OrderModel.find({ updatedAt: { $gt: sinceDate } }).limit(100).lean(),
        InvoiceModel.find({ updatedAt: { $gt: sinceDate } }).limit(100).lean(),
        BusinessSettingsModel.findOne().lean(),
      ]);

    return {
      success: true,
      serverTime: new Date().toISOString(),
      deltas: {
        customers: customers as any,
        products: products as any,
        photoPrintPrices: photoPrintPrices as any,
        framePrices: framePrices as any,
        orders: orders as any,
        invoices: invoices as any,
        settings: settings as any,
      },
    };
  }

  /**
   * Manually resolve a conflict from the web Admin Sync Center
   */
  public static async resolveConflict(
    entityType: string,
    entityId: string,
    choice: 'KEEP_LOCAL' | 'KEEP_SERVER' | 'MANUAL_MERGE',
    clientPayload: any,
    manualPayload?: any
  ): Promise<any> {
    let Model: any;
    if (entityType === 'customer') Model = CustomerModel;
    else if (entityType === 'product') Model = ProductModel;
    else throw new Error(`Manual conflict resolution unsupported for ${entityType}`);

    const serverDoc = await Model.findById(entityId);
    if (!serverDoc) throw new Error('Server document not found');

    const resolved = applyConflictResolution(
      choice,
      clientPayload,
      serverDoc.toObject(),
      manualPayload
    );

    Object.assign(serverDoc, resolved);
    await serverDoc.save();
    return serverDoc;
  }
}
