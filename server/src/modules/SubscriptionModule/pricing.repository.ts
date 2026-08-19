import mongoose from 'mongoose';
import DB_Connection from '../../models/DB_Connection.js';
import { sanitizeFeatureKeys } from '../../shared/feature-catalog.js';
import {
  DEFAULT_PRICING_CYCLES,
  DEFAULT_PLANS,
  type IPricingConfig,
  type IPlan,
} from '../../models/Schema/PricingConfigSchema.js';

class PricingRepository {
  /** Mặc định cho 2 field limit mới theo plan.key (dùng khi backfill dữ liệu cũ). */
  private static readonly DEFAULT_NEW_LIMITS: Record<
    string,
    { daily_orders: number; group_chats: number }
  > = {
    'khởi-động': { daily_orders: 30, group_chats: 0 },
    basic: { daily_orders: 100, group_chats: 2 },
    pro: { daily_orders: 0, group_chats: 5 },
    enterprise: { daily_orders: 0, group_chats: 0 },
  };

  /**
   * Backfill idempotent cho plans cũ: bổ sung field limit mới (`daily_orders`, `group_chats`)
   * nếu thiếu. Không đụng tới featureKeys — gán feature cho gói là do super-admin cấu hình. Trả
   * true nếu có thay đổi → caller save.
   */
  private backfillNewPlanFields(plans: any[]): boolean {
    if (!Array.isArray(plans) || plans.length === 0) return false;
    let changed = false;
    for (const p of plans) {
      const key = String(p?.key ?? '');
      const def = PricingRepository.DEFAULT_NEW_LIMITS[key] ?? {
        daily_orders: 0,
        group_chats: 0,
      };
      p.limits = p.limits ?? {};
      if (typeof p.limits.daily_orders !== 'number') {
        p.limits.daily_orders = def.daily_orders;
        changed = true;
      }
      if (typeof p.limits.group_chats !== 'number') {
        p.limits.group_chats = def.group_chats;
        changed = true;
      }
    }
    return changed;
  }

  /** Lấy cấu hình giá singleton (key='default'), tự tạo (kèm gói mặc định) nếu chưa có. */
  async getOrCreate(): Promise<IPricingConfig> {
    let config = await DB_Connection.PricingConfig.findOne({ key: 'default' }).exec();
    if (!config) {
      config = await DB_Connection.PricingConfig.create({
        key: 'default',
        cycles: DEFAULT_PRICING_CYCLES,
        currency: 'VND',
        plans: DEFAULT_PLANS,
      });
    } else if (!config.plans || config.plans.length === 0) {
      // Cấu hình cũ chưa có gói → seed gói mặc định.
      config.plans = DEFAULT_PLANS as any;
      await config.save();
    } else if (
      (config.plans as any[]).some((p: any) => p.limits?.branches !== undefined ||
        (Array.isArray(p.features) && p.features.some((f: string) => /^(số\s+)?\d+\s*chi nhánh|không giới hạn chi nhánh/i.test(String(f)))))
    ) {
      // Dữ liệu cũ còn sót giới hạn/đặc điểm "chi nhánh" (model trả phí theo chi nhánh) → chuẩn hoá.
      config.plans = (config.plans as any[]).map((p: any) => {
        const { branches, ...limits } = p.limits ?? {};
        return {
          ...p,
          limits,
          features: Array.isArray(p.features)
            ? p.features.filter((f: string) => !/^(số\s+)?\d+\s*chi nhánh|không giới hạn chi nhánh/i.test(String(f)))
            : p.features,
        };
      }) as any;
      await config.save();
    }

    // Backfill field/feature mới cho plans hiện có (idempotent — chạy lại không đổi).
    if (this.backfillNewPlanFields(config.plans as any[])) {
      await config.save();
    }
    return config;
  }

  /** Cập nhật giá 4 chu kỳ (backward-compat). */
  async updateCycles(cycles: IPricingConfig['cycles']): Promise<IPricingConfig> {
    const config = await this.getOrCreate();
    config.cycles = cycles as any;
    await config.save();
    return config;
  }

  /** Thay toàn bộ danh sách gói dịch vụ. */
  async updatePlans(plans: IPlan[]): Promise<IPricingConfig> {
    const config = await this.getOrCreate();
    const sanitized: IPlan[] = plans.map((plan) => {
      const { _id } = plan as IPlan & { _id?: mongoose.Types.ObjectId };
      const features = Array.isArray(plan.features)
        ? plan.features.map((f) => String(f).trim()).filter((f) => f && !/^(số\s+)?\d+\s*chi nhánh$/i.test(f) && !/^không giới hạn chi nhánh$/i.test(f))
        : [];
      return {
        _id: _id ?? new mongoose.Types.ObjectId(),
        key: (plan.key || '').trim() || `${plan.name}`.trim().toLowerCase().replace(/\s+/g, '-') || `plan-${Date.now()}`,
        name: (plan.name || '').trim(),
        description: (plan.description || '').trim(),
        badge: (plan.badge || '').trim(),
        isPopular: Boolean(plan.isPopular),
        isActive: plan.isActive !== false,
        contactOnly: Boolean(plan.contactOnly),
        priceMonthly: plan.contactOnly ? 0 : Math.max(0, Math.round(plan.priceMonthly || 0)),
        cycles: plan.contactOnly
          ? { 1: 0, 3: 0, 6: 0, 12: 0 }
          : {
              1: Math.round(plan.cycles?.[1] || 0),
              3: Math.round(plan.cycles?.[3] || 0),
              6: Math.round(plan.cycles?.[6] || 0),
              12: Math.round(plan.cycles?.[12] || 0),
            },
        features,
        featureKeys: sanitizeFeatureKeys(plan.featureKeys),
        limits: {
          tables: Math.max(0, Math.round(plan.limits?.tables || 0)),
          items: Math.max(0, Math.round(plan.limits?.items || 0)),
          staff: Math.max(0, Math.round(plan.limits?.staff || 0)),
          daily_orders: Math.max(0, Math.round(plan.limits?.daily_orders || 0)),
          group_chats: Math.max(0, Math.round(plan.limits?.group_chats || 0)),
        },
        sortOrder: Math.round(plan.sortOrder || 0),
      };
    });
    config.plans = sanitized as any;
    await config.save();
    return config;
  }
}

export default new PricingRepository();