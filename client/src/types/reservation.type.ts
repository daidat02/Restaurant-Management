import type { IRestaurant } from './restaurant.type';
import type { ITable } from './table.type';
import type { IUser } from './user.type';

export type ReservationStatus = 'pending' | 'confirmed' | 'checked_in' | 'cancelled';

export interface IReservation {
  _id?: string;
  reservationId: string;
  restaurant: IRestaurant | string;
  table?: ITable | string;
  customer?: IUser | string;
  customerInfo: {
    name: string;
    phoneNumber: string;
    email?: string;
    note?: string;
    side?: string;
  };
  reservationTime: string;
  date: Date;
  partySize: number;
  status?: ReservationStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITableTimeSlot {
  _id: string; // Trả ra ID để Frontend làm key
  tableNumber: number;
  capacity: number;
  reservedTimes: Record<string, Partial<IReservation>>;
}
