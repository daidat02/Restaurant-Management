import { type ClientSession, type FilterQuery } from "mongoose";
import type { INotification } from "../../models/Schema/NotificationSchema.js";
import DB_Connection from "../../models/DB_Connection.js";

class NotificationRepository {
  // Tạo notification mới
  async createNotification(
    payload: Partial<INotification>,
    session?: ClientSession
  ): Promise<INotification> {
    const notification = new DB_Connection.Notification(payload);
    return session ? notification.save({ session }) : notification.save();
  }

  // LẤY THEO RESTAURANT: Dành cho app quản lý nhà hàng (Realtime chung)
  async getRestaurantNotifications(
    restaurant: string,
    limit = 20,
    skip = 0
  ): Promise<INotification[]> {
    return DB_Connection.Notification.find({ restaurant }) // Hoặc trường tương ứng trong Schema của bạn
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findNotifications(
    filter: FilterQuery<INotification>,
    limit = 20,
    skip = 0
  ): Promise<INotification[]> {
    return await DB_Connection.Notification.find(filter) 
      .skip(skip)
      .limit(limit)
      .exec();
  }

  // Đếm số lượng chưa đọc của nhà hàng
  async countUnread(restaurant: string): Promise<number> {
    return DB_Connection.Notification.countDocuments({ restaurant, isRead: false });
  }

  // Đánh dấu 1 thông báo đã đọc
  async markAsRead(notificationId: string): Promise<INotification | null> {
    return DB_Connection.Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    ).exec();
  }

  // Đánh dấu tất cả thông báo của nhà hàng đó đã đọc
  async markAllAsRead(filter: FilterQuery<INotification>): Promise<void> {
    await DB_Connection.Notification.updateMany(
      filter,
      { $set: { isRead: true } }
    );
  }
}

export default new NotificationRepository();