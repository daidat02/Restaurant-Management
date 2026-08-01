import { Schema, model, Document, type Types } from 'mongoose';
import type { IUser } from './UserSchema.js';

export interface IRestaurantDocument extends IRestaurant {
  _id: Types.ObjectId;
}

export type RestaurantSubscription = 'trial' | 'active' | 'locked';

export interface IRestaurant extends Document {
  name: string;
  email: string;
  address?: string;
  phone?: string;
  description?: string;
  managerId?: Types.ObjectId | string | IUser;
  status?: 'active' | 'inactive';
  /** @deprecated Sẽ xoá ở ticket 10 — thay bằng `subscription`. */
  plan?: 'free' | 'pro';
  staffCount?: number;
  capacity?: number;
  operatingHours: string;
  logoUrl?: string;
  /** Chủ sở hữu nhà hàng (role admin). */
  ownerId?: Types.ObjectId | string | IUser;
  /** Trạng thái thuê bao: trial (nhà hàng đầu), active (đã trả phí), locked (hết hạn). */
  subscription: RestaurantSubscription;
  /** Hạn dùng thử (chỉ nhà hàng đầu tiên của chủ). */
  trialEndsAt?: Date;
  /** Hạn thanh toán hiện tại — quá hạn là locked. */
  paidUntil?: Date;
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
    /** @deprecated Sẽ xoá ở ticket 10 — thay bằng `subscription`. */
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
    staffCount: { type: Number, default: 0 },
    logoUrl: { type: String, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    subscription: {
      type: String,
      enum: ['trial', 'active', 'locked'],
      default: 'trial',
      index: true,
    },
    trialEndsAt: { type: Date },
    paidUntil: { type: Date, index: true },
  },
  { timestamps: true },
);

export const Restaurant = model<IRestaurant>('Restaurant', RestaurantSchema);
