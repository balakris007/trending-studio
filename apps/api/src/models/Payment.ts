import { PaymentMethod } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface IPaymentDocument {
  _id: string;
  id: string;
  localId?: string;
  invoiceId?: any;
  orderId?: any;
  customerId: any;
  customerName: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  branchId: any;
  deviceId?: any;
  collectedBy: any;
  collectedByName: string;
  notes?: string;
  createdAt?: any;
  save(): Promise<this>;
}

export const PaymentModel = createFirestoreModel<IPaymentDocument>('payments');
