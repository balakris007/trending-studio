import { Role, Permission, IUser } from '@trending-studio/shared-types';
import { createFirestoreModel } from '../database/firestoreModel';

export interface IUserDocument extends Omit<IUser, '_id' | 'id'> {
  _id: string;
  id: string;
  password?: string;
  refreshTokens: string[];
  comparePassword(candidatePassword: string): Promise<boolean>;
  save(): Promise<this>;
}

export const UserModel = createFirestoreModel<IUserDocument>('users');
