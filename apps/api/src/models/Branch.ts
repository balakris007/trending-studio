import { IBranch } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface IBranchDocument extends Partial<IBranch> {
  _id: string;
  id: string;
  invoiceSequenceCounter?: number;
  save(): Promise<this>;
}

export const BranchModel = createFirestoreModel<IBranchDocument>('branches');
