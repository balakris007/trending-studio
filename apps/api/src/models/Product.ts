import { IProduct, SyncStatus } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface IProductDocument extends Partial<IProduct> {
  _id: string;
  id: string;
  localId?: string;
  save(): Promise<this>;
}

export const ProductModel = createFirestoreModel<IProductDocument>('products');
