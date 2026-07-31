import { Socket , Server as SocketServerIO } from "socket.io";
import { canAccessTenant, type SocketCustom } from "../../middlewares/auth.middleware.js";

export const orderHandler = (io: SocketServerIO ,socket: SocketCustom) => {    
    // Client tham gia phòng của nhà hàng (chỉ khi thuộc tenant đó)
    socket.on('init_orders', (restaurantId: string) => {
        if (!canAccessTenant(socket.user, restaurantId)) {
            console.log(`Client ${socket.id} BỊ TỪ CHỐI vào phòng restaurant_${restaurantId} (init_orders)`);
            socket.emit('room_error', { message: 'Bạn không thuộc nhà hàng này!' });
            return;
        }
        const roomName = `restaurant_${restaurantId}`;
        socket.join(roomName);
        console.log(`Client ${socket.id} tham gia phòng ${roomName}`);
    });

    socket.on('join_order',(orderId:string)=>{
        const roomName = `order_${orderId}`;
        socket.join(roomName);
        console.log(`Client ${socket.id} tham gia phòng ${roomName}`);
    });

    socket.on('leave_orders', (restaurantId: string) => {
        const roomName = `restaurant_${restaurantId}`;
        socket.leave(roomName);
        console.log(`Client ${socket.id} rời phòng ${roomName}`);
    });

    socket.on('leave_order', (orderId: string) => {
        const roomName = `order_${orderId}`;
        socket.leave(roomName);
        console.log(`Client ${socket.id} rời phòng ${roomName}`);
    });

};
