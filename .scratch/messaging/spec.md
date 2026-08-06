# SPEC — Messaging v2: Socket Send + Cross-Chain Admin + Group Management

> Ngày: 04/08/2026 · Nhánh: `feature/messaging-socket-send` · Được grill-me chốt 16 quyết định.

## 0. Tổng quan thay đổi

Phase này bao gồm 3 nhóm thay đổi lớn so với messaging v1 (socket join/leave/typing):

1. **Gửi tin nhắn qua socket event** (đã commit) — thay REST API POST.
2. **Fix bug admin không tạo được hội thoại** + thay đổi flow tạo nhóm.
3. **Thêm thành viên trong header khung chat** + tab "Nội bộ / Tất cả" cho admin.

---

## 1. Gửi tin nhắn qua Socket Event (đã hoàn tất)

### 1.1 Server

- **Socket handler** `send_message` trong `message.handler.ts`:
  - Nhận `{ conversationId, text }` từ client.
  - Gọi `messageService.sendMessage(conversationId, userId, role, text, false)`.
  - `emitNewMessage=false`: service **không** tự emit `new_message` tới room.
  - Handler **ack** người gửi: `{ code: 201, data: { message, conversation } }`.
  - Handler **broadcast** `new_message` tới các socket khác trong room `conversation_<id>` (trừ sender).
  - Service vẫn emit `conversation_updated` tới `user_<memberId>` của các member khác (skip sender).

### 1.2 Client

- `use-messaging.tsx` hàm `send()`:
  - Optimistic append tin tạm (`temp_${Date.now()}`).
  - `socket.timeout(10000).emit('send_message', payload, ack)`.
  - Trên ack thành công: thay tin tạm bằng tin thật + update `lastMessage` trong list conv.
  - Trên lỗi/timeout: gỡ tin tạm + toast error.
  - Loại bỏ import `sendMessage` từ `message.api.ts` (không còn dùng HTTP POST để gửi).

### 1.3 Test

- 2 test socket mới trong `message.test.ts`:
  - `send_message` ack thành công + broadcast `new_message` tới member khác.
  - `send_message` text rỗng → ack 400.

---

## 2. Fix Bug Admin + Thay Đổi Flow Tạo Nhóm

### 2.1 Root Cause Bug

Admin (chủ chuỗi) thấy toàn bộ nhân viên trong picker (cross-chain). Khi chọn member thuộc nhà hàng khác → `createConversation` validate `belongsToRestaurant(user, restaurantId)` → 403 "Thành viên không thuộc nhà hàng này". → Admin không tạo được hội thoại.

### 2.2 Thay đổi Group Creation

| Trước | Sau |
|---|---|
| Phải chọn `memberIds` ≥ 1 + có `name` | Chỉ cần `name`. Nhóm tạo ra chỉ có creator. |
| Member picker bắt buộc | Member thêm sau qua header |
| Validate tất cả member cùng `restaurantId` | Giữ nguyên — nhóm gói cứng 1 nhà hàng |

**Server (`conversation.service.ts`):**
- Bỏ validate `memberIds.length === 0` ở đầu.
- Group creation: nếu `memberIds` không truyền hoặc rỗng → tạo group chỉ có creator.
- Nếu `memberIds` có truyền (từ old flow) → vẫn validate từng member (backward compat).

**Client (`MessageModal.tsx`):**
- Form tạo nhóm: chỉ cần nhập `name`. Bỏ `memberIds` selection step.
- Sau khi tạo group → tự động join conversation → mở khung chat → hiện header với nút "Thêm thành viên".

### 2.3 Thêm Thành Viên Trong Header

Khi mở một group conversation, header hiện:
- Tên nhóm
- Danh sách avatar member (tối đa 3 visible + badge `+N`)
- Nút **"Thêm thành viên"** (chỉ creator/group admin thấy)

Nhấn nút → mở modal picker:
- Filter đúng `restaurantId` của group.
- Danh sách member đã chọn (không cho chọn trùng).
- Nút "Xoá" cạnh mỗi member đã chọn (chỉ creator).
- Nút "Lưu" để xác nhận thay đổi.

**Server:**
- New endpoint (REST): `POST /api/conversations/:id/members` — thêm member vào group.
  - Validate: chỉ creator (role `admin` trong members) mới được phép.
  - Validate: member mới phải thuộc `restaurantId` của group.
  - Validate: không trùng member.
  - Persist → emit `conversation_updated` tới tất cả member.
- New endpoint: `DELETE /api/conversations/:id/members/:userId` — gỡ member.
  - Validate: chỉ creator + không gỡ chính mình.
  - Persist → emit `conversation_updated` tới remaining member.

---

## 3. Tab "Nội Bộ" / "Tất Cả" Cho Admin

### 3.1 Tab Structure

| Role | Tab |
|---|---|
| Manager / Staff | Chỉ 1 tab: **Nội bộ** (nhà hàng đang chọn) |
| Admin | 2 tab: **Nội bộ** + **Tất cả** |

### 3.2 "Nội Bộ" Tab

- Lọc conversation theo `activeRestaurantId`.
- **1-1 direct**: chỉ hiện khi counterpart thuộc `activeRestaurantId`.
- **Group**: chỉ hiện khi group's `restaurantId` = `activeRestaurantId`.

### 3.3 "Tất Cả" Tab (Admin Only)

- Hiện **tất cả** conversation mà admin là member (bất kể nhà hàng).
- Mỗi mục hiện **badge nhà hàng** của counterpart (1-1) hoặc group (group).

### 3.4 Cross-Chain 1-1 (Admin ↔ Staff nhà hàng khác)

- `restaurantId` của direct conversation = **nhà hàng của counterpart** (không phải admin's active restaurant).
- Hiện trong tab "Tất cả" của admin.
- Khi admin switch tenant sang nhà hàng của counterpart → conv xuất hiện trong tab "Nội bộ".
- `findDirect` dedupe theo cặp user (không scope `restaurantId`).

### 3.5 Hiển Thị Nhà Hàng Cho Admin

Admin thấy tên nhà hàng của counterpart/nhóm tại **cả 3 nơi**:
1. **List hội thoại** (tab "Tất cả"): badge nhà hàng cạnh tên.
2. **Header khung chat**: nhãn nhà hàng cạnh tên đối phương.
3. **Picker chọn người** (tạo 1-1): group theo nhà hàng.

---

## 4. Switch Tenant Behavior

- Khi admin switch tenant (active restaurant thay đổi):
  - Tab "Nội bộ" cập nhật danh sách theo active restaurant.
  - **Giữ nguyên** active conversation đang mở.
  - Nếu active conv không còn trong "Nội bộ" (counterpart thuộc nhà hàng khác) → vẫn hiện ở tab "Tất cả".

---

## 5. Changelog So Với V1

| File | Thay đổi |
|---|---|
| `message.handler.ts` | Thêm `send_message` event handler |
| `message.service.ts` | Fix `io` scope bug (hoist `getIO()`) |
| `conversation.service.ts` | Bỏ bắt buộc `memberIds` khi tạo group |
| `conversation.routes.ts` | Thêm route `POST /:id/members` + `DELETE /:id/members/:userId` |
| `use-messaging.tsx` | `send()` dùng socket emit + ack thay vì REST API |
| `message.api.ts` | Loại bỏ `sendMessage` (client không còn dùng) |
| `MessageModal.tsx` | Thêm tab Nội bộ/Tất cả + header group member picker |
| `MessageSchema.ts` | Có thể cần field `restaurantId` cho group (đã có) |
| `ConversationSchema.ts` | Có thể cần update `findDirect` không scope `restaurantId` |