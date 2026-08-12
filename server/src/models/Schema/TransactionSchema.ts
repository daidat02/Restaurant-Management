import { Schema, model, Document, type Types } from 'mongoose';

export type TransactionType = 'restaurant-fee' | 'trial-expire';

export type TransactionStatus = 'pending' | 'paid' | 'cancelled';

export interface ITransaction extends Document {
  restaurant: Types.ObjectId;
  /** Chủ sở hữu nhà hàng (role admin). */
  ownerId: Types.ObjectId;
  /** Mã giao dịch dãy số hiển thị trên lịch sử thanh toán. */
  transactionId: string;
  amount: number;
  cycleMonths: 1 | 3 | 6 | 12;
  type: TransactionType;
  status: TransactionStatus;
  paidUntil: Date;
  /** Gói dịch vụ đã thanh toán (nếu chủ chọn gói cụ thể). */
  planKey?: string;
  planName?: string;
  /** Mã đơn PayOS (orderCode) — dùng để truy vết webhook. */
  orderCode?: number;
  /** Id link thanh toán PayOS. */
  paymentLinkId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITransactionDocument extends ITransaction {
  _id: Types.ObjectId;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    transactionId: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    cycleMonths: { type: Number, enum: [1, 3, 6, 12], required: true },
    type: { type: String, enum: ['restaurant-fee', 'trial-expire'], default: 'restaurant-fee' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending',
      index: true,
    },
    paidUntil: { type: Date, required: true },
    planKey: { type: String, default: undefined },
    planName: { type: String, default: undefined },
    orderCode: { type: Number, index: true },
    paymentLinkId: { type: String, trim: true },
  },
  { timestamps: true },
);

export const Transaction = model<ITransaction>('Transaction', TransactionSchema);
