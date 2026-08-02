# PROMPT — Mô tả giao diện Refactor Subscription (SaaS bán theo nhà hàng)

> Prompt dùng để giao cho AI/dev xây dựng lại giao diện **Super Admin** và **giao diện chủ nhà hàng (admin)** theo mô hình SaaS mới. Mô hình đã được chốt qua phiên grill (xem `SPEC.md`).

---

## Bối cảnh

Chúng ta là nền tảng SaaS quản lý nhà hàng (**NhamNhi**). Hiện tại Super Admin đang nhìn quá sâu vào vận hành từng nhà hàng của người thuê (menu, đơn hàng, bàn...). Mục tiêu refactor: **Super Admin hoàn toàn tách biệt khỏi dữ liệu vận hành của nhà hàng** — nền tảng chỉ *cung cấp dịch vụ*, *quản lý người thuê*, *gói cước*, *thanh toán*, *doanh thu*.

Mô hình kinh doanh: **trả phí theo từng nhà hàng** (per-restaurant). Nhà hàng đầu được dùng thử miễn phí 30 ngày (trial); mở nhà hàng thứ 2+ phải trả phí ngay.

---

## Nguyên tắc chung (bất biến)

1. **Super Admin KHÔNG được**: xem menu, đơn hàng, bàn, khách hàng, cài đặt vận hành của bất kỳ nhà hàng người thuê nào. Chỉ thấy: danh sách chủ, danh sách nhà hàng **kèm trạng thái thanh toán**, lịch sử giao dịch, cấu hình giá, audit log, số liệu thống kê nền tảng.
2. **Mỗi nhà hàng** mang trạng thái subscription riêng: `trial` → `active` → `locked`.
3. Mọi trạng thái/giao dịch liên quan tiền bạc đều ghi **Audit Log**.
4. Giao diện phải rõ ràng trạng thái thanh toán ở mọi nơi liên quan (dashboard, danh sách nhà hàng, danh sách người thuê).

---

## PHẦN A — Giao diện người thuê (Chủ nhà hàng, role = admin)

### A1. Trang Dashboard chủ (`/admin`)
- **Banner trạng thái** trên cùng, tuỳ theo trạng thái nhà hàng đang chọn:
  - `Trial đang chạy`: màu xanh — `"Bạn đang dùng thử miễn phí nhà hàng đầu tiên — còn lại X ngày"`.
  - `Còn ≤ 7 ngày`: chuyển màu **cảnh báo** (cam) — nhắc nhắc nhắc: `"Trial sắp hết hạn (còn X ngày) — thanh toán để không bị gián đoạn"` + nút **"Gia hạn / Thanh toán"**.
  - `Đã hết hạn / Bị khoá`: màu **đỏ** — `"Trial đã hết hạn. Nhà hàng đã bị khoá. Thanh toán 299.000đ để mở lại ngay"` + nút **"Thanh toán ngay"** (nổi bật).
- Dashboard hiển thị các KPI vận hành như hiện tại (không đổi), chỉ thêm banner + nhận thông báo chuông khi sắp hết hạn / bị khoá.

### A2. Trang "Nhà hàng của tôi" (`/admin/restaurants`)
- Danh sách các nhà hàng của chủ, mỗi thẻ/card hiển thị **badge trạng thái**:
  - `Trial` (xanh dương) — kèm `còn X ngày`.
  - `Đang hoạt động` (xanh lá) — kèm `thanh toán tới 01/10/2026`.
  - `Bị khoá` (đỏ) — kèm nút **"Thanh toán mở lại"**.
- Nút **"+ Thêm nhà hàng"**:
  - Nếu chưa có nhà hàng nào → vào **wizard tạo nhà hàng đầu tiên** (không tính phí, bắt đầu trial 30 ngày).
  - Nếu **đã có nhà hàng** → hiện **modal**: `"Mở nhà hàng mới (trả phí 299.000đ/tháng)"` + nút **"Thanh toán & Tạo"** (mock) → tạo nhà hàng ở trạng thái `active` ngay. Không cho phép mở nếu đang bị khoá do quá hạn.

### A3. Trang "Thanh toán / Gia hạn" (`/admin/billing`)
- Cho chọn **nhà hàng cần thanh toán** (dropdown/card, chỉ hiện nhà hàng đang trial-sắp-hết / bị khoá / muốn gia hạn).
- Cho chọn **chu kỳ** (radio):
  - 1 tháng — **299.000đ**
  - 3 tháng — **849.000đ** *(tiết kiệm ~5%)*
  - 6 tháng — **1.590.000đ** *(tiết kiệm ~11%)*
  - 1 năm — **2.990.000đ** *(tiết kiệm ~17%)*
