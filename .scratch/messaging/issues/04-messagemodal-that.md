# 04 — Gắn MessageModal thật (thay mock)

**What to build:** Thay toàn bộ mock trong `MessageModal` bằng dữ liệu + realtime từ `use-messaging`.

**Blocked by:** 03.

**Status:** done

**What to change:**
- [ ] `client/src/pages/Admin/MessageModal/MessageModal.tsx`: bỏ `MOCK_CONVERSATIONS`, `MOCK_MESSAGES_MAP`, state local cũ → dùng `use-messaging`.
  - Cột trái: search (client-side) + danh sách conv thật (avatar, online dot từ `onlineUserIds`, tên, `lastMessage`, thời gian, role, badge unread). Nút "+" tạo hội thoại (tìm user cùng nhà hàng theo role; manager/admin thêm tạo group + đặt tên).
  - Cột phải: header tên + online/typing; vùng cuộn bong bóng (tự nhận cerulean / người khác trắng); infinite scroll ngược phân trang; "đang gõ...".
  - Input: Enter/Ctrl+Enter gửi; chống trống; `maxLength=2000` + đếm ký tự.
- [ ] `markRead` khi mở conv; cập nhật unread khi nhận `new_message` ở conv khác.
- [ ] Giữ nguyên props `{ isOpen, onChangeOpenModal }`; thêm props tuỳ chọn `initialConversationId?` (cho ticket 05).
- [ ] Typecheck + build client pass; test tay: 2 user cùng nhà hàng nhắn realtime, F5 giữ đúng unread.

**Note:** Không sửa hook/API ở phase này nếu không cần — chỉ tiêu thụ.