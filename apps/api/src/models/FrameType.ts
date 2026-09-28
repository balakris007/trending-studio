import { IFrameType } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface IFrameTypeDocument extends Partial<IFrameType> {
  _id: string;
  id: string;
  save(): Promise<this>;
}

export const FrameTypeModel = createFirestoreModel<IFrameTypeDocument>('frame_types');
