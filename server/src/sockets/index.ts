import { Socket, Server as SocketIOServer } from "socket.io";
import { authenticateToken, canAccessTenant, type SocketCustom } from "../middlewares/auth.middleware.js";
import { orderHandler } from "../modules/OrderModule/order.handler.js";
import { paymentHandler } from "../modules/PaymentModule/payment.handler.js";

export const ResgisterSocketIO = (io:SocketIOServer) =>{
    // Mọi kết nối phải xác thực token (user thuộc tenant, hoặc token KDS hợp lệ)
    io.use(authenticateToken);

    io.on("connection", (socket: SocketCustom) => {
        console.log("User connected:", socket.id, "| role:", socket.user?.role);

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

        socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        });

    });
} 
