import type { IOrder } from './order.type';
import type { IRestaurant } from './restaurant.type';

export interface ITable {
  _id: string;
  restaurant: string | IRestaurant;
  tableNumber: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'inactive';
  lastStatusUpdate?: Date;
  currentOrder: IOrder | string;
  createdAt: Date;
  updatedAt: Date;
}
