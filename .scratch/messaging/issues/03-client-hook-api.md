# 03 — Client: types + message.api + hook use-messaging

**What to build:** Tầng client kết nối REST + socket cho nhắn tin, dùng chung cho MessageModal (ticket 04) và MailBoxPopover (ticket 05).

**Blocked by:** 01, 02.

**Status:** done

**What to change:**
- [ ] `client/src/types/message.type.ts`: `IConversation`, `IMessage`, `IMember`, mapping theo schema server.
- [ ] `client/src/api/message.api.ts` (pattern `client/src/api/notification.api.ts`): 5 hàm — `getConversations`, `createConversation`, `getMessages(convId, page, limit)`, `sendMessage(convId, text)`, `markRead(convId)`.
- [ ] Tạo `client/src/hooks/use-messaging.ts` (spec mục 6.2):
  - State: `conversations`, `activeConversationId`, `messagesMap`, `unreadMap`, `onlineUserIds: Set<string>`, `typingMap`.
  - Fetch conversations on mount; load messages (infinite scroll ngược) khi mở conv.
  - Socket (dùng singleton `client/src/configs/socket.io.ts`): `join_conversation`/`leave_conversation` theo conv mở; listen `new_message`, `conversation_updated`, `user_online`, `user_offline`, `typing`.
  - `sendMessage(text)` optimistic + `POST`; `markRead(convId)`; `emitTyping(isTyping)` debounce.
- [ ] Bỏ placeholder âm thanh message → chưa dùng ở phase này (để ticket 05).

**Note:** Chỉ hook + api, chưa gắn UI. Typecheck client pass.