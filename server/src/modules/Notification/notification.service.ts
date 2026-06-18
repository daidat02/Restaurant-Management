import { getIO } from "../../configs/socketsConfig.js";
import type { INotification } from "../../models/Schema/NotificationSchema.js";
import type { ServiceResponse } from "../../shared/type.js";
import notificationRepository from "./notification.repository.js";


class NotificationService {

    async createNewNotification (payload : Partial<INotification>,targetRoom:string):Promise<ServiceResponse<INotification>>{
        const newNoti = await notificationRepository.createNotification(payload);

        const io = getIO();
        io.to(targetRoom).emit('new_notification',{
            notiData:newNoti
        });
        return {
            data:newNoti,
            code:201,
            message:'Vừa nhận thông báo mới'
        }
    }

    async getNotificationsByRestaurant(
        restaurantId: string,
        page = 1,
        limit = 20
    ): Promise<ServiceResponse<INotification[]>> {
        const skip = (page - 1) * limit;
        const list = await notificationRepository.getRestaurantNotifications(restaurantId, limit, skip);

        return {
        data: list,
        code: 200,
        message: "Lấy danh sách thông báo thành công",
        };
    }

    // 3. Đọc 1 thông báo cụ thể
    async readSingleNotification(notificationId: string): Promise<ServiceResponse<INotification | null>> {
        const updatedNoti = await notificationRepository.markAsRead(notificationId);
        
        return {
            data: updatedNoti,
            code: 200,
            message: updatedNoti ? "Đã đọc thông báo" : "Không tìm thấy thông báo",
        };
    }

    // 4. Đọc tất cả thông báo của nhà hàng
    async readAllRestaurantNotifications(restaurantId: string): Promise<ServiceResponse<null>> {
        await notificationRepository.markAllAsRead({restaurant:restaurantId,isRead: false});
        
        return {
        data: null,
        code: 200,
        message: "Đã đánh dấu đọc tất cả thông báo",
        };
    }

}


export default new NotificationService();