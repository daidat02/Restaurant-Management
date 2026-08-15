import type { INotification } from '../models/Schema/NotificationSchema.js';
import notificationService from '../modules/Notification/notification.service.js';
import { registerJobHandler } from './handlers.js';

/**
 * ==========================================
 * JOB: create-notification (queue notification)
 * ==========================================
 * Queue "con" dùng chung cho mọi luồng ghi + emit 1 notification
 * (`new_order`, `orderUpdate`, `new_reservation`...):
 *   - payload: { payload: Partial<INotification>, targetRoom }.
 *   - Handler gọi `NotificationService.createNewNotification` (persist DB +
 *     emit `new_notification` qua `io.to(room)`, đúng quy tắc cấm global emit).
 *   - Được ENQUEUE từ order-fanout / payment-webhook để retry độc lập.
 *   - Redis down → addJob chạy inline CÙNG handler này.
 */

export interface CreateNotificationData {
  payload: Partial<INotification>;
  targetRoom: string;
}

const createNotification = async (data: CreateNotificationData): Promise<void> => {
  const { payload, targetRoom } = data;
  const result = await notificationService.createNewNotification(payload, targetRoom);
  if (result.code !== 201) {
    // Không throw để không kéo retry của job "cha" — notification là side-effect phụ.
    console.warn(`[Job create-notification] Không tạo được notification: ${result.message}`);
    return;
  }
  console.log(
    `[Job create-notification] Đã tạo notification type=${payload.type} → room ${targetRoom}`,
  );
};

registerJobHandler('create-notification', createNotification);

export default createNotification;