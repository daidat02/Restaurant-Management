import { Socket , Server as SocketServerIO } from "socket.io";



export const paymentHandler = (io:SocketServerIO,socket:Socket)=>{
    
    socket.on('subscribe_payment',(paymentId:string)=>{
        console.log('Payment: ', paymentId)
        const roomName = `payment_${paymentId}`
        socket.join(roomName);
        console.log(`Client ${socket.id} tham gia phòng ${roomName}`);
    });

    socket.on('unsubscribe_payment',(paymentId:string)=>{
        const roomName = `payment_${paymentId}`
        socket.leave(roomName);
        console.log(`Client ${socket.id} rời Phòng ${roomName}`);
    });
} 