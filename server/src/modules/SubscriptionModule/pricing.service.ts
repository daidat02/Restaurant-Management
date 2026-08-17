import type { ServiceResponse } from '../../shared/type.js';
import pricingRepository from './pricing.repository.js';
import {
  DEFAULT_PRICING_CYCLES,
  type IPlan,
} from '../../models/Schema/PricingConfigSchema.js';

/** Chu kỳ hợp lệ (1/3/6/12 tháng). */
const VALID_CYCLES = [1, 3, 6, 12];

class PricingService {
  /** GET — ai có token cũng đọc được giá & gói (để hiển thị trên màn thanh toán). */
  async getPricing(): Promise<ServiceResponse<any>> {
    const config = await pricingRepository.getOrCreate();
    const plans = (config.plans || [])
      .filter((p: any) => p.isActive !== false)
      .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return {
      message: 'Lấy cấu hình giá thành công!',
      data: { plans, cycles: config.cycles, currency: config.currency },
      code: 200,
    };
  }

  /** PUT — super-admin cập nhật: cycles (cũ) và/hoặc danh sách plans (mới). */
  async updatePricing(body: any): Promise<ServiceResponse<any>> {
    const { cycles, plans } = body ?? {};

    if (cycles !== undefined) {
      if (!cycles || typeof cycles !== 'object') {
        return { message: 'Thiếu dữ liệu giá chu kỳ!', code: 400 };
      }
      const parsed: Record<string, number> = cycles as Record<string, number>;
      const clean: Record<string, number> = {};
      for (const key of VALID_CYCLES) {
        const value = parsed[String(key)];
        if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
          return { message: `Giá chu kỳ ${key} tháng không hợp lệ (phải là số > 0)!`, code: 400 };
        }
        clean[String(key)] = Math.round(value);
      }
      const config = await pricingRepository.updateCycles(clean as any);
      return {
        message: 'Cập nhật giá thành công!',
        data: { plans: config.plans, cycles: config.cycles, currency: config.currency },
        code: 200,
      };
    }

    if (plans !== undefined) {
      if (!Array.isArray(plans)) {
        return { message: 'Danh sách gói phải là một mảng!', code: 400 };
      }
      const hasName = plans.every((p: any) => p && typeof p.name === 'string' && p.name.trim());
      if (!hasName) {
        return { message: 'Tất cả các gói phải có tên!', code: 400 };
      }
      for (const p of plans) {
        // Gói trả phí (priceMonthly > 0) phải có giá mọi chu kỳ; gói Miễn Phí (price 0) cho phép chu kỳ = 0.
        if (!p.contactOnly && Number(p.priceMonthly) > 0) {
          for (const key of VALID_CYCLES) {
            const value = Number(p.cycles?.[String(key)]);
            if (!Number.isFinite(value) || value <= 0) {
              return {
                message: `Gói "${p.name}": giá chu kỳ ${key} tháng không hợp lệ (phải là số > 0)!`,
                code: 400,
              };
            }
          }
        }
      }
      const config = await pricingRepository.updatePlans(plans as IPlan[]);
      return {
        message: 'Cập nhật gói dịch vụ thành công!',
        data: { plans: config.plans, cycles: config.cycles, currency: config.currency },
        code: 200,
      };
    }

    return { message: 'Thiếu dữ liệu cập nhật (cycles hoặc plans)!', code: 400 };
  }

  /** Lấy giá 1 chu kỳ từ cấu hình (dùng nội bộ — fallback gói mặc định). */
  async getPriceForCycle(cycleMonths: number): Promise<number | null> {
    const config = await pricingRepository.getOrCreate();
    const price = (config.cycles as unknown as Record<string, number>)?.[String(cycleMonths)];
    return typeof price === 'number' && price > 0 ? price : null;
  }

  /** Tính giá 1 chu kỳ theo gói (planKey) — dùng khi chủ chọn gói cụ thể khi thanh toán. */
  async getPlanPriceForCycle(planKey: string, cycleMonths: number): Promise<number | null> {
    const config = await pricingRepository.getOrCreate();
    const plan = (config.plans || []).find((p: any) => p.key === planKey);
    if (!plan) return this.getPriceForCycle(cycleMonths);
    const cycles = (plan.cycles ?? {}) as unknown as Record<string, number>;
    const price = Number(cycles[String(cycleMonths)]) || 0;
    return price > 0 ? price : null;
  }

  /** Lấy tên gói theo key (ghi vào transaction). */
  async getPlanName(planKey: string): Promise<string | null> {
    const config = await pricingRepository.getOrCreate();
    const plan = (config.plans || []).find((p: any) => p.key === planKey);
    return plan?.name ?? null;
  }

  /** Lấy thứ tự sắp xếp (sortOrder) của gói theo key — dùng để so sánh upgrade/downgrade. */
  async getPlanSortOrder(planKey: string): Promise<number> {
    const config = await pricingRepository.getOrCreate();
    const plan = (config.plans || []).find((p: any) => p.key === planKey);
    return Number(plan?.sortOrder) || 0;
  }

  /** Key của gói mặc định (thấp nhất, không phải contactOnly) — dùng khi chưa xác định gói hiện tại. */
  async getDefaultPlanKey(): Promise<string | undefined> {
    const config = await pricingRepository.getOrCreate();
    const plans = (config.plans || [])
      .filter((p: any) => p.isActive !== false && p.contactOnly !== true)
      .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return plans[0]?.key;
  }

  /** Key gói trả phí rẻ nhất (bỏ gói Miễn Phí) — dùng làm mặc định cho chi nhánh 2+ bắt buộc trả phí. */
  async getDefaultPaidPlanKey(): Promise<string | undefined> {
    const config = await pricingRepository.getOrCreate();
    const plans = (config.plans || [])
      .filter((p: any) => p.isActive !== false && p.contactOnly !== true && p.priceMonthly > 0)
      .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return plans[0]?.key;
  }
}

export default new PricingService();
export { DEFAULT_PRICING_CYCLES, VALID_CYCLES };