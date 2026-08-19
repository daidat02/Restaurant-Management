import DB_Connection from '../models/DB_Connection.js';
import {
  DEFAULT_PLANS,
  type IPlan,
  type IPlanLimits,
} from '../models/Schema/PricingConfigSchema.js';
import { FEATURE_KEYS, type FeatureKey } from '../shared/feature-catalog.js';
import pricingService from '../modules/SubscriptionModule/pricing.service.js';
import pricingRepository from '../modules/SubscriptionModule/pricing.repository.js';
import type { NextFunction, Request, Response } from 'express';

/** Tài nguyên đếm được để ép giới hạn theo gói. */
export type PlanResource = keyof IPlanLimits;

/** Lỗi nghiệp vụ khi vượt giới hạn / thiếu tính năng — client bắt được qua `code`. */
export class PlanLimitError extends Error {
  statusCode = 403;
  code = 'PLAN_LIMIT_REACHED';
  restaurantId: string | undefined;
  meta: Record<string, unknown>;

  constructor(message: string, meta: Record<string, unknown>, restaurantId?: string) {
    super(message);
    this.name = 'PlanLimitError';
    this.meta = meta;
    this.restaurantId = restaurantId;
  }
}

/** Cache cấu hình plan ngắn hạn (TTL 30s) để giảm query PricingConfig khi gate. */
const planCache = new Map<string, { plan: IPlan | null; at: number }>();
const PLAN_CACHE_TTL = 30_000;

/** Đọc plan theo key từ PricingConfig động; fallback DEFAULT_PLANS. Có cache ngắn. */
export async function getPlan(planKey?: string | null): Promise<IPlan | null> {
  const key = planKey || 'free';
  const hit = planCache.get(key);
  if (hit && Date.now() - hit.at < PLAN_CACHE_TTL) return hit.plan;
  // Dùng getOrCreate (không đọc thẳng DB) để backfill field limit/feature mới
  // cho cấu hình cũ — đảm bảo gate luôn thấy daily_orders/group_chats/payos.
  const config = await pricingRepository.getOrCreate();
  const plans = config?.plans?.length ? config.plans : DEFAULT_PLANS;
  const plan = plans.find((p) => p.key === key) || null;
  planCache.set(key, { plan, at: Date.now() });
  return plan;
}

/** Key gói hiện tại của nhà hàng (fallback gói mặc định nếu chưa có). */
export async function resolvePlanKey(restaurant?: {
  currentPlanKey?: string | null;
} | null): Promise<string> {
  if (restaurant?.currentPlanKey) return restaurant.currentPlanKey;
  return (await pricingService.getDefaultPlanKey()) || 'free';
}

/** Gói có feature không? */
export function hasFeature(plan: IPlan | null | undefined, feature: FeatureKey): boolean {
  if (!plan) return false;
  return Array.isArray(plan.featureKeys) && plan.featureKeys.includes(feature);
}

/**
 * Kiểm tra gói có feature không — thiếu → ném PlanLimitError.
 * `restaurant` truyền bản ghi đã có sẵn (để tránh query lại) hoặc `restaurantId` để tự tải.
 */
export async function assertFeatureRestaurant(
  restaurant: { _id?: unknown; currentPlanKey?: string | null } | string | null | undefined,
  feature: FeatureKey,
): Promise<void> {
  if (!FEATURE_KEYS.includes(feature)) return;
  const { restaurantId, planKey } = await resolveRestaurantPlan(restaurant);
  const plan = await getPlan(planKey);
  if (!hasFeature(plan, feature)) {
    throw new PlanLimitError(
      'Gói hiện tại của bạn không bao gồm tính năng này. Vui lòng nâng gói để sử dụng.',
      { planKey, feature },
      restaurantId,
    );
  }
}

/**
 * Kiểm tra gói có ÍT NHẤT MỘT trong danh sách features không — thiếu hết → ném PlanLimitError.
 * Dùng cho tính năng cùng nhóm (vd: QR thanh toán = qr_manual HOẶC payos).
 */
export async function assertAnyFeatureRestaurant(
  restaurant: { _id?: unknown; currentPlanKey?: string | null } | string | null | undefined,
  features: FeatureKey[],
): Promise<void> {
  const valid = features.filter((f) => FEATURE_KEYS.includes(f));
  if (valid.length === 0) return;
  const { restaurantId, planKey } = await resolveRestaurantPlan(restaurant);
  const plan = await getPlan(planKey);
  if (!valid.some((f) => hasFeature(plan, f))) {
    throw new PlanLimitError(
      'Gói hiện tại của bạn không bao gồm tính năng này. Vui lòng nâng gói để sử dụng.',
      { planKey, features: valid, anyOf: true },
      restaurantId,
    );
  }
}

/**
 * Kiểm tra giới hạn số lượng của gói: `used + requested <= limit`.
 * limit = 0 (không giới hạn) → luôn pass. Vượt → ném PlanLimitError.
 */
