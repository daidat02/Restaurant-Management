import type { Image } from './image.type';

export type OptionGroupType = 'single' | 'multiple';

export interface IOptionChoice {
  name: string;
  price: number; // price = 0 nghĩa là free
}

export interface IOptionGroup {
  name: string;
  type: OptionGroupType; // single: chỉ chọn 1, multiple: chọn nhiều
  required: boolean; // bắt buộc khách phải chọn
  min?: number; // số lượng tối thiểu được chọn (multiple)
  max?: number; // số lượng tối đa được chọn (multiple)
  choices: IOptionChoice[];
}

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
  optionGroups?: IOptionGroup[]; // Nhóm lựa chọn thêm cho món (topping, nước sốt, size...)
  lastUpdated?: Date; // Thêm để hỗ trợ real-time
  createdAt: Date;
  updatedAt: Date;
}
