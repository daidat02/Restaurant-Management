import type { IPlan, IPricingConfig } from '@/types/subscription.type';
import type { IRestaurant } from '@/types/restaurant.type';

/** Gói Miễn Phí — sortOrder 1, featureKeys rỗng, giới hạn 5 bàn / 30 món / 2 NV. */
export const FREE: IPlan = {
  key: 'free',
  name: 'Miễn Phí',
  description: '',
  badge: '',
  isPopular: false,
  isActive: true,
  contactOnly: false,
  priceMonthly: 0,
  cycles: { 1: 0, 3: 0, 6: 0, 12: 0 },
  features: [],
  featureKeys: [],
  limits: { tables: 5, items: 30, staff: 2, daily_orders: 30, group_chats: 0 },
  sortOrder: 1,
};

/** Gói Pro — sortOrder 3, có đầy đủ feature gating (kds/advanced_report/messaging_group...). */
export const PRO: IPlan = {
  key: 'pro',
  name: 'Pro',
  description: '',
  badge: 'PHỔ BIẾN NHẤT',
  isPopular: true,
  isActive: true,
  contactOnly: false,
  priceMonthly: 490000,
  cycles: { 1: 490000, 3: 1470000, 6: 2640000, 12: 4700000 },
  features: [],
  featureKeys: [
    'kds',
    'cart',
    'scan_to_order',
    'reservation',
    'advanced_report',
    'messaging_group',
    'payos',
    'white_label',
  ],
  limits: { tables: 100, items: 500, staff: 20, daily_orders: 0, group_chats: 5 },
  sortOrder: 3,
};

/** Gói Doanh Nghiệp — sortOrder 4, mọi feature, limits toàn 0 (không giới hạn). */
export const ENTERPRISE: IPlan = {
  key: 'enterprise',
  name: 'Doanh Nghiệp',
  description: '',
  badge: '',
  isPopular: false,
  isActive: true,
  contactOnly: false,
  priceMonthly: 790000,
  cycles: { 1: 790000, 3: 2370000, 6: 4260000, 12: 7580000 },
  features: [],
  featureKeys: [
    'kds',
    'cart',
    'scan_to_order',
    'reservation',
    'advanced_report',
    'messaging_group',
    'payos',
    'white_label',
    'api',
  ],
  limits: { tables: 0, items: 0, staff: 0, daily_orders: 0, group_chats: 0 },
  sortOrder: 4,
};

export const PRICING: IPricingConfig = {
  cycles: { 1: 0, 3: 0, 6: 0, 12: 0 },
  currency: 'VND',
  plans: [FREE, PRO, ENTERPRISE],
};

/** Nhà hàng tối thiểu cho việc resolve plan (chỉ cần _id + currentPlanKey). */
export function mkRestaurant(id: string, currentPlanKey: string): IRestaurant {
  return {
    _id: id,
    name: `Nhà hàng ${id}`,
    email: `${id}@test.vn`,
    operatingHours: '08:00-22:00',
    currentPlanKey,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as IRestaurant;
}
