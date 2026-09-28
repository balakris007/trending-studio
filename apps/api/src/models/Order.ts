import { IOrder } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface IOrderDocument extends Partial<IOrder> {
  _id: string;
  id: string;
  localId?: string;
  customerId?: any;
  branchId?: any;
  assignedStaffId?: any;
  invoiceId?: any;
  save(): Promise<this>;
}

export const OrderModel = createFirestoreModel<IOrderDocument>('orders');
