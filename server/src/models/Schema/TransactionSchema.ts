import { Schema, model, Document, type Types } from 'mongoose';

export type TransactionType = 'restaurant-fee' | 'trial-expire';

export interface ITransaction extends Document {
  restaurant: Types.ObjectId;
  /** Chủ sở hữu nhà hàng (role admin). */
  ownerId: Types.ObjectId;
  amount: number;
  cycleMonths: 1 | 3 | 6 | 12;
  type: TransactionType;
  status: 'paid';
  paidUntil: Date;
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
    amount: { type: Number, required: true, min: 0 },
    cycleMonths: { type: Number, enum: [1, 3, 6, 12], required: true },
    type: { type: String, enum: ['restaurant-fee', 'trial-expire'], default: 'restaurant-fee' },
    status: { type: String, enum: ['paid'], default: 'paid' },
    paidUntil: { type: Date, required: true },
  },
  { timestamps: true },
);

export const Transaction = model<ITransaction>('Transaction', TransactionSchema);
