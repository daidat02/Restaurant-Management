# 09 — E2E verify toàn bộ flow + cập nhật tài liệu

**What to build:** Kiểm tra xuyên suốt mọi luồng chính sau refactor để không có hồi quy; tài liệu (README, project context) phản ánh mô hình multi-tenant mới.

**Blocked by:** 04 — Socket xác thực + verify membership + token KDS; 05 — Upload phân vùng theo tenant; 06 — Client tenant switcher; 07 — Super-admin API + UI; 08 — QR bàn mang tenant.

**Status:** ready-for-agent

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

- [ ] Cả 6 luồng E2E chạy qua, không hồi quy so với trước refactor.
- [ ] Không còn chỗ nào hiển thị dữ liệu nhầm tenant trong quá trình test.
- [ ] README cập nhật đúng mô hình multi-tenant + vai diễn.
- [ ] Tài liệu project context cập nhật.
