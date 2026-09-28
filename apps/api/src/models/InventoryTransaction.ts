import { IInventoryTransaction } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface IInventoryTransactionDocument extends Partial<IInventoryTransaction> {
  _id: string;
  id: string;
  productId: any;
  branchId: any;
  save(): Promise<this>;
}

export const InventoryTransactionModel = createFirestoreModel<IInventoryTransactionDocument>('inventory_transactions');
