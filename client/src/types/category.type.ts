import type { Image } from './image.type';

export interface IMenuCategory {
  _id: string;
  restaurant: string;
  name: string;
  description?: string;
  imageUrl?: Image;
  createdAt: Date;
  updatedAt: Date;
  foodCount?: number;
}

export interface IMenuItem {
  _id: string;
  restaurant: string;
  category: IMenuCategory | string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: Image[] | undefined;
  isAvailable: boolean;
  tags: string[];
  ingredients?: string[]; // Thêm để lưu nguyên liệu
  lastUpdated?: Date; // Thêm để hỗ trợ real-time
  createdAt: Date;
  updatedAt: Date;
}
