import type { IRestaurant } from "./restaurant.type";
import type { ITable } from "./table.type";
import type { IUser } from "./user.type";

export interface IOrder{
  _id?:string;
  orderId?:string;
  restaurant?: IRestaurant|string;
  table?: ITable;
  customer?: IUser|  string;
  orderType?: 'dine-in' | 'delivery'| 'to-go';
  status?: 'pending' | 'confirmed' | 'preparing' | 'served' | 'delivered' | 'paid' | 'cancelled';
  paymentStatus?:'waiting-paid' | 'unpaid' | 'partial' | 'paid' | 'refunded';
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
  items?:IOrderItem[]
  paidAt?: Date;
  staff?: IUser | string; // Thêm để theo dõi nhân viên xử lý
  reservation?: string; // Thêm để liên kết với đặt bàn
  createdAt?: Date;
  updatedAt?: Date;
}


export  interface IOrderItem {
    _id?:string;
    order?: IOrder;
    menuItem: string;
    nameSnapshot: string;
    priceSnapshot: number;
    quantity: number;
    note?: string;
    toppings?: { name: string; price: number }[];
    status?: 'pending' | 'preparing' | 'served';
    createdAt?: Date;
    updatedAt?: Date;
}