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
  /** Key tính năng ĐƯỢC CẤP cho gói (gating thật, đọc từ FEATURE_CATALOG) — super-admin tick động. */
  featureKeys: string[];
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
  1: 190000,
  3: 570000,
  6: 1020000,
  12: 1820000,
};

/** Các gói mặc định khi chưa được super-admin cấu hình (fallback seed — nguồn thật là DB PricingConfig). */
export const DEFAULT_PLANS: IPlan[] = [
  {
    key: 'free',
    name: 'Miễn Phí',
    description: 'Dùng thử miễn phí cho quán nhỏ — 1 chi nhánh.',
    badge: '',
    isPopular: false,
    isActive: true,
    contactOnly: false,
    priceMonthly: 0,
    cycles: { 1: 0, 3: 0, 6: 0, 12: 0 },
    features: [
      '5 bàn + 30 món',
      '2 tài khoản nhân viên',
      'Báo cáo trong ngày',
    ],
    featureKeys: [],
    limits: { tables: 5, items: 30, staff: 2 },
    sortOrder: 1,
  },
  {
    key: 'basic',
    name: 'Cơ Bản',
    description: 'Dành cho quán nhỏ, lượng khách ổn định.',
    badge: '',
    isPopular: false,
    isActive: true,
    contactOnly: false,
    priceMonthly: 190000,
    cycles: { 1: 190000, 3: 570000, 6: 1020000, 12: 1820000 },
    features: [
      '20 bàn + 100 món',
      '5 tài khoản nhân viên',
      'Báo cáo 7 ngày',
    ],
    featureKeys: [],
    limits: { tables: 20, items: 100, staff: 5 },
    sortOrder: 2,
  },
  {
    key: 'pro',
    name: 'Pro',
    description: 'Cho nhà hàng phát triển — quy mô lớn + kênh O2O.',
    badge: 'PHỔ BIẾN NHẤT',
    isPopular: true,
    isActive: true,
    contactOnly: false,
    priceMonthly: 490000,
    cycles: { 1: 490000, 3: 1470000, 6: 2640000, 12: 4700000 },
    features: [
      '100 bàn + 500 món',
      '20 tài khoản nhân viên',
      'Báo cáo nâng cao + Excel + KDS bếp',
      'O2O: đặt món online, scan QR, đặt chỗ',
      'Chat nhóm + white-label',
    ],
    featureKeys: [
      'kds',
      'cart',
      'scan_to_order',
      'reservation',
      'advanced_report',
      'messaging_group',
      'white_label',
    ],
    limits: { tables: 100, items: 500, staff: 20 },
    sortOrder: 3,
  },
  {
    key: 'enterprise',
    name: 'Doanh Nghiệp',
    description: 'Cho chuỗi nhà hàng, nhượng quyền — mọi tính năng + API.',
    badge: '',
    isPopular: false,
    isActive: true,
    contactOnly: false,
    priceMonthly: 790000,
    cycles: { 1: 790000, 3: 2370000, 6: 4260000, 12: 7580000 },
    features: [
      'Không giới hạn bàn, món, nhân viên',
      'Báo cáo nâng cao + API',
      'Ưu tiên hỗ trợ 24/7 + đào tạo',
    ],
    featureKeys: [
      'kds',
      'cart',
      'scan_to_order',
      'reservation',
      'advanced_report',
      'messaging_group',
      'white_label',
      'api',
    ],
    limits: { tables: 0, items: 0, staff: 0 },
    sortOrder: 4,
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
    featureKeys: { type: [String], default: [] },
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