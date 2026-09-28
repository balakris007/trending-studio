import { IInvoice } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface IInvoiceDocument extends Partial<IInvoice> {
  _id: string;
  id: string;
  localId?: string;
  orderId?: any;
  customerId?: any;
  branchId?: any;
  deviceId?: any;
  cancelledBy?: any;
  save(): Promise<this>;
}

export const InvoiceModel = createFirestoreModel<IInvoiceDocument>('invoices');
