import { Schema, model, Document } from 'mongoose';
import type { IRestaurant } from './RestaurantSchema.js';
import type { ITable } from './TableSchema.js';
import type { IUser } from './UserSchema.js';

// Đồng bộ Type Populated sạch sẽ
export interface IPopulatedReservation extends Omit<
  IReservation,
  'restaurant' | 'table' | 'customer'
> {
  restaurant: IRestaurant;
  table?: ITable; // Có thể giữ hoặc không tùy thuộc vào logic xếp bàn tự động
  customer?: IUser;
}

// 1. Đồng bộ lại toàn bộ các trạng thái của một vòng đời đơn đặt bàn
export type ReservationStatus = 'pending' | 'confirmed' | 'waiting' | 'checked_in' | 'cancelled';

export interface IReservationDocument extends IReservation {
  _id: Schema.Types.ObjectId;
}

export interface IReservation extends Document {
  reservationId: string;
  restaurant: Schema.Types.ObjectId;
  table?: Schema.Types.ObjectId;
  customer?: Schema.Types.ObjectId | null;
  customerInfo?: {
    name: string;
    email?: string;
    phoneNumber: string;
    note?: string;
    side?: string;
  };
  reservationTime: string;
  safe_check_time: Date;
  date: Date;
  partySize: number;
  status: ReservationStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    reservationId: { type: String, required: true },
    // Bỏ thuộc tính index: true đơn lẻ ở đây vì chúng ta sẽ dùng Compound Index tối ưu hơn ở dưới
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    table: { type: Schema.Types.ObjectId, ref: 'Table' },
    customer: { type: Schema.Types.ObjectId, ref: 'User' },
    customerInfo: {
      name: String,
      phoneNumber: String,
      email: String,
      note: String,
      side: String,
    },
    reservationTime: { type: String, required: true, trim: true },
    safe_check_time: { type: Date, required: true },
    date: { type: Date, required: true },
    partySize: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'waiting', 'checked-in', 'cancelled'], // FIX: Thêm 'pending' vào enum hợp lệ
      default: 'pending',
    },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
  },
);

// ================= INDEX CHIẾN LƯỢC TỐI ƯU TRUY VẤN =================

// Index 1: Phục vụ chính cho tính năng TÌM BÀN TRỐNG / KIỂM TRA LỊCH TRÙNG của khách hàng (Cực kì quan trọng)
// Truy vấn thực tế: Tìm reservation thuộc nhà hàng A, ngày B, khung giờ C
ReservationSchema.index({ restaurant: 1, date: 1, reservationTime: 1 });

// Index 2: Phục vụ cho tính năng Quản lý sơ đồ bàn của Nhân viên / Admin
// Truy vấn thực tế: Xem bàn X vào ngày Y lúc mấy giờ đã có ai ngồi chưa
ReservationSchema.index({ table: 1, date: 1, reservationTime: 1 });

// Index 3: Phục vụ tra cứu lịch sử đặt bàn của một Khách hàng cụ thể sắp xếp theo ngày mới nhất
ReservationSchema.index({ customer: 1, date: -1 });

ReservationSchema.index({ restaurant: 1, status: 1, safe_check_time: 1 });
export const Reservation = model<IReservation>('Reservation', ReservationSchema);
