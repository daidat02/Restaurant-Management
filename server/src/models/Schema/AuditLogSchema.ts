import { Schema, model, Document } from 'mongoose';

export interface IAuditLog extends Document {
  action: string;
  // Bổ sung restaurantId để super-manager lọc log theo chi nhánh siêu tốc
  restaurantId: Schema.Types.ObjectId;
  actor?: Schema.Types.ObjectId;
  // Lưu thêm thông tin tĩnh tại thời điểm log để tránh việc user bị xóa mất trong tương lai dẫn đến mất log
  actorInfo?: {
    name: string;
    role: string;
  };
  targetType: 'order' | 'table' | 'menuItem' | 'user' | 'payment' | 'restaurant' | 'system';
  targetId: Schema.Types.ObjectId;
  // Tóm tắt ngắn gọn bằng chữ để hiển thị nhanh lên danh sách Frontend
  summary: string;
  meta?: any;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },

    // Thêm ref tới model Restaurant của bạn (điều chỉnh tên ref nếu khác)
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true, index: true },

    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    actorInfo: {
      name: { type: String },
      role: { type: String },
    },
    targetType: {
      type: String,
      enum: ['order', 'table', 'menuItem', 'user', 'payment', 'restaurant', 'system'],
      required: true,
      index: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    summary: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

// COMPOUND INDEXES NÂNG CAO:
// Giúp Admin và Super Manager vừa lọc theo chi nhánh, vừa lọc theo loại bảng, vừa sắp xếp theo thời gian mới nhất cực mượt
AuditLogSchema.index({ restaurantId: 1, createdAt: -1 });
AuditLogSchema.index({ restaurantId: 1, targetType: 1, targetId: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);