- Hiện **tổng tiền**, ngày hết hạn mới (paidUntil = hôm nay + chu kỳ).
- Nút **"Thanh toán"** (mock): bấm → tạo giao dịch, đánh dấu đã thanh toán, chuyển nhà hàng sang `active`, hiện màn **"Thanh toán thành công"** với thông tin giao dịch.
- Có mục **"Lịch sử thanh toán"** của từng nhà hàng (đọc từ bảng Transaction).

### A4. Trang đăng ký chủ (mới)
- Form đăng ký riêng cho **người thuê** (tách khỏi form đăng ký khách):
  - Họ tên, email, số điện thoại, mật khẩu.
  - Giải thích rõ: *"Miễn phí 30 ngày dùng thử cho nhà hàng đầu tiên. Sau đó 299.000đ/nhà hàng/tháng."*
- Sau khi đăng ký: tạo tài khoản **role = admin**, chuyển vào **wizard tạo nhà hàng đầu tiên**.

---

## PHẦN B — Giao diện Super Admin (Nền tảng)

> Toàn bộ khu vực `/super-admin`. **Không còn** trang xem chi tiết vận hành nhà hàng.

### B1. Dashboard nền tảng (`/super-admin`)
- **4 KPI lớn**:
  - Số chủ đang **dùng thử** (trial)
  - Số chủ **hoạt động** (active)
  - Số **nhà hàng đang hoạt động**
  - **Doanh thu tháng này** (tổng Transaction)
- **Biểu đồ doanh thu 6 tháng** (line/bar).
- Bảng **"Người thuê gần đây"**: tên chủ, email, số nhà hàng, trạng thái, tổng đã trả.
- Bảng **"Nhà hàng sắp hết hạn (≤ 7 ngày)"**: tên nhà hàng, chủ sở hữu, ngày hết hạn — để nền tảng biết ai sắp phải thanh toán.

### B2. Quản lý người thuê (`/super-admin/tenants`)
- Bảng danh sách chủ: tên, email, số nhà hàng, trạng thái (trial/active/locked), ngày đăng ký, tổng đã trả.
- **Bấm vào 1 chủ** → trang chi tiết:
  - Danh sách nhà hàng của chủ (mỗi nhà hàng: tên, trạng thái subscription, trialEndsAt/paidUntil).
  - Lịch sử giao dịch của chủ.
  - Hành động **Khoá / Mở khoá tài khoản chủ** (kèm xác nhận). Khoá chủ = **khoá toàn bộ nhà hàng + mọi tài khoản** (admin/manager/staff) của chủ đó.

### B3. Gói cước & giá (`/super-admin/pricing`)
- Form chỉnh giá 4 chu kỳ: 1/3/6/12 tháng (lưu DB, giao diện thanh toán của chủ đọc giá từ đây).
- Lưu ý tự động tính % tiết kiệm.

### B4. Giao dịch (`/super-admin/transactions`)
- Bảng lịch sử thanh toán: nhà hàng, chủ sở hữu, số tiền, chu kỳ, trạng thái (paid), thời gian.
- Bộ lọc: theo chủ / theo nhà hàng / theo khoảng thời gian.

### B5. Audit log (`/super-admin/audit`)
- Nhật ký hành động với các sự kiện subscription/thanh toán/khoá.

---

## PHẦN C — Modal & Thông báo dùng chung

- **Modal upsell** (khi chủ vượt quyền, hết trial, mở nhà hàng mới): tiêu đề rõ, số tiền, nút **"Nâng cấp / Thanh toán"** → chuyển sang trang `billing`.
- **Notification bell** (đã có): tự tạo thông báo khi — còn 7 ngày hết trial, vừa hết hạn/bị khoá, thanh toán thành công, chủ bị khoá.

---

## Ghi chú triển khai

- **Thanh toán**: mock cho giai đoạn này — hiện số tiền + nút "Thanh toán" là xong (tạo Transaction + mở lại ngay). Chưa nối PayOS/VNPay.
- **Landing page bán dịch vụ**: làm SAU khi hoàn thành tất cả việc khác (ngoài phạm vi prompt này).
