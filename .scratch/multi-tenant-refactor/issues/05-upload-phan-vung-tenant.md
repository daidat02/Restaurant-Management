# 05 — Upload ảnh phân vùng theo tenant + kiểm tra ownership

**What to build:** Ảnh upload của mỗi nhà hàng được cất riêng theo tenant, và chỉ nhà hàng sở hữu ảnh mới được xoá — chấm dứt tình trạng ảnh mọi tenant trộn chung 1 thư mục và ai cũng xoá được ảnh người khác.

**Blocked by:** 02 — JWT thêm tenantId + middleware verifyTenant + switch-tenant.

**Status:** ready-for-agent

Chi tiết kỹ thuật:
- Cloudinary folder hiện tại cố định (`restaurants-system`) → `restaurants/<restaurantId>/...` cho mọi đường upload (đơn lẻ + multiple).
- Đường upload nhận `restaurantId` từ context hợp lệ: với admin/manager/staff dùng `req.tenantId`; với route công khai dùng param/body.
- Xoá ảnh (`DELETE /upload`): kiểm tra ảnh thuộc tenant nào (public_id/folder) và chỉ cho phép nếu thuộc tenant của người gọi.
- Xem xét gắn `verifyToken` cho route upload (hiện công khai); nếu giữ công khai thì ownership check vẫn bắt buộc khi xoá.

- [ ] Ảnh upload vào folder chứa `restaurantId` đúng tenant (verify public_id/folder trên Cloudinary).
- [ ] User nhà hàng A không xoá được ảnh của nhà hàng B (test curl delete ảnh B bằng token A → bị chặn).
- [ ] User đúng tenant xoá được ảnh của mình.
- [ ] Ảnh món ăn hiển thị đúng trong từng nhà hàng.
- [ ] Typecheck server pass.
