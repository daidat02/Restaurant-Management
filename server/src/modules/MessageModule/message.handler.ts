import { Socket, Server as SocketServerIO } from 'socket.io';
import { canAccessTenant, type SocketCustom } from '../../middlewares/auth.middleware.js';
import DB_Connection from '../../models/DB_Connection.js';
import messageService from './message.service.js';

// Handler socket cho chat: join/leave conversation + gửi tin + typing indicator.
// Q1: chỉ member của conversation (cùng tenant) được join room conversation_<id>.
export const messageHandler = (io: SocketServerIO, socket: SocketCustom) => {
  // Gửi tin qua socket: persist tin + ack người gửi + broadcast tới các socket khác trong phòng.
  // Dùng emitNewMessage=false để service không emit trùng; handler tự ack người gửi (thay tin
  // tạm optimistic) và chỉ emit "new_message" cho các socket khác (tránh trùng tin gửi đi).
  socket.on(
    'send_message',
    async (
      payload: { conversationId?: string; text?: string },
      ack?: (res: { code: number; message?: string; data?: unknown }) => void,
    ) => {
      try {
        const userId = String(socket.user?.userId ?? '');
        const role = String(socket.user?.role ?? '');
        const conversationId = payload?.conversationId;
        const text = payload?.text ?? '';

        if (!conversationId || !userId) {
          ack?.({ code: 400, message: 'Thiếu thông tin hội thoại' });
          return;
        }

        const result = await messageService.sendMessage(
          conversationId,
          userId,
          role,
          text,
          false,
        );

        if (result.code !== 201 || !result.data) {
          ack?.({ code: result.code, message: result.message });
          return;
        }

        // Ack cho người gửi kèm tin thật (thay tin tạm optimistic)
        ack?.({ code: 201, message: result.message, data: result.data });
        // Broadcast tới các socket khác trong phòng conversation_<id>
        socket.to(`conversation_${conversationId}`).emit('new_message', {
          message: result.data.message,
        });
      } catch (error) {
        console.error('send_message error:', error);
        ack?.({ code: 500, message: 'Lỗi khi gửi tin nhắn' });
      }
    },
  );

  socket.on('join_conversation', async (conversationId: string) => {
    try {
      const userId = String(socket.user?.userId ?? '');
      if (!conversationId || !userId) {
        socket.emit('room_error', { message: 'Thiếu thông tin hội thoại' });
        return;
      }

      const conversation = await DB_Connection.Conversation.findById(conversationId)
        .select('restaurantId members')
        .exec();
      if (!conversation) {
        socket.emit('room_error', { message: 'Không tìm thấy hội thoại' });
        return;
      }

      const isMember = conversation.members.some(
        (m: { userId: unknown }) => String(m.userId) === userId,
      );
      const tenantOk = canAccessTenant(socket.user, String(conversation.restaurantId));

      if (!isMember || !tenantOk) {
        socket.emit('room_error', { message: 'Bạn không phải thành viên hội thoại này' });
        return;
      }

      socket.join(`conversation_${conversationId}`);
      console.log(`Client ${socket.id} tham gia phòng conversation_${conversationId}`);
    } catch (error) {
      console.error('join_conversation error:', error);
      socket.emit('room_error', { message: 'Lỗi khi tham gia hội thoại' });
    }
  });

  socket.on('leave_conversation', (conversationId: string) => {
    if (!conversationId) return;
    const roomName = `conversation_${conversationId}`;
    socket.leave(roomName);
    console.log(`Client ${socket.id} rời phòng ${roomName}`);
  });

  // Typing indicator — forward tới các socket khác trong room conversation
  socket.on('typing', (payload: { conversationId?: string; isTyping?: boolean }) => {
    const conversationId = payload?.conversationId;
    if (!conversationId) return;
    socket.to(`conversation_${conversationId}`).emit('typing', {
      conversationId,
      userId: String(socket.user?.userId ?? ''),
      isTyping: !!payload?.isTyping,
    });
  });
};
