# 02 — Socket: user_<id> cho mọi role + conversation.handler + presence

**What to build:** Hạ tầng realtime cho tin nhắn: user auto-join `user_<id>`, handler join/leave conversation + typing, online presence, và emit `new_message`/`conversation_updated` từ service (ticket 01).

**Blocked by:** 01.

**Status:** done

**What to change:**
- [ ] `server/src/middlewares/auth.middleware.ts` (block ~dòng 341-345): mọi role **không phải customer** join cả `restaurant_<id>` (giữ) **và** `user_<userId>` (mới).
- [ ] Tạo `server/src/modules/MessageModule/message.handler.ts`: events `join_conversation`, `leave_conversation` (check member + tenant qua DB; rủi ro → `room_error`), `typing` (forward `socket.to(room)`).
- [ ] `server/src/sockets/index.ts`: gắn `messageHandler(io, socket)`; trên `connection` emit `user_online` tới các room `restaurant_<id>` mà user thuộc; trên `disconnect` emit `user_offline`.
- [ ] Quay lại service `message.service.ts` (ticket 01): method gửi tin → persist rồi `getIO().to('conversation_'+id).emit('new_message', { message })`; emit `conversation_updated` tới `user_<memberId>` của từng member (trừ sender) với `lastMessage` + `unreadCount` mới.
- [ ] Giữ cấu trúc `SocketCustom.user` (đã có `userId`, `role`, `restaurantIds`) — dùng cho presence.

**Note:** Không đổi tên event hiện có. Test thủ công bằng 2 socket client (token 2 user cùng nhà hàng).