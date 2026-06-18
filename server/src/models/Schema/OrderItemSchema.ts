import { Schema, model, Document } from 'mongoose';
import {type ObjectId } from 'mongoose'

const ObjectId = Schema.Types.ObjectId;

export interface IOrderItemDocument extends IOrderItem{
  _id: ObjectId;
}

export interface IOrderItem extends Document {
  order: ObjectId;
  menuItem: ObjectId;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  note?: string;
  toppings?: { name: string; price: number }[];
  status: 'pending' | 'preparing' | 'served';
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  order: { type: ObjectId, ref: 'Order', required: true, index: true },
  menuItem: { type: ObjectId, ref: 'MenuItem', required: true },
  nameSnapshot: { type: String, required: true },
  priceSnapshot: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  note: { type: String, trim: true }, 
  status: {
    type: String,
    enum: ['pending', 'preparing', 'served'],
    default: 'pending'
  },
  toppings: [{ name: String, price: Number }], 
}, { timestamps: true });

OrderItemSchema.index({ order: 1, menuItem: 1, note: 1 }); // Có thể bỏ nếu không cần unique

export const OrderItem = model<IOrderItem>('OrderItem', OrderItemSchema);