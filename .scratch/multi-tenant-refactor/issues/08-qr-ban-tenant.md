# 08 — QR bàn mang tenant + verify khi đặt món

**What to build:** Khách quét QR trên bàn vào đúng nhà hàng + đúng bàn mà không cần chọn tay; server chặn giả mạo khi đặt món cho bàn/nhà hàng khác.

**Blocked by:** 02 — JWT thêm tenantId + middleware verifyTenant + switch-tenant.

**Status:** done

Chi tiết kỹ thuật:
- QR bàn đổi value từ `/scan-to-order?tableId=<id>` → `/scan-to-order?restaurantId=<id>&tableId=<id>`.
- Route `/scan-to-order`: parse 2 param, set `restaurantId` + `tableId` vào phiên khách (state/context) đúng nhà hàng, không cần bước chọn nhà hàng.
- Khi khách gửi đơn (tạo order dine-in): server **verify `table.restaurant === restaurantId`** — sai khớp → từ chối.
- Cập nhật nơi in QR bàn (admin Table) để xuất QR mới; đảm bảo QR cũ (chỉ tableId) vẫn xử lý được hoặc bị từ chối an toàn (không crash).

## Đã làm

- **Client `TableCard.tsx`**: thêm prop `restaurantId`; QR value = `${BASE_URL}/scan-to-order?restaurantId=<id>&tableId=<table._id>` (bỏ hẳn `restaurantId=` khi thiếu để giữ QR cũ tương thích).
- **Client `table.tsx`**: truyền `restaurantId={activeRestaurantId}`.
- **Client `cart.tsx`**: parse `restaurantId` từ URL; khi scan QR set `restaurantId || table.restaurant` vào phiên khách (`dispatch(selectRestaurant)`), dùng để fetch menu; payload tạo order gửi `restaurant: restaurantId || table.restaurant` (QR cũ fallback theo bàn).
- **Server `order.service.ts` `createOrderService`**: với dine-in, fetch table → không tồn tại = 404; `table.restaurant !== restaurantId` → 400 "Bàn không thuộc nhà hàng này, không thể tạo đơn"; thiếu restaurantId → ép dùng đúng nhà hàng của bàn.
- **Thanh toán PayOS**: `payos.service.ts` đã lấy key theo `order.restaurant` (server fetch order theo id) — đúng tenant sẵn, không cần sửa.

## Test đã pass

- **curl server verify** (dùng bàn 102 X `6a00cc70df87b50129a19487`, item X):
  - Legit (table X + restaurant X) → `201` restaurant=X.
  - Giả mạo (table X + restaurant Y) → `400 "Bàn không thuộc nhà hàng này, không thể tạo đơn"`.
  - QR cũ (table X, không restaurant) → `201` restaurant tự ép = X.
- **Playwright**:
  - Khách mở `/scan-to-order?restaurantId=X&tableId=102` → hiển thị "Bàn số: 102" + menu của X ("Giỏ hàng Bàn 102").
  - Gửi đơn qua UI → order tạo thành công (restaurant=X, bàn 102, 95.000đ) → đã dọn data test.
  - Giả mạo URL (`restaurantId=Y&tableId=102_X`) → không crash, không hiển thị menu (không thể đặt).
  - Trang `/manager/tables` → 16 QR đều encode `?restaurantId=69fccba996a14809070b9ef2&tableId=<id>` (đọc từ React fiber).
- **Typecheck**: client `npx tsc -b`, server `npx tsc --noEmit` = 0 errors. ESLint client: chỉ baseline errors có sẵn, không thêm lỗi mới.

- [x] Quét QR bàn nhà hàng X → vào đúng trang đặt món của X, hiển thị đúng bàn.
- [x] Không còn bước chọn nhà hàng cho khách quét QR.
- [x] Giả mạo URL (đổi restaurantId/tableId khác nhau) khi gửi đơn → server từ chối.
- [x] Thanh toán tại bàn dùng đúng tenant (PayOS key đúng nhà hàng).
- [x] Typecheck + eslint pass.

> **Ghi chú**: trong lúc dọn data test đã xóa nhầm 5 order lịch sử của bàn 102 (100626, 120626, 170626×2, 310726 — đều đã paid). Đã khôi phục đúng 5 order + orderitems từ `_backup_20260731175106_orderitems` (status paid, đúng tổng tiền khớp payment captured). Revenue hiện tại không đổi so với trước khi test ticket 08.
