import { Schema, model, Document, type Types } from 'mongoose';
import type { IUser } from './UserSchema.js';

export interface IRestaurantDocument extends IRestaurant {
  _id: Types.ObjectId;
}

export type RestaurantSubscription = 'trial' | 'active' | 'locked' | 'pending';

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
  /** Chủ sở hữu nhà hàng (role admin). */
  ownerId?: Types.ObjectId | string | IUser;
  /** Trạng thái thuê bao: trial (chỉ giữ enum, không dùng trong flow mới), active (free hoặc đã trả phí), locked (khoá thủ công/vi phạm), pending (chờ thanh toán khi mở chi nhánh mới). */
  subscription: RestaurantSubscription;
  /** Hạn dùng thử — không dùng trong flow mới (chi nhánh đầu vào thẳng free). */
  trialEndsAt?: Date;
  /** Hạn thanh toán hiện tại — chỉ có ở gói trả phí; hết hạn sẽ hạ về free. */
  paidUntil?: Date;
  /** Gói dịch vụ hiện tại của nhà hàng (key trong PricingConfig.plans) — dùng để so sánh khi gia hạn/chuyển gói. */
  currentPlanKey?: string;
  /** Gói được lên lịch hạ cấp (áp dụng cuối chu kỳ khi paidUntil hết hạn). */
  pendingPlanKey?: string;
  /** Chu kỳ (tháng) đã chọn khi lên lịch hạ cấp — dùng để tính paidUntil mới khi áp dụng. */
  pendingCycleMonths?: number;
  /** Thời điểm gửi email cảnh báo sắp hết hạn lần gần nhất — null = chưa gửi (dedupe, tái lập khi gia hạn). */
  expiringEmailSentAt?: Date;
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
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    subscription: {
      type: String,
      enum: ['trial', 'active', 'locked', 'pending'],
      default: 'trial',
      index: true,
    },
    trialEndsAt: { type: Date },
    paidUntil: { type: Date, index: true },
    currentPlanKey: { type: String, index: true },
    pendingPlanKey: { type: String, index: true },
    pendingCycleMonths: { type: Number },
    expiringEmailSentAt: { type: Date },
  },
  { timestamps: true },
);

export const Restaurant = model<IRestaurant>('Restaurant', RestaurantSchema);
