import { Schema, model, Document } from 'mongoose';
import { type ObjectId } from 'mongoose';
import type { ITable } from './TableSchema.js';
import type { IUser } from './UserSchema.js';
import type { IOrderItemDocument } from './OrderItemSchema.js';
const ObjectId = Schema.Types.ObjectId;

export interface IOrderPopulate extends Omit<IOrderDocument, 'table' | 'customer' | 'items'> {
  table?: ITable;
  customer?: IUser;
  items?: IOrderItemDocument[];
}

export interface IOrderDocument extends IOrder {
  _id: ObjectId;
}

export interface IOrder extends Document {
  orderId: string;
  restaurant: ObjectId;
  table?: ObjectId | ITable;
  customer?: ObjectId;
  orderType: 'dine-in' | 'delivery' | 'go-to';
  status: 'pending' | 'confirmed' | 'preparing' | 'served' | 'delivered' | 'paid' | 'cancelled';
  paymentStatus: 'waiting_paid' | 'unpaid' | 'partial' | 'paid' | 'refunded';
  totalAmount: number;
  itemsCount: number;
  items: ObjectId[]; // Có thể bỏ nếu dùng OrderItem collection
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

  paidAt?: Date;
  staff?: ObjectId; // Thêm để theo dõi nhân viên xử lý
  reservation?: ObjectId; // Thêm để liên kết với đặt bàn
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderId: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    restaurant: { type: ObjectId, ref: 'Restaurant', required: true, index: true },
    table: { type: ObjectId, ref: 'Table', index: true },
    customer: { type: ObjectId, ref: 'User' },
    orderType: {
      type: String,
      enum: ['dine-in', 'delivery', 'to-go'],
      required: true,
    },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'preparing', 'delivered', 'served', 'paid', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['waiting_paid', 'unpaid', 'partial', 'paid', 'refunded'],
      default: 'unpaid',
      index: true,
    },
    totalAmount: { type: Number, default: 0, min: 0 },
    itemsCount: { type: Number, default: 0, min: 0 },
    items: [{ type: ObjectId, ref: 'OrderItem' }],
    notes: { type: String, trim: true },
    servedAt: { type: Date },
    // delivery
    deliveryInfo: {
      name: String,
      phone: String,
      address: String,
      note: String,
    },
    deliveredAt: { type: Date },
    paidAt: { type: Date },
    staff: { type: ObjectId, ref: 'User' },
    reservation: { type: ObjectId, ref: 'Reservation' },
  },
  { timestamps: true },
);

OrderSchema.index({ restaurant: 1, status: 1, createdAt: -1 });
OrderSchema.index({ table: 1, status: 1 });
OrderSchema.index({ customer: 1, createdAt: -1 });

export const Order = model<IOrder>('Order', OrderSchema);
