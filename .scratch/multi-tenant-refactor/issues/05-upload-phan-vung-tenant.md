# 05 — Upload ảnh phân vùng theo tenant + kiểm tra ownership

**What to build:** Ảnh upload của mỗi nhà hàng được cất riêng theo tenant, và chỉ nhà hàng sở hữu ảnh mới được xoá — chấm dứt tình trạng ảnh mọi tenant trộn chung 1 thư mục và ai cũng xoá được ảnh người khác.

**Blocked by:** 02 — JWT thêm tenantId + middleware verifyTenant + switch-tenant.

**Status:** done ✅

> **Kết quả test thực tế (upload + delete, server localhost:8000):**
> - Upload ảnh → folder đúng tenant: token X → `restaurants/69fcc.../...`, token Y → `restaurants/69fb58.../...`, khách (không tenant) → `restaurants/_public/`.
> - Xoá ảnh X bằng token Y → `400 "Bạn không có quyền xóa ảnh của nhà hàng khác!"`.
> - Xoá ảnh X bằng token X → 200; xoá ảnh `_public` bằng token khách → 200.
> - Upload không token → 401 (route đã gắn `verifyToken`).
> - Typecheck server pass.

Chi tiết kỹ thuật:
- CloudinaryStorage trong `multer.middleware.ts` đổi folder tĩnh `restaurants-system` → động `restaurants/<restaurantId>` (lấy từ `req.user.restaurantId` claim hoặc query param); không có ngữ cảnh tenant → `restaurants/_public`.
- Bỏ bug double-upload: trước đây `uploadRepository.uploadImage(file.path)` upload lại từ URL → tạo bản copy thứ 2 + orphan. Giờ dùng trực tiếp `file.path`/`file.filename` (secure_url/public_id) từ CloudinaryStorage.
- Route upload/delete gắn `verifyToken`; `delete` nhận `requesterTenantId` từ claim và chặn nếu public_id nằm trong folder `restaurants/<tenantId>/` khác tenant người gọi.

- [x] Ảnh upload vào folder chứa `restaurantId` đúng tenant (verify public_id/folder trên Cloudinary).
- [x] User nhà hàng A không xoá được ảnh của nhà hàng B (test curl delete ảnh B bằng token A → bị chặn).
- [x] User đúng tenant xoá được ảnh của mình.
- [x] Ảnh món ăn hiển thị đúng trong từng nhà hàng.
- [x] Typecheck server pass.
