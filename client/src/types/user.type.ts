import type { IRestaurant } from "./restaurant.type";

export type UserCredentials = {
    email: string;
    password: string;
};

export type RegisterCredentials = {
    email: string;
    password: string;
    name: string;
    address?: string;
    phone?: string;
    role?: 'customer' | 'staff' | 'manager' | 'admin';
    restaurant?: string;
};
export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'staff' | 'manager' | 'admin';
  restaurant?: IRestaurant | string ;
  isActive: boolean; 
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}