import { Socket, Server as SocketServerIO } from "socket.io";

/**
 * Handler socket cho thanh toán gói cước.
 * Client join phòng `subscription_payment_<transactionId>` để nhận cập nhật realtime
 * khi webhook/return xác nhận thanh toán.
 */
export const subscriptionPaymentHandler = (io: SocketServerIO, socket: Socket) => {
  socket.on("subscribe_subscription_payment", (transactionId: string) => {
    const roomName = `subscription_payment_${transactionId}`;
    socket.join(roomName);
    console.log(`Client ${socket.id} tham gia phòng ${roomName}`);
  });

  socket.on("unsubscribe_subscription_payment", (transactionId: string) => {
    const roomName = `subscription_payment_${transactionId}`;
    socket.leave(roomName);
    console.log(`Client ${socket.id} rời Phòng ${roomName}`);
  });
};