export async function assertLimit(
  restaurant: { _id?: unknown; currentPlanKey?: string | null } | string | null | undefined,
  resource: PlanResource,
  used: number,
  requested = 1,
): Promise<void> {
  const { restaurantId, planKey } = await resolveRestaurantPlan(restaurant);
  const plan = await getPlan(planKey);
  if (!plan) return;
  const limit = plan.limits?.[resource] ?? 0;
  if (limit !== 0 && used + requested > limit) {
    throw new PlanLimitError(
      `Gói ${plan.name} đã đạt giới hạn ${resourceToLabel(resource)}: ${used}/${limit}. Nâng gói để tiếp tục.`,
      { planKey, resource, limit, used, requested },
      restaurantId,
    );
  }
}

/** Đếm số bản ghi hiện có của một tài nguyên theo restaurant. */
export async function countResource(restaurantId: string, resource: PlanResource): Promise<number> {
  const rid = restaurantId;
  switch (resource) {
    case 'tables':
      return DB_Connection.Table.countDocuments({ restaurant: rid }).exec();
    case 'items':
      return DB_Connection.MenuItem.countDocuments({ restaurant: rid }).exec();
    case 'staff':
      // Nhân viên vận hành: staff + manager thuộc chi nhánh (không tính chủ admin/owner)
      return DB_Connection.User.countDocuments({
        restaurantIds: rid,
        role: { $in: ['staff', 'manager'] },
      }).exec();
    case 'daily_orders':
      // Số đơn tạo từ đầu ngày (Asia/Ho_Chi_Minh) — tính cả đơn đã hủy.
      return DB_Connection.Order.countDocuments({
        restaurant: rid,
        createdAt: { $gte: startOfVietnamDay() },
      }).exec();
    case 'group_chats':
      // Số hội thoại nhóm của nhà hàng (1-1 không tính).
      return DB_Connection.Conversation.countDocuments({
        restaurantId: rid,
        type: 'group',
      }).exec();
  }
}

/** 00:00 hôm nay theo múi giờ Việt Nam (UTC+7 cố định, không DST). */
function startOfVietnamDay(date: Date = new Date()): Date {
  const nowVn = date.getTime() + 7 * 3600 * 1000;
  const vnDate = new Date(nowVn);
  vnDate.setUTCHours(0, 0, 0, 0);
  return new Date(vnDate.getTime() - 7 * 3600 * 1000);
}

function resourceToLabel(resource: PlanResource): string {
  switch (resource) {
    case 'tables':
      return 'số bàn';
    case 'items':
      return 'số món';
    case 'staff':
      return 'số nhân viên';
    case 'daily_orders':
      return 'số đơn trong ngày';
    case 'group_chats':
      return 'số nhóm chat';
  }
}

/** Resolve restaurantId + planKey từ object nhà hàng hoặc id (tự tải). */
async function resolveRestaurantPlan(
  restaurant: { _id?: unknown; currentPlanKey?: string | null } | string | null | undefined,
): Promise<{ restaurantId: string | undefined; planKey: string }> {
  if (typeof restaurant === 'string') {
    // Truyền bằng id → tải restaurant để lấy plan.
    const doc = (await DB_Connection.Restaurant.findById(restaurant).select('currentPlanKey').lean()) as unknown as {
      currentPlanKey?: string | null;
    } | null;
    return { restaurantId: restaurant, planKey: await resolvePlanKey(doc) };
  }
  if (restaurant && typeof restaurant === 'object') {
    return {
      restaurantId: restaurant._id ? String(restaurant._id) : undefined,
      planKey: await resolvePlanKey(restaurant),
    };
  }
  return { restaurantId: undefined, planKey: await resolvePlanKey(null) };
}

/**
 * Express middleware gate tính năng theo gói. Đọc restaurant từ `req.tenantId`
 * (đã được verifyTenant xác thực). super-admin luôn vượt qua.
 * Dùng sau verifyToken + verifyTenant:
 *   router.get('/kds', verifyToken, verifyTenant, assertFeature('kds'), handler)
 */
export function assertFeature(feature: FeatureKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actorRole = (req as any).user?.role;
      if (actorRole === 'super-admin') return next();
      const tenantId = (req as any).tenantId;
      if (!tenantId) {
        return res.status(403).json({ message: 'Thiếu ngữ cảnh nhà hàng!' });
      }
      await assertFeatureRestaurant(tenantId, feature);
      return next();
    } catch (error: any) {
      if (error?.code === 'PLAN_LIMIT_REACHED') {
        return res.status(403).json({
          message: error.message,
          errorCode: 'PLAN_LIMIT_REACHED',
          restaurantId: error.restaurantId,
          meta: error.meta,
        });
      }
      console.error('assertFeature middleware error:', error);
      return res.status(500).json({ message: 'Lỗi kiểm tra quyền tính năng!' });
    }
  };
}
