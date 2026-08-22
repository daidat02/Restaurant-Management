import { Schema, model, Document, Types } from 'mongoose';
const ObjectId = Schema.Types.ObjectId;

export interface INotification extends Document {
  /** null = thông báo NỀN TẢNG (super-admin); có giá trị = thông báo tenant */
  user?: Types.ObjectId | null;
  /** null = thông báo NỀN TẢNG (super-admin); có giá trị = thông báo tenant */
  restaurant?: Types.ObjectId | null;
  type:
    | 'new_order'
    | 'orderUpdate'
    | 'new_reservation'
    | 'tableStatus'
    | 'promotion'
    | 'system'
    | 'subscription'
    | 'call_staff'
    | 'payment_request';
  message: string;
  description?: string;
  data?: any;
  isRead?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: ObjectId, ref: 'User', index: true },
    restaurant: { type: ObjectId, ref: 'Restaurant', index: true },
    type: {
      type: String,
      enum: [
        'new_order',
        'orderUpdate',
        'new_reservation',
        'tableStatus',
        'promotion',
        'system',
        'subscription',
        'call_staff',
        'payment_request',
      ],
      required: true,
      index: true,
    },
    message: { type: String, required: true },
    description: { type: String },
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

NotificationSchema.index({ user: 1, restaurant: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', NotificationSchema);
