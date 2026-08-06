# 01 — Model Conversation + Message + REST API

**What to build:** Khối nền dữ liệu + REST cho nhắn tin nội bộ. Copy pattern module `Notification` (schema → controller → service → repository → routes).

**Blocked by:** (none — bắt đầu từ đây).

**Status:** done

**What to change:**
- [ ] Tạo `server/src/models/Schema/ConversationSchema.ts` + `MessageSchema.ts` (schema theo spec mục 3). Đăng ký **cả hai** vào `server/src/models/DB_Connection.ts` (import + interface `IDBConnection` + object `DB_Connection`).
- [ ] Tạo module `server/src/modules/MessageModule/`:
  - `conversation.routes.ts` + `message.routes.ts` (hoặc 1 `message.routes.ts`) — mount vào `server/src/router/index.ts` dưới `/conversations`. Dùng `verifyToken`, `verifyTenant`, `intersectRestaurantIds` từ `middlewares/auth.middleware.js`.
  - `conversation.controller.ts`, `message.controller.ts` (pattern notification.controller.ts, dùng `AuthRequest`, `req.tenantId`, `req.user.restaurantIds`).
  - `conversation.service.ts`, `message.service.ts` (trả `ServiceResponse`).
  - `conversation.repository.ts`, `message.repository.ts` (truy vấn DB + aggregation unread).
- [ ] Implement 5 endpoint (spec mục 4):
  1. `GET /api/conversations` — list conv của user + `lastMessage` + `unreadCount`, sort `lastMessage.createdAt desc`.
  2. `POST /api/conversations` — tạo direct/group; **group chỉ manager/admin**; direct idempotent; validate members cùng tenant + `isActive`.
  3. `GET /api/conversations/:id/messages?page&limit` — phân trang 20; user là member.
  4. `POST /api/conversations/:id/messages` — persist Message, cập nhật `lastMessage`, validate text ≤ 2000. (Emit socket để **ticket 02** gắn; ticket này chỉ persist + trả data.)
  5. `POST /api/conversations/:id/read` — set `lastReadAt = now`.
- [ ] **Bảo mật:** mọi route load conv rồi kiểm tra `conversation.restaurantId ∈ req.user.restaurantIds` + user là member → ngược lại 403, không leak sự tồn tại.
- [ ] Tạo `server/src/test/message.test.ts` (pattern `server/src/test/socket.test.ts`): test đăng ký schema build model; test service create conversation direct idempotent; test unreadCount. Chạy `npm test` (vitest) pass.

**Note:** Phase này KHÔNG emit socket (để ticket 02). Không đụng auth middleware.