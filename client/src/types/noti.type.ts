import type { IUser } from './user.type';

export interface INotification {
  _id: string;
  user?: IUser;
  /** Nhà hàng chủ thông báo. Với admin (gộp chuỗi) backend populate { _id, name }. */
  restaurant?: { _id: string; name?: string } | string;
  type:
    | 'new_order'
    | 'orderUpdate'
    | 'tableStatus'
    | 'promotion'
    | 'system'
    | 'new_reservation'
    | 'subscription'
    | 'call_staff'
    | 'payment_request';
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}
