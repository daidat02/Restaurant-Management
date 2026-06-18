import { Socket, Server as SocketIOServer } from "socket.io";
import { authenticateToken, type SocketCustom } from "../middlewares/auth.middleware.js";
import { orderHandler } from "../modules/OrderModule/order.handler.js";
import { paymentHandler } from "../modules/PaymentModule/payment.handler.js";

export const ResgisterSocketIO = (io:SocketIOServer) =>{
        
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        socket.on('init_room_restaurant',(restaurantId:string)=>{
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


