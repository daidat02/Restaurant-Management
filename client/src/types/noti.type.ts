import type { IUser } from './user.type';

export interface INotification {
  _id: string;
  user?: IUser;
  type: 'new_order' | 'orderUpdate' | 'tableStatus' | 'promotion' | 'system' | 'new_reservation';
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}
