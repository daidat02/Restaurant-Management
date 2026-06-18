import { Schema, model, Document, type Types } from 'mongoose';
import type { IUser } from './UserSchema.js';

export interface IRestaurantDocument extends IRestaurant {
  _id: Types.ObjectId;
}

export interface IRestaurant extends Document {
  name: string;
  email: string;
  address?: string;
  phone?: string;
  description?: string;
  managerId?: Types.ObjectId | string | IUser;
  status?: 'active' | 'inactive';
  staffCount?: number;
  capacity?: number;
  operatingHours: string;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RestaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true, trim: true, index: true },
    address: { type: String, trim: true },
    email: { type: String, trim: true },
    capacity: { type: Number, trim: true },
    operatingHours: { type: String, trim: true },
    phone: { type: String, trim: true },
    description: { type: String, trim: true },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    staffCount: { type: Number, default: 0 },
    logoUrl: { type: String, trim: true },
  },
  { timestamps: true },
);

export const Restaurant = model<IRestaurant>('Restaurant', RestaurantSchema);
