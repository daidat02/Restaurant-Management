import mongoose,{ Types, Document,Schema,model } from 'mongoose';
import {type ObjectId } from 'mongoose'

const ObjectId = Schema.Types.ObjectId;

export interface IPaymentDocument extends IPayment{
  _id:ObjectId;
}

export interface IPayment extends Document {
  order: Types.ObjectId;
  orderCode:Number;
  amount: number;
  method: 'cash' | 'card' | 'ewallet'|'banking';
  provider?: string;
  status: 'initiated' | 'authorized' | 'captured' | 'failed' | 'refunded'|'cancelled';
  transactionId?: string;
  raw?: any;
  refundReason?: string; // Thêm để ghi lý do hoàn tiền
  paymentDate?: Date; // Thêm để theo dõi thời gian thanh toán
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  order: { type: ObjectId, ref: 'Order', required: true, unique: true },
  orderCode:{type:Number },
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['cash', 'card', 'ewallet','banking'], required: true, index: true , default:'cash' },
  provider: { type: String, trim: true },
  status: { 
    type: String, 
    enum: ['initiated', 'authorized', 'captured', 'failed', 'refunded','cancelled'], 
    default: 'initiated', 
    index: true,
  },
  transactionId: { type: String, trim: true, index: true },
  raw: { type: Schema.Types.Mixed },
  refundReason: { type: String, trim: true },
  paymentDate: { type: Date },
}, { timestamps: true });

export const Payment =  model<IPayment>('Payment', PaymentSchema);