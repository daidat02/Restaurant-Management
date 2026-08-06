# 05 — MailBoxPopover + Header realtime + âm thanh/toast

**What to build:** Bỏ mock trên Header, gắn realtime chung hook, thêm toast + âm thanh khi nhận tin mới.

**Blocked by:** 03, 04.

**Status:** done

**What to change:**
- [ ] `client/src/components/Header.tsx`: bỏ `mockMessages` (dòng ~33-50), bỏ `unreadMessagesCount` local → dùng `use-messaging`; badge unread **tổng** realtime trên icon Mail (state tăng/giảm theo `conversation_updated`/`new_message`).
- [ ] `client/src/pages/Admin/components/MailBoxPopover.tsx`: hiển thị 3–5 conv gần nhất từ hook chung (bỏ prop `messages` mock); unread nhỏ trên từng dòng; **click item → mở MessageModal tại đúng hội thoại**.
- [ ] `client/src/layouts/LayoutAdmin.tsx`: thêm state `openMessageWithConv`; truyền xuống `MessageModal` (`initialConversationId`); bấm menu "Tin Nhắn" sidebar vẫn mở modal (không chọn conv).
- [ ] Âm thanh: tạo `client/src/assets/message_sound.mp3` (pattern `notification_sound.mp3`) + đưa vào `use-messaging`; bật khi nhận `new_message` cho conv **khác đang mở**.
- [ ] Toast tin mới (sonner): tên người gửi + trích đoạn khi đến conv không mở.
- [ ] Typecheck + build client pass; test: popover badge unread realtime, click chuyển đúng conv, 2 tab phát âm thanh đúng bên không mở conv.

**Note:** Xong phase này = đạt spec mục 8.