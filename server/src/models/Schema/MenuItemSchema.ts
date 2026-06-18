import { Schema, model, Document } from 'mongoose';
import { Types } from 'mongoose';
import type { Image } from '../../shared/type.js';

const ObjectId = Schema.Types.ObjectId;

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
