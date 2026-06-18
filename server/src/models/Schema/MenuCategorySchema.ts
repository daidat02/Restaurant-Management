import { Schema, model, Document, Types } from 'mongoose';
import type { Image } from '../../shared/type.js';

const ObjectId = Schema.Types.ObjectId;

export interface IMenuCategory {
  name: string;
  restaurant: Types.ObjectId;
  description?: string;
  imageUrl?: Image;
}

export interface IMenuCategoryDocument extends IMenuCategory, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MenuCategorySchema = new Schema<IMenuCategoryDocument>(
  {
    name: { type: String, required: true, trim: true },
    restaurant: { type: ObjectId, ref: 'Restaurant', required: true, index: true },
    description: { type: String, trim: true },
    imageUrl: {
      url: String,
      public_id: String,
    },
  },
  { timestamps: true },
);

// Đảm bảo tên danh mục là duy nhất TRONG CÙNG MỘT NHÀ HÀNG (Tránh lỗi trùng tên toàn hệ thống)
MenuCategorySchema.index({ restaurant: 1, name: 1 }, { unique: true });

export const MenuCategory = model<IMenuCategoryDocument>('MenuCategory', MenuCategorySchema);
