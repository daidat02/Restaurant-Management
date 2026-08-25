import type { IRestaurant } from './restaurant.type';
import type { ITable } from './table.type';
import type { IUser } from './user.type';

export interface IOrder {
  _id?: string;
  orderId?: string;
  restaurant?: IRestaurant | string;
  table?: ITable;
  customer?: IUser | string;
  orderType?: 'dine-in' | 'delivery' | 'to-go';
  status?:
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'serving'
    | 'served'
    | 'delivered'
    | 'paid'
    | 'completed'
    | 'cancelled';
  paymentStatus?: 'waiting_paid' | 'unpaid' | 'partial' | 'paid' | 'refunded';
  totalAmount?: number;
  itemsCount?: number;
  notes?: string;
  servedAt?: Date;

  // Delivery
  deliveryInfo?: {
    name: string;
    phone: string;
    address: string;
    note?: string;
  };
  deliveredAt?: Date;
  items?: IOrderItem[];
  paidAt?: Date;
  staff?: IUser | string; // Thêm để theo dõi nhân viên xử lý
  reservation?: string; // Thêm để liên kết với đặt bàn
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IOrderItem {
  _id?: string;
  /** Client-only: định danh dòng trong giỏ POS — cùng món nhưng khác topping là dòng riêng. */
  lineId?: string;
  order?: IOrder;
  menuItem: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  note?: string;
  toppings?: { name: string; price: number }[];
  status?: 'pending' | 'preparing' | 'served' | 'deleted';
  deletedReason?: string;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
