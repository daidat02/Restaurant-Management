import type { IUser } from './user.type';

export interface IRestaurant {
  _id: string;
  name: string;
  email: string;
  address?: string;
  phone?: string;
  description?: string;
  managerId?: string | IUser;
  status?: 'active' | 'inactive';
  staffCount?: number;
  capacity?: number;
  operatingHours: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
