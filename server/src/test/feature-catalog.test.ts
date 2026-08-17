import { describe, it, expect } from 'vitest';
import { FEATURE_CATALOG, FEATURE_KEYS, sanitizeFeatureKeys } from '../shared/feature-catalog.js';
import { DEFAULT_PLANS, DEFAULT_PRICING_CYCLES, type IPlan } from '../models/Schema/PricingConfigSchema.js';

function planByKey(key: string): IPlan {
  return DEFAULT_PLANS.find((p) => p.key === key)!;
}

describe('Feature catalog (bảng chức năng)', () => {
  it('FEATURE_KEYS khai báo đủ 8 feature gate', () => {
    expect(FEATURE_KEYS).toEqual([
      'kds',
      'cart',
      'scan_to_order',
      'reservation',
      'advanced_report',
      'messaging_group',
      'white_label',
      'api',
    ]);
  });

  it('catalog đủ nhãn + nhóm cho từng feature', () => {
    const keys = new Set(FEATURE_CATALOG.map((f) => f.key));
    expect(keys.size).toBe(FEATURE_KEYS.length);
    for (const f of FEATURE_CATALOG) {
      expect(f.label).toBeTruthy();
      expect(f.group).toBeTruthy();
    }
  });

  it('sanitizeFeatureKeys chỉ giữ key hợp lệ', () => {
    expect(sanitizeFeatureKeys(['kds', ' not-a-feature', '', 'api'])).toEqual(['kds', 'api']);
    expect(sanitizeFeatureKeys('kds' as any)).toEqual([]);
    expect(sanitizeFeatureKeys(undefined)).toEqual([]);
  });
});

describe('DEFAULT_PLANS — 4 gói mới', () => {
  it('có đủ 4 gói: free/basic/pro/enterprise', () => {
    expect(DEFAULT_PLANS.map((p) => p.key)).toEqual(['free', 'basic', 'pro', 'enterprise']);
  });

  it('enterprise có giá công khai, không còn contactOnly', () => {
    const enterprise = DEFAULT_PLANS.find((p) => p.key === 'enterprise')!;
    expect(enterprise.contactOnly).toBe(false);
    expect(enterprise.priceMonthly).toBe(790000);
    expect(enterprise.cycles[1]).toBe(790000);
  });

  it('ma trận giới hạn đúng', () => {
    expect(planByKey('free').limits).toEqual({ tables: 5, items: 30, staff: 2 });
    expect(planByKey('basic').limits).toEqual({ tables: 20, items: 100, staff: 5 });
    expect(planByKey('pro').limits).toEqual({ tables: 100, items: 500, staff: 20 });
    expect(planByKey('enterprise').limits).toEqual({ tables: 0, items: 0, staff: 0 });
  });

  it('featureKeys đúng ma trận (O2O/KDS từ Pro, API chỉ DN)', () => {
    expect(planByKey('free').featureKeys).toEqual([]);
    expect(planByKey('basic').featureKeys).toEqual([]);
    expect(planByKey('pro').featureKeys.sort()).toEqual(
      ['kds', 'cart', 'scan_to_order', 'reservation', 'advanced_report', 'messaging_group', 'white_label'].sort(),
    );
    expect(planByKey('enterprise').featureKeys.sort()).toEqual([...FEATURE_KEYS].sort());
  });

  it('giá chu kỳ đúng: chỉ giảm 6/12 tháng', () => {
    expect(planByKey('basic').cycles).toEqual({ 1: 190000, 3: 570000, 6: 1020000, 12: 1820000 });
    expect(planByKey('pro').cycles).toEqual({ 1: 490000, 3: 1470000, 6: 2640000, 12: 4700000 });
    expect(planByKey('enterprise').cycles).toEqual({ 1: 790000, 3: 2370000, 6: 4260000, 12: 7580000 });
  });

  it('DEFAULT_PRICING_CYCLES fallback theo gói Cơ Bản', () => {
    expect(DEFAULT_PRICING_CYCLES).toEqual({ 1: 190000, 3: 570000, 6: 1020000, 12: 1820000 });
  });
});