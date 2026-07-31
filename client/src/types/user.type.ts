import type { IRestaurant } from "./restaurant.type";

export type UserCredentials = {
    email: string;
    password: string;
};

export type UserRole = 'customer' | 'staff' | 'manager' | 'admin' | 'super-admin';

export type RegisterCredentials = {
    email: string;
    password: string;
    name: string;
    address?: string;
    phone?: string;
    role?: UserRole;
    restaurant?: string;
    restaurantIds?: string[];
};
export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  /** Danh sách nhà hàng mà user thuộc về (đa tenant). */
  restaurantIds?: (IRestaurant | string)[];
  /**
   * @deprecated Field compat cho client legacy (ticket 06 sẽ xoá, chuyển hẳn sang restaurantIds).
   */
  restaurant?: IRestaurant | string ;
  avatar?: string;
  address?: string;
  notificationEnabled?: boolean;
  isActive: boolean; 
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}