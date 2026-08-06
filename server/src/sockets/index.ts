import { Socket, Server as SocketIOServer } from "socket.io";
import { authenticateToken, canAccessTenant, type SocketCustom } from "../middlewares/auth.middleware.js";
import { orderHandler } from "../modules/OrderModule/order.handler.js";
import { paymentHandler } from "../modules/PaymentModule/payment.handler.js";
import { messageHandler } from "../modules/MessageModule/message.handler.js";
import DB_Connection from "../models/DB_Connection.js";

export const ResgisterSocketIO = (io:SocketIOServer) =>{
    // Mọi kết nối phải xác thực token (user thuộc tenant, hoặc token KDS hợp lệ)
    io.use(authenticateToken);

    io.on("connection", (socket: SocketCustom) => {
        console.log("User connected:", socket.id, "| role:", socket.user?.role);

        // Presence: thông báo cho các room restaurant_<id> mà user thuộc (trừ chính mình)
        const onlineRooms = (socket.user?.role === "kds" && socket.user?.restaurantIds)
            ? socket.user.restaurantIds
            : (socket.user?.role === "customer" ? [] : (socket.user?.restaurantIds ?? []));

        if (onlineRooms.length > 0) {
            const userId = String(socket.user?.userId ?? "");
            // Cần tên/avatar hiển thị cho online indicator
            DB_Connection.User.findById(socket.user?.userId)
                .select("name avatar")
                .exec()
                .then((user) => {
                    for (const restaurantId of onlineRooms) {
                        socket.to(`restaurant_${restaurantId}`).emit("user_online", {
                            userId,
                            name: user?.name,
                            avatar: user?.avatar,
                        });
                    }
                })
                .catch(() => {});
        }

        socket.on('init_room_restaurant',(restaurantId:string)=>{
            // Chỉ cho phép join room của nhà hàng mà user thực sự thuộc về
            if (!canAccessTenant(socket.user, restaurantId)) {
                console.log(`Client ${socket.id} BỊ TỪ CHỐI vào phòng restaurant_${restaurantId}`);
                socket.emit('room_error', { message: 'Bạn không thuộc nhà hàng này!' });
                return;
            }
            const roomName = `restaurant_${restaurantId}`
            socket.join(roomName);
            console.log(`Client ${socket.id} tham gia phòng Nhà hàng ${roomName}`)
        });

        socket.on('leave_restaurant', (restaurantId: string) => {
            const roomName = `restaurant_${restaurantId}`;
            socket.leave(roomName);
            console.log(`Client ${socket.id} rời phòng ${roomName}`);
        });
        
        orderHandler(io,socket);

        paymentHandler(io,socket);

        messageHandler(io, socket);

        socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        // Presence: báo offline tới các room restaurant_<id> của user (trừ chính mình — đã ngắt)
        const userId = String(socket.user?.userId ?? "");
        if (userId) {
            const rooms = (socket.user?.role === "kds" && socket.user?.restaurantIds)
                ? socket.user.restaurantIds
                : (socket.user?.role === "customer" ? [] : (socket.user?.restaurantIds ?? []));
            for (const restaurantId of rooms) {
                socket.to(`restaurant_${restaurantId}`).emit("user_offline", { userId });
            }
        }
        });

    });
} 
