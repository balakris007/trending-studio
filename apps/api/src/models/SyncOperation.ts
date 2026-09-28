import { ISyncOperation } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface ISyncOperationDocument extends Partial<ISyncOperation> {
  _id: string;
  id: string;
  operationId: string;
  userId: any;
  save(): Promise<this>;
}

export const SyncOperationModel = createFirestoreModel<ISyncOperationDocument>('sync_operations');
