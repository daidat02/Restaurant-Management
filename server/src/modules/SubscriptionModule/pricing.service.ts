import type { ServiceResponse } from '../../shared/type.js';
import pricingRepository from './pricing.repository.js';
import { DEFAULT_PRICING_CYCLES } from '../../models/Schema/PricingConfigSchema.js';

/** Chu kỳ hợp lệ (1/3/6/12 tháng). */
const VALID_CYCLES = [1, 3, 6, 12];

class PricingService {
  /** GET — ai có token cũng đọc được giá (để hiển thị trên màn thanh toán). */
  async getPricing(): Promise<ServiceResponse<any>> {
    const config = await pricingRepository.getOrCreate();
    return {
      message: 'Lấy cấu hình giá thành công!',
      data: { cycles: config.cycles, currency: config.currency },
      code: 200,
    };
  }

  /** PUT — super-admin chỉnh giá 4 chu kỳ. */
  async updatePricing(cycles: unknown): Promise<ServiceResponse<any>> {
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
      data: { cycles: config.cycles, currency: config.currency },
      code: 200,
    };
  }

  /** Lấy giá 1 chu kỳ từ cấu hình (dùng nội bộ). */
  async getPriceForCycle(cycleMonths: number): Promise<number | null> {
    const config = await pricingRepository.getOrCreate();
    const price = (config.cycles as unknown as Record<string, number>)?.[String(cycleMonths)];
    return typeof price === 'number' && price > 0 ? price : null;
  }
}

export default new PricingService();
export { DEFAULT_PRICING_CYCLES, VALID_CYCLES };
