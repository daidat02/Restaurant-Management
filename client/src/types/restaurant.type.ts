import type { IUser } from './user.type';

export type RestaurantSubscription = 'trial' | 'active' | 'locked';

export interface IRestaurant {
  _id: string;
  name: string;
  email: string;
  address?: string;
  phone?: string;
  description?: string;
  managerId?: string | IUser;
  status?: 'active' | 'inactive';
  staffCount?: number;
  capacity?: number;
  operatingHours: string;
  logoUrl?: string;
  /** Chủ sở hữu nhà hàng (role admin). */
  ownerId?: string;
  /** Trạng thái thuê bao: trial (dùng thử) / active (đã thanh toán) / locked (khoá). */
  subscription?: RestaurantSubscription;
  /** Hết hạn dùng thử (nhà hàng đầu). */
  trialEndsAt?: Date | string;
  /** Thanh toán tới ngày (nhà hàng active). */
  paidUntil?: Date | string;
  /** Chu kỳ thanh toán khi mở nhà hàng 2+ (1/3/6/12 tháng). */
  cycleMonths?: 1 | 3 | 6 | 12;
  createdAt: Date;
  updatedAt: Date;
}
