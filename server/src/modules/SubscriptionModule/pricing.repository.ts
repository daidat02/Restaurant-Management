import DB_Connection from '../../models/DB_Connection.js';
import {
  DEFAULT_PRICING_CYCLES,
  type IPricingConfig,
} from '../../models/Schema/PricingConfigSchema.js';

class PricingRepository {
  /** Lấy cấu hình giá singleton (key='default'), tự tạo nếu chưa có. */
  async getOrCreate(): Promise<IPricingConfig> {
    let config = await DB_Connection.PricingConfig.findOne({ key: 'default' }).exec();
    if (!config) {
      config = await DB_Connection.PricingConfig.create({
        key: 'default',
        cycles: DEFAULT_PRICING_CYCLES,
        currency: 'VND',
      });
    }
    return config;
  }

  /** Cập nhật giá 4 chu kỳ. */
  async updateCycles(cycles: IPricingConfig['cycles']): Promise<IPricingConfig> {
    const config = await this.getOrCreate();
    config.cycles = cycles as any;
    await config.save();
    return config;
  }
}

export default new PricingRepository();
