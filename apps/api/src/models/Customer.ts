import { CustomerType, SyncStatus, ICustomer } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface ICustomerDocument extends Partial<ICustomer> {
  _id: string;
  id: string;
  localId?: string;
  save(): Promise<this>;
}

export const CustomerModel = createFirestoreModel<ICustomerDocument>('customers');
