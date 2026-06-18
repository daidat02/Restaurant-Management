import { Schema, model, Document, Types } from 'mongoose';

export interface ITableDocument extends ITable {
  _id: Schema.Types.ObjectId;
}

export interface ITable extends Document {
  restaurant: Schema.Types.ObjectId;
  tableNumber: number;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'inactive';
  currentOrder?: Types.ObjectId | null;
  lastStatusUpdate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TableSchema = new Schema<ITable>(
  {
    restaurant: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    tableNumber: { type: Number, required: true },
    capacity: { type: Number, default: 2, min: 1 },
    status: {
      type: String,
      enum: ['available', 'occupied', 'reserved', 'inactive'],
      default: 'available',
      index: true,
    },
    currentOrder: { type: Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    lastStatusUpdate: { type: Date },
  },
  { timestamps: true },
);

TableSchema.index({ restaurant: 1, tableNumber: 1 }, { unique: true });

export const Table = model<ITable>('Table', TableSchema);
