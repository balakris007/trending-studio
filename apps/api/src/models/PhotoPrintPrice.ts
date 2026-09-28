import { IPhotoPrintSizePrice } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface IPhotoPrintPriceDocument extends Partial<IPhotoPrintSizePrice> {
  _id: string;
  id: string;
  save(): Promise<this>;
}

export const PhotoPrintPriceModel = createFirestoreModel<IPhotoPrintPriceDocument>('photo_print_prices');
