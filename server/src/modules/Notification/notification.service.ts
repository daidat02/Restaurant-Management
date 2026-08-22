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

    // 1b. Lấy thông báo TOÀN CHUỖI cho admin (chủ chuỗi)
    async getChainNotifications(
        restaurantIds: string[],
        page = 1,
        limit = 20
    ): Promise<ServiceResponse<INotification[]>> {
        const skip = (page - 1) * limit;
        const list = await notificationRepository.getChainNotifications(restaurantIds, limit, skip);

        return {
        data: list,
        code: 200,
        message: "Lấy danh sách thông báo toàn chuỗi thành công",
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

    /**
     * Tạo thông báo NỀN TẢNG cho super-admin (marker: restaurant = null)
     * và đẩy realtime vào room 'platform' (mọi session super-admin tự join khi connect).
     */
    async createPlatformNotification(payload: {
        type: INotification["type"];
        message: string;
        data?: Record<string, unknown>;
    }): Promise<void> {
        const noti = await notificationRepository.createNotification({
            type: payload.type,
            message: payload.message,
            data: payload.data,
            restaurant: null,
            user: null,
        });

        const io = getIO();
        io.to("platform").emit("platform_notification", { notiData: noti });
    }

    // Danh sách thông báo nền tảng (super-admin)
    async getPlatformNotifications(page = 1, limit = 20): Promise<ServiceResponse<INotification[]>> {
        const skip = (page - 1) * limit;
        const list = await notificationRepository.getPlatformNotifications(limit, skip);
        return {
            data: list,
            code: 200,
            message: "Lấy thông báo nền tảng thành công",
        };
    }

    // Đọc tất cả thông báo nền tảng
    async readAllPlatformNotifications(): Promise<ServiceResponse<null>> {
        await notificationRepository.markAllAsRead({ restaurant: null, isRead: false });
        return {
            data: null,
            code: 200,
            message: "Đã đọc tất cả thông báo nền tảng",
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