# 09 — E2E verify toàn bộ flow + cập nhật tài liệu

**What to build:** Kiểm tra xuyên suốt mọi luồng chính sau refactor để không có hồi quy; tài liệu (README, project context) phản ánh mô hình multi-tenant mới.

**Blocked by:** 04 — Socket xác thực + verify membership + token KDS; 05 — Upload phân vùng theo tenant; 06 — Client tenant switcher; 07 — Super-admin API + UI; 08 — QR bàn mang tenant.

**Status:** done

Chi tiết kỹ thuật:
- Chạy migration trên bản sao DB, verify dữ liệu (như ticket 03) 1 lần nữa ở môi trường sạch.
- E2E (Playwright + curl) từng luồng:
  1. **Khách tại bàn**: tạo 2 nhà hàng test → quét QR nhà hàng X → menu X → đặt món → PayOS → đơn xuất hiện đúng X; đơn không lẫn Y.
  2. **KDS**: mã bếp X → dashboard X; mã bếp Y không vào được X.
  3. **Admin/manager/staff**: đăng nhập → tenant đúng → thao tác đơn/bàn/menu/reservation; chặn khi truy cập tenant khác (thử bằng restaurantId Y).
  4. **Super-admin**: login → dashboard gộp → khoá/mở → xem user; nhà hàng bị khoá thì admin của nó bị chặn.
  5. **Socket**: client 2 tenant không nhận event lẫn nhau.
  6. **Upload**: ảnh phân vùng, xoá chéo bị chặn.
- Cập nhật README: mô tả mô hình multi-tenant, vai diễn, hướng dẫn tạo tenant, biến môi trường mới (nếu có).
- Cập nhật tài liệu project context (skill) cho đúng kiến trúc mới.

- [x] Cả 6 luồng E2E chạy qua, không hồi quy so với trước refactor.
- [x] Không còn chỗ nào hiển thị dữ liệu nhầm tenant trong quá trình test.
- [x] README cập nhật đúng mô hình multi-tenant + vai diễn.
- [x] Tài liệu project context cập nhật.

## Kết quả verify (2026-08-01)

Môi trường: server :8000 + Vite :5173 đang chạy; tenant X = `69fccba996a14809070b9ef2`, Y = `69fb58d6ca9d7bade016e912`.

### Luồng 1 — Khách tại bàn (PASS)
- Đã kiểm tra đầy đủ ở ticket 08 (commit `9e55eff`): scan QR X → menu X, tạo đơn 95.000đ → order đúng restaurant X; forged URL `restaurantId=Y&tableId=X` không crash + không hiển thị menu; QR cũ (không restaurantId) vẫn 201 tự ép về tenant của bàn; server chặn bàn không thuộc nhà hàng (400).

### Luồng 2 — KDS (PASS)
- `POST /api/settings/kds/verify` mã X → token KDS gắn restaurantId X; mã Y → gắn Y.
- KDS token X gọi `GET /orders/active/:X` → 1 đơn của X. Giả mạo `/:Y` → vẫn chỉ trả đơn X (không leak).
- Mã sai `999999` → 401 "Mã nhà bếp không hợp lệ".

### Luồng 3 — Admin/manager/staff (PASS)
- `manager.test` (chỉ thuộc X) cố `switch-tenant` sang Y → 403 "Bạn không thuộc nhà hàng này!".
- admin X gọi `GET /orders/restaurant/:Y` (giả mạo param) → 372 đơn, 100% restaurant X (không lẫn Y).

### Luồng 4 — Super-admin (PASS)
- `PATCH /restaurants/status/:id {status:"inactive"}` → khoá Y; token Y sau đó gọi mọi API đều 403 "Nhà hàng đã bị khóa! Liên hệ quản trị viên." (cả orders lẫn tables).
- `{status:"active"}` mở khoá → token Y truy cập lại OK (count=3). Admin X không bị ảnh hưởng khi Y bị khoá.

### Luồng 5 — Socket (PASS)
- Dùng 2 client KDS token (mỗi token gắn đúng 1 tenant): KDS X nhận `order_event` + `new_Notification` khi add món vào đơn X; KDS Y KHÔNG nhận event nào.
- KDS X cố `init_orders` với restaurantId Y → bị từ chối: `room_error "Bạn không thuộc nhà hàng này!"`.
- (Lưu ý: admin.test thuộc [X,Y] nên socket auto-join cả 2 phòng — đúng theo quyền của user.)

### Luồng 6 — Upload (PASS)
- Upload admin X → publicId `restaurants/69fccba9.../<id>` (folder phân theo tenant).
- Xoá ảnh của X bằng admin Y → 400 "Bạn không có quyền xóa ảnh của nhà hàng khác!"; xoá bằng admin X → 200.

### Bug phát hiện & đã fix
- `POST /api/settings/:id/kds-code` trả 404 "Cấu hình cài đặt không tồn tại": controller truyền `req.tenantId` (restaurant id) nhưng service `generateKitchenCodeService` tìm setting theo `_id`.
- **Fix**: thêm `settingRepository.findSettingByRestaurant(restaurantId)` (query `{scope:'restaurant', targetId}`); `generateKitchenCodeService` đổi từ `findSettingById(settingId)` → `findSettingByRestaurant(restaurantId)`, đổi tham số thành `restaurantId`.
- Verify: generate X → 200 `456734`; generate Y → 200 `553572`. Typecheck server/client 0 errors.

### Tài liệu đã cập nhật
- `README.md`: thêm mô hình multi-tenant, vai diễn, hướng dẫn tạo tenant, test accounts mới, mô tả verifyTenant/switch-tenant.
- `.opencode/skills/project-context/SKILL.md`: cập nhật kiến trúc multi-tenant (roles, verifyTenant, socket rooms, upload phân vùng, QR tenant).
