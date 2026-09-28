import { OrderModel, IOrderDocument, BranchModel, BusinessSettingsModel } from '../models';
import { IOrder, OrderStatus, SyncStatus } from '@trending-studio/shared-types';
import { formatOrderNumber } from '@trending-studio/utils';
import { logAudit } from '../middlewares/audit';

export class OrderService {
  /**
   * Allocate official order number
   */
  public static async getNextOrderNumber(): Promise<string> {
    const settings = await BusinessSettingsModel.findOne();
    const financialYear = settings?.financialYear || '26-27';
    const count = await OrderModel.countDocuments();
    return formatOrderNumber(financialYear, count + 1);
  }

  /**
   * Create studio custom order
   */
  public static async createOrder(
    orderData: Partial<IOrder>,
    userId: string,
    userName: string
  ): Promise<IOrderDocument> {
    let branch = orderData.branchId
      ? await BranchModel.findById(orderData.branchId)
      : await BranchModel.findOne({ isMainBranch: true });

    if (!branch) {
      branch = await BranchModel.create({
        name: 'Trending Studio — Karaikudi Main',
        code: 'KKDI-01',
        phone: '+91-79040-64446',
        address: 'No:1, Meyyappan Ambalam Complex, Karaikudi - 630001',
        isMainBranch: true,
      });
    }

    const branchId = branch._id.toString();
    const orderNumber = await this.getNextOrderNumber();

    const order = new OrderModel({
      ...orderData,
      orderNumber,
      branchId,
      status: orderData.advancePaid && orderData.advancePaid > 0 ? OrderStatus.ADVANCE_PAID : OrderStatus.CONFIRMED,
      balanceDue: (orderData.grandTotal || 0) - (orderData.advancePaid || 0),
      syncStatus: SyncStatus.SYNCED,
      version: 1,
    });

    await order.save();

    await logAudit({
      action: 'ORDER_CREATED',
      module: 'STUDIO',
      recordId: order._id.toString(),
      newValue: { orderNumber, status: order.status, grandTotal: order.grandTotal },
      userId,
      userName,
    });

    return order;
  }

  /**
   * Transition order stage in Studio Production Kanban
   */
  public static async updateStage(
    orderId: string,
    newStatus: OrderStatus,
    assignedStaffId?: string,
    notes?: string,
    userId?: string,
    userName?: string
  ): Promise<IOrderDocument | null> {
    const order = await OrderModel.findById(orderId);
    if (!order) return null;

    const oldStatus = order.status;
    order.status = newStatus;
    if (assignedStaffId) {
      order.assignedStaffId = assignedStaffId as any;
    }
    order.version = (order.version || 1) + 1;
    await order.save();

    await logAudit({
      action: 'ORDER_STAGE_CHANGED',
      module: 'STUDIO',
      recordId: order._id.toString(),
      oldValue: { status: oldStatus },
      newValue: { status: newStatus, notes },
      userId,
      userName,
    });

    return order;
  }
}
