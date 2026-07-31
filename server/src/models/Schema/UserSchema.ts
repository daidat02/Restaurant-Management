import { Schema, model, Document, type ObjectId } from 'mongoose';

export type UserRole = 'customer' | 'staff' | 'manager' | 'admin' | 'super-admin';

export const USER_ROLES: UserRole[] = ['customer', 'staff', 'manager', 'admin', 'super-admin'];

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  password: string; // hashed
  role: UserRole;
  /** Danh sách nhà hàng mà user thuộc về (đa tenant). staff/manager = 1 phần tử, admin = nhiều, super-admin/customer = rỗng. */
  restaurantIds: Schema.Types.ObjectId[];
  /**
   * @deprecated Field cũ (1 nhà hàng). Giữ lại tạm để dữ liệu cũ chưa backfill và client legacy vẫn hoạt động.
   * Sẽ xoá sau khi migration (ticket 03) + client migrate sang restaurantIds (ticket 06).
   */
  restaurant?: Schema.Types.ObjectId;
  avatar?: string;
  address?: string;
  notificationEnabled?: boolean;
  isActive: boolean; 
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: ObjectId;
}

const UserSchema = new Schema<IUserDocument>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  phone: { type: String, trim: true, index: true, },
  password: { type: String, required: true },
  role: { type: String, enum: USER_ROLES, default: 'customer', required: true, index: true },
  restaurantIds: { type: [Schema.Types.ObjectId], ref: 'Restaurant', default: [], index: true },
  /**
   * @deprecated Xem IUser.restaurant
   */
  restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
  avatar: { type: String },
  address: { type: String },
  notificationEnabled: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

export const User = model<IUserDocument>('User', UserSchema);