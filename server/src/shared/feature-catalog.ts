/** Bảng chức năng (feature catalog) — nguồn thực thi gate tính năng theo gói.
 *  CỐ ĐỊNH trong code: enforcement nằm trong code (route assertFeature), không thể
 *  gate feature mà code không hiểu. Thêm feature mới = thêm dòng ở đây + chèn
 *  assertFeature vào route tương ứng (việc của dev).
 *  Gán feature cho gói (plan.featureKeys) thì ĐỘNG, do super-admin cấu hình. */
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

/** Lọc một mảng featureKeys chỉ giữ các key hợp lệ trong catalog. */
export function sanitizeFeatureKeys(keys: unknown): FeatureKey[] {
  if (!Array.isArray(keys)) return [];
  const valid = new Set<string>(FEATURE_KEYS);
  return keys
    .map((k) => String(k).trim())
    .filter((k): k is FeatureKey => k !== '' && valid.has(k));
}
