import { Schema, model, Document, type Types } from 'mongoose';

/** Chu kỳ thanh toán → số tiền (VND). */
export interface IPricingCycles {
  1: number;
  3: number;
  6: number;
  12: number;
}

export interface IPricingConfig extends Document {
  key: string;
  cycles: IPricingCycles;
  currency: string;
  updatedAt: Date;
}

export interface IPricingConfigDocument extends IPricingConfig {
  _id: Types.ObjectId;
}

export const DEFAULT_PRICING_CYCLES: IPricingCycles = {
  1: 299000,
  3: 849000,
  6: 1590000,
  12: 2990000,
};

const PricingConfigSchema = new Schema<IPricingConfig>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    cycles: {
      type: Schema.Types.Mixed,
      required: true,
      default: DEFAULT_PRICING_CYCLES,
    },
    currency: { type: String, default: 'VND' },
  },
  { timestamps: true },
);

export const PricingConfig = model<IPricingConfig>('PricingConfig', PricingConfigSchema);
