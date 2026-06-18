import { Socket , Server as SocketServerIO } from "socket.io";

export const orderHandler = (io: SocketServerIO ,socket: Socket) => {    
    // Client tham gia phòng của nhà hàng
    socket.on('init_orders', (restaurantId: string) => {
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