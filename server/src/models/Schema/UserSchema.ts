import { Schema, model, Document, type ObjectId } from 'mongoose';

export type UserRole = 'customer' | 'staff' | 'manager' | 'admin' | 'super-admin';
export type UserGender = 'male' | 'female' | 'other';

export const USER_ROLES: UserRole[] = ['customer', 'staff', 'manager', 'admin', 'super-admin'];
export const USER_GENDERS: UserGender[] = ['male', 'female', 'other'];

/** Bậc khách hàng thân thiết (mặc định bronze). */
export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

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

  // ---------- HR NHÂN SỰ ----------
  /** Mã nhân viên (hiển thị trên bảng, xuất file, chấm công). */
  employeeCode?: string;
  /** Chức danh / vị trí công việc (vd: Bếp trưởng, Phục vụ, Thu ngân...). */
  position?: string;
  gender?: UserGender;
  birthday?: Date;
  /** Số CCCD/CMND — phục vụ hợp đồng, bảo hiểm. */
  nationalId?: string;
  /** Ngày bắt đầu làm việc. */
  hireDate?: Date;
  /** Lương cơ bản (VND). */
  baseSalary?: number;
  /** Người liên hệ khẩn cấp. */
  emergencyContact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };

  // ---------- CRM KHÁCH HÀNG ----------
  /** Điểm tích luỹ của khách hàng. */
  loyaltyPoints: number;
  /** Bậc thành viên: bronze/silver/gold/platinum. */
  loyaltyTier: LoyaltyTier;
  /** Tổng chi tiêu tích luỹ (VND). */
  totalSpent: number;
  /** Sở thích cá nhân (món yêu thích, dị ứng, ghi chú). */
  preferences?: {
    favoriteItems?: string[];
    allergies?: string[];
    notes?: string;
  };
  /** Danh sách địa chỉ giao hàng lưu sẵn. */
  defaultAddresses?: Array<{
    label?: string;
    address: string;
    phone?: string;
    isDefault?: boolean;
  }>;

  // ---------- ĐA TENANT ----------
  /** Nhà hàng chính (thay cho suy luận restaurantIds[0]). */
  primaryRestaurantId?: Schema.Types.ObjectId;
  /**
   * Vai trò theo từng nhà hàng (1 user có thể là manager chi nhánh A, staff chi nhánh B).
   * Field bổ sung — quyền hiện tại vẫn dùng `role` global, chưa đổi cơ chế verify.
   */
  restaurantRoles?: Array<{
    restaurantId: Schema.Types.ObjectId;
    role: UserRole;
    joinedAt: Date;
  }>;

  // ---------- BẢO MẬT / XÁC THỰC ----------
  /** Thời điểm đổi mật khẩu gần nhất — dùng để vô hiệu token cũ. */
  passwordChangedAt?: Date;
  /** Lần đăng nhập thành công gần nhất. */
  lastLoginAt?: Date;
  /** Số lần đăng nhập sai liên tiếp. */
  loginAttempts: number;
  /** Khóa đăng nhập tạm thời khi nhập sai quá nhiều lần. */
  lockUntil?: Date;
  emailVerified: boolean;
  emailVerifiedAt?: Date;
  /** Mã OTP xác thực email khi đăng ký (6 chữ số). */
  emailOtp?: string;
  /** Hết hạn của OTP hiện tại (TTL 10 phút). */
  emailOtpExpires?: Date;
  /** Lần gửi OTP gần nhất — chặn spam resend (cooldown 60s). */
  emailOtpSentAt?: Date;
  /** Số lần nhập sai OTP liên tiếp (tối đa 5 — quá thì OTP vô hiệu). */
  emailOtpAttempts: number;
  phoneVerified: boolean;
  /** Tăng mỗi khi đổi mật khẩu/đăng xuất toàn bộ — revoke token cũ. */
  tokenVersion: number;
  /** Soft-delete: user đã xóa vẫn giữ lịch sử order/reservation. */
  deletedAt?: Date;

  // ---------- PUSH NOTIFICATION ----------
  /** Token thiết bị (FCM) để đẩy thông báo khi app không mở. */
  deviceTokens?: string[];

  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: ObjectId;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    phone: { type: String, trim: true, index: true },
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

    // ---------- HR NHÂN SỰ ----------
    employeeCode: { type: String, trim: true, index: true },
    position: { type: String, trim: true },
    gender: { type: String, enum: USER_GENDERS },
    birthday: { type: Date },
    nationalId: { type: String, trim: true },
    hireDate: { type: Date },
    baseSalary: { type: Number, min: 0 },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      relation: { type: String, trim: true },
    },

    // ---------- CRM KHÁCH HÀNG ----------
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    loyaltyTier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
    totalSpent: { type: Number, default: 0, min: 0 },
    preferences: {
      favoriteItems: { type: [String], default: [] },
      allergies: { type: [String], default: [] },
      notes: { type: String, trim: true },
    },
    defaultAddresses: [
      {
        label: { type: String, trim: true },
        address: { type: String, trim: true },
        phone: { type: String, trim: true },
        isDefault: { type: Boolean, default: false },
      },
    ],

    // ---------- ĐA TENANT ----------
    primaryRestaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', index: true },
    restaurantRoles: [
      {
        restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant' },
        role: { type: String, enum: USER_ROLES },
        joinedAt: { type: Date, default: Date.now },
      },
    ],

    // ---------- BẢO MẬT / XÁC THỰC ----------
    passwordChangedAt: { type: Date },
    lastLoginAt: { type: Date },
    loginAttempts: { type: Number, default: 0, min: 0 },
    lockUntil: { type: Date },
    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },
    emailOtp: { type: String },
    emailOtpExpires: { type: Date },
    emailOtpSentAt: { type: Date },
    emailOtpAttempts: { type: Number, default: 0, min: 0 },
    phoneVerified: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0, min: 0 },
    deletedAt: { type: Date, default: null },

    // ---------- PUSH NOTIFICATION ----------
    deviceTokens: { type: [String], default: [] },

    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true },
);

// Index hỗ trợ tìm kiếm nhân sự & lọc theo tenant
UserSchema.index({ role: 1, restaurantIds: 1, deletedAt: 1 });
UserSchema.index({ email: 1, deletedAt: 1 });

export const User = model<IUserDocument>('User', UserSchema);
