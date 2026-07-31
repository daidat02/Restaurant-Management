# 08 — QR bàn mang tenant + verify khi đặt món

**What to build:** Khách quét QR trên bàn vào đúng nhà hàng + đúng bàn mà không cần chọn tay; server chặn giả mạo khi đặt món cho bàn/nhà hàng khác.

**Blocked by:** 02 — JWT thêm tenantId + middleware verifyTenant + switch-tenant.

**Status:** ready-for-agent

Chi tiết kỹ thuật:
- QR bàn đổi value từ `/scan-to-order?tableId=<id>` → `/scan-to-order?restaurantId=<id>&tableId=<id>`.
- Route `/scan-to-order`: parse 2 param, set `restaurantId` + `tableId` vào phiên khách (state/context) đúng nhà hàng, không cần bước chọn nhà hàng.
- Khi khách gửi đơn (tạo order dine-in): server **verify `table.restaurant === restaurantId`** — sai khớp → từ chối.
- Cập nhật nơi in QR bàn (admin Table) để xuất QR mới; đảm bảo QR cũ (chỉ tableId) vẫn xử lý được hoặc bị từ chối an toàn (không crash).

- [ ] Quét QR bàn nhà hàng X → vào đúng trang đặt món của X, hiển thị đúng bàn.
- [ ] Không còn bước chọn nhà hàng cho khách quét QR.
- [ ] Giả mạo URL (đổi restaurantId/tableId khác nhau) khi gửi đơn → server từ chối.
- [ ] Thanh toán tại bàn dùng đúng tenant (PayOS key đúng nhà hàng).
- [ ] Typecheck + eslint pass.
