import { Schema, model, Document, type Types } from 'mongoose';

/** Chu kỳ thanh toán → số tiền (VND). */
export interface IPricingCycles {
  1: number;
  3: number;
  6: number;
  12: number;
}

/** Giới hạn theo gói cho từng nhà hàng trong gói. 0 = không giới hạn.
 *  Lưu ý: mô hình trả phí theo từng chi nhánh nên không có giới hạn chi nhánh trong gói. */
export interface IPlanLimits {
  tables: number;
  items: number;
  staff: number;
}

/** Một gói dịch vụ (plan) hiển thị trên trang thanh toán. */
export interface IPlan {
  key: string;
  name: string;
  description: string;
  /** Nhãn badge nổi bật (vd: 'PHỔ BIẾN NHẤT'), rỗng nếu không có. */
  badge: string;
  isPopular: boolean;
  isActive: boolean;
  /** Gói "Liên hệ" (may đo) — không có giá công khai. */
  contactOnly: boolean;
  /** Giá niêm yết theo tháng (VND), dùng để hiển thị "xx₫/tháng". */
  priceMonthly: number;
  /** Giá tổng theo từng chu kỳ (VND). 0 nếu contactOnly. */
  cycles: IPricingCycles;
  /** Điểm nổi bật / tính năng hiển thị trên card gói. */
  features: string[];
  limits: IPlanLimits;
  sortOrder: number;
}

export interface IPricingConfig extends Document {
  key: string;
  cycles: IPricingCycles;
  currency: string;
  plans: IPlan[];
  updatedAt: Date;
}

export interface IPricingConfigDocument extends IPricingConfig {
  _id: Types.ObjectId;
}

export const DEFAULT_PRICING_CYCLES: IPricingCycles = {
  1: 299000,
  3: 849000,
  6: 1590000,
  12: 2990000,
};

/** Các gói mặc định khi chưa được super-admin cấu hình. */
export const DEFAULT_PLANS: IPlan[] = [
  {
    key: 'basic',
    name: 'Cơ bản',
    description: 'Dành cho quán nhỏ, lượng khách ổn định.',
    badge: '',
    isPopular: false,
    isActive: true,
    contactOnly: false,
    priceMonthly: 290000,
    cycles: { 1: 290000, 3: 810000, 6: 1500000, 12: 2790000 },
    features: [
      '20 bàn + 100 món',
      '5 tài khoản nhân viên',
      'Báo cáo cơ bản',
    ],
    limits: { tables: 20, items: 100, staff: 5 },
    sortOrder: 1,
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'Cho nhà hàng phát triển — không giới hạn quy mô.',
    badge: 'PHỔ BIẾN NHẤT',
    isPopular: true,
    isActive: true,
    contactOnly: false,
    priceMonthly: 690000,
    cycles: { 1: 690000, 3: 1920000, 6: 3590000, 12: 6690000 },
    features: [
      'Bàn & món không giới hạn',
      'Không giới hạn nhân viên',
      'Báo cáo nâng cao + KDS bếp',
    ],
    limits: { tables: 0, items: 0, staff: 0 },
    sortOrder: 2,
  },
  {
    key: 'enterprise',
    name: 'Doanh nghiệp',
    description: 'Cho chuỗi nhà hàng, nhượng quyền — giải pháp may đo.',
    badge: '',
    isPopular: false,
    isActive: true,
    contactOnly: true,
    priceMonthly: 0,
    cycles: { 1: 0, 3: 0, 6: 0, 12: 0 },
    features: [
      'API & tích hợp tuỳ chỉnh',
      'Ưu tiên hỗ trợ 24/7',
      'Đào tạo & triển khai riêng',
    ],
    limits: { tables: 0, items: 0, staff: 0 },
    sortOrder: 3,
  },
];

const PlanSchema = new Schema<IPlan>(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    badge: { type: String, default: '' },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    contactOnly: { type: Boolean, default: false },
    priceMonthly: { type: Number, default: 0, min: 0 },
    cycles: {
      type: Schema.Types.Mixed,
      default: { 1: 0, 3: 0, 6: 0, 12: 0 },
    },
    features: { type: [String], default: [] },
    limits: {
      type: new Schema(
        {
          tables: { type: Number, default: 0, min: 0 },
          items: { type: Number, default: 0, min: 0 },
          staff: { type: Number, default: 0, min: 0 },
        },
        { _id: false },
      ),
      default: { tables: 0, items: 0, staff: 0 },
    },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true },
);

const PricingConfigSchema = new Schema<IPricingConfig>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    cycles: {
      type: Schema.Types.Mixed,
      required: true,
      default: DEFAULT_PRICING_CYCLES,
    },
    currency: { type: String, default: 'VND' },
    plans: { type: [PlanSchema], default: DEFAULT_PLANS },
  },
  { timestamps: true },
);

export const PricingConfig = model<IPricingConfig>('PricingConfig', PricingConfigSchema);