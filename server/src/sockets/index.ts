import { Socket, Server as SocketIOServer } from "socket.io";
import { authenticateToken, canAccessTenant, type SocketCustom } from "../middlewares/auth.middleware.js";
import { orderHandler } from "../modules/OrderModule/order.handler.js";
import { paymentHandler } from "../modules/PaymentModule/payment.handler.js";
import { messageHandler } from "../modules/MessageModule/message.handler.js";
import { subscriptionPaymentHandler } from "./subscription.handler.js";
import DB_Connection from "../models/DB_Connection.js";

// Đếm số kết nối Socket đang active của từng user (chống mất trạng thái Online
// khi đóng 1 tab/thiết bị trong lúc còn tab khác đang mở).
const onlineConnections = new Map<string, Set<string>>();

export const ResgisterSocketIO = (io:SocketIOServer) =>{
    // Mọi kết nối phải xác thực token (user thuộc tenant, hoặc token KDS hợp lệ)
    io.use(authenticateToken);

    io.on("connection", (socket: SocketCustom) => {
        console.log("User connected:", socket.id, "| role:", socket.user?.role);

        const userId = String(socket.user?.userId ?? "");

        // Super-admin tự vào room 'platform' — nhận realtime thông báo nền tảng
        // (đăng ký mới, gia hạn/nâng cấp gói, sắp hết hạn...).
        if (socket.user?.role === "super-admin") {
            socket.join("platform");
        }

        const onlineRooms = (socket.user?.role === "kds" && socket.user?.restaurantIds)
            ? socket.user.restaurantIds
            : (socket.user?.role === "customer" ? [] : (socket.user?.restaurantIds ?? []));

        // Ghi nhận kết nối: chỉ báo online khi là KẾT NỐI ĐẦU TIÊN của user
        // (mở tab thứ 2 không phát lại user_online).
        const isFirstConnection = userId ? !onlineConnections.has(userId) : false;
        if (userId) {
            const connections = onlineConnections.get(userId) ?? new Set<string>();
            connections.add(socket.id);
            onlineConnections.set(userId, connections);
        }

        if (isFirstConnection && onlineRooms.length > 0) {
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
        
        // Presence snapshot: client connect lần đầu mới xong nên chưa biết ai đang online.
        // Trả về danh sách user đang kết nối trong các phòng restaurant mà socket này thuộc về.
        socket.on('get_online_presence', () => {
            const selfId = userId;
            if (!selfId) return;
            const rooms = (socket.user?.role === "kds" && socket.user?.restaurantIds)
                ? socket.user.restaurantIds
                : (socket.user?.role === "customer" ? [] : (socket.user?.restaurantIds ?? []));
            const emitted = new Set<string>();
            for (const restaurantId of rooms) {
                const socketIds = io.sockets.adapter.rooms.get(`restaurant_${restaurantId}`);
                if (!socketIds) continue;
                for (const socketId of socketIds) {
                    const other = io.sockets.sockets.get(socketId) as SocketCustom | undefined;
                    const otherId = other?.user?.userId ? String(other.user.userId) : "";
                    if (!otherId || otherId === selfId || emitted.has(otherId)) continue;
                    emitted.add(otherId);
                    socket.emit("user_online", { userId: otherId });
                }
            }
        });
        
        orderHandler(io,socket);

        paymentHandler(io,socket);

        messageHandler(io, socket);

        subscriptionPaymentHandler(io, socket);

        socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);

        // Trừ kết nối này khỏi counter; CHỈ báo offline khi user không còn
        // kết nối socket nào khác (nhiều tab/thiết bị vẫn giữ trạng thái Online).
        let isLastConnection = false;
        if (userId) {
            const connections = onlineConnections.get(userId);
            connections?.delete(socket.id);
            isLastConnection = !!connections && connections.size === 0;
            if (isLastConnection) onlineConnections.delete(userId);
        }

        // Presence: báo offline tới các room restaurant_<id> của user (trừ chính mình — đã ngắt)
        if (isLastConnection) {
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
