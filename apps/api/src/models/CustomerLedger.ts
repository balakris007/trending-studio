import { ICustomerLedger } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface ICustomerLedgerDocument extends Partial<ICustomerLedger> {
  _id: string;
  id: string;
  customerId: string;
  transactionDate?: any;
  save(): Promise<this>;
}

export const CustomerLedgerModel = createFirestoreModel<ICustomerLedgerDocument>('customer_ledgers');
