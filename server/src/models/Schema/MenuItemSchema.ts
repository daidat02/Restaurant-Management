import { Schema, model, Document } from 'mongoose';
import { Types } from 'mongoose';
import type { Image } from '../../shared/type.js';

const ObjectId = Schema.Types.ObjectId;

export type OptionGroupType = 'single' | 'multiple';

export interface IOptionChoice {
  name: string;
  price: number; // price = 0 nghĩa là free
}

export interface IOptionGroup {
  name: string;
  type: OptionGroupType; // single: chỉ chọn 1, multiple: chọn nhiều
  required: boolean; // bắt buộc khách phải chọn
  min?: number; // số lượng tối thiểu được chọn (áp dụng cho multiple)
  max?: number; // số lượng tối đa được chọn (áp dụng cho multiple)
  choices: IOptionChoice[];
}

export interface IMenuItemDocument extends IMenuItem {
  _id: Types.ObjectId;
}

export interface IMenuItem extends Document {
  category: Types.ObjectId;
  restaurant: Types.ObjectId;
  name: string;
  price: number;
  description?: string;
  imageUrl?: Image[];
  isAvailable: boolean;
  tags: string[];
  ingredients?: string[]; // Thêm để lưu nguyên liệu
  rating?: number; // Thêm để hỗ trợ đánh giá
  igf?: string;
  bestSeller?: boolean; // Thêm để đánh dấu món bán chạy
  orderCount?: number; // Thêm để theo dõi số lượng đơn đặt
  optionGroups?: IOptionGroup[]; // Nhóm lựa chọn thêm cho món (topping, size, nước sốt...)
  lastUpdated?: Date; // Thêm để hỗ trợ real-time
  createdAt: Date;
  updatedAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    category: { type: ObjectId, ref: 'MenuCategory', required: true, index: true },
    restaurant: { type: ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    imageUrl: [
      {
        url: String,
        publicId: String,
      },
    ],
    isAvailable: { type: Boolean, default: true, index: true },
    tags: [{ type: String, trim: true }],
    ingredients: [{ type: String, trim: true }],
    optionGroups: [
      {
        _id: false,
        name: { type: String, required: true, trim: true },
        type: { type: String, enum: ['single', 'multiple'], required: true },
        required: { type: Boolean, default: false },
        min: { type: Number, default: 0 },
        max: { type: Number },
        choices: [
          {
            _id: false,
            name: { type: String, required: true, trim: true },
            price: { type: Number, required: true, min: 0, default: 0 },
          },
        ],
      },
    ],
    rating: { type: Number, min: 0, max: 5, default: 0 },
    igf: { type: String, trim: true },
    orderCount: { type: Number, default: 0 },
    bestSeller: { type: Boolean, default: false },
    lastUpdated: { type: Date },
  },
  { timestamps: true },
);

MenuItemSchema.index({ restaurant: 1, name: 1 });

export const MenuItem = model<IMenuItem>('MenuItem', MenuItemSchema);
