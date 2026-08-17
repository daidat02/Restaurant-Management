/** Bảng chức năng (feature catalog) — phản chiếu server `src/shared/feature-catalog.ts`.
 *  Dùng cho gate UX (menu/route/action) — lưới cuối vẫn là server assertFeature. */

export const FEATURE_KEYS = [
  'kds',
  'cart',
  'scan_to_order',
  'reservation',
  'advanced_report',
  'messaging_group',
  'white_label',
  'api',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

export interface FeatureDef {
  key: FeatureKey;
  label: string;
  group: string;
}

export const FEATURE_CATALOG: FeatureDef[] = [
  { key: 'kds', label: 'KDS bếp', group: 'Vận hành' },
  { key: 'cart', label: 'Giỏ hàng / đặt món online', group: 'O2O' },
  { key: 'scan_to_order', label: 'Scan QR gọi món', group: 'O2O' },
  { key: 'reservation', label: 'Đặt chỗ online', group: 'O2O' },
  { key: 'advanced_report', label: 'Báo cáo nâng cao + Excel', group: 'Báo cáo' },
  { key: 'messaging_group', label: 'Chat nhóm + presence', group: 'Messaging' },
  { key: 'white_label', label: 'Thương hiệu riêng', group: 'Thương hiệu' },
  { key: 'api', label: 'API tích hợp', group: 'Tích hợp' },
];

/** Nhãn tiếng Việt của feature (hiển thị khi chặn/upsell). */
export function getFeatureLabel(key?: string): string {
  const def = FEATURE_CATALOG.find((f) => f.key === key);
  return def?.label ?? key ?? '';
}

/** Nhãn tài nguyên giới hạn (tables/items/staff) — hiển thị upsell. */
export const LIMIT_RESOURCE_LABEL: Record<string, string> = {
  tables: 'bàn',
  items: 'món',
  staff: 'nhân viên',
};
