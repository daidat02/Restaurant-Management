# Settings Page — Design Override

> **Project:** NhàHàng OS
> **Page:** Cài Đặt (`/admin/settings`, `/manager/settings`, `/staff/settings`, `/super-admin/settings`)
> **Override:** Hệ thống này ghi đè MASTER.md khi build riêng trang Cài Đặt.
> **Nguồn thiết kế chuẩn:** `admin-preview/settings.html` (preview đã duyệt). Mọi thay đổi UI phải trình chiếu ở đây trước.

## Quyết định thiết kế

**Pattern: Tabs ngang + Grid 2 cột** — thay thế hoàn toàn Bento Grid / modal cũ (SettingModal đã xóa).

- Header: tiêu đề "Cài Đặt" + mô tả ngắn + nút "Hỗ trợ" (Ẩn trên mobile).
- Tabs ngang **sticky** (`sticky top-4 z-30 ... bg-white/90 backdrop-blur shadow-card`), mỗi tab có lucide icon.
- Panel mỗi tab: `grid grid-cols-1 gap-5 xl:grid-cols-2` — mỗi nhóm cài đặt là một **card form** đầy đủ (không ẩn trong slide-over).
- **Nút Lưu cố định** góc dưới phải (`fixed bottom-6 right-6 z-50`), dạng nổi, khi có thay đổi chưa lưu thì hiện ring highlight.
- Khi admin quản chuỗi và bấm "Cài đặt chi nhánh" ở trang Quản Lý Nhà Hàng → navigate `/admin/settings?restaurant=<id>`: SettingsPage đọc `useSearchParams`, hiện badge "Đang cấu hình chi nhánh: <tên>" và khoá scope vào chi nhánh đó.

## Tab theo vai trò

| Vai trò | Tabs |
|---------|------|
| **admin / manager** | `Cửa hàng & Hệ thống` · `Thanh toán` · `Thông báo & Giao diện` · `Phân quyền & Vai trò` |
| **staff** | `Tài khoản` · `Thông báo & Giao diện` |
| **super-admin** | `Tài khoản` · `Nền tảng` · `Hệ thống & Hạ tầng` |

> Admin/manager **không có** tab Tài khoản (thông tin cá nhân nằm ở trang profile riêng).

## Nội dung từng tab

### Cửa hàng & Hệ thống (admin/manager) — `TabStoreSystem`
- **Thông tin cửa hàng:** logo (upload), tên (`*`), mô tả ngắn, favicon.
- **Liên hệ & MXH:** SĐT, Zalo cá nhân, Zalo OA, Email, Địa chỉ, Facebook, Instagram.
- **Hoá đơn & In ấn:** VAT %, phí phục vụ %, mã cửa hàng (disabled), chuỗi hoá đơn (disabled), lời chúc footer, máy in chính, toggle tự động in + in cho bếp.
- **Cấu hình hệ thống:** toggle take-away, sửa hoá đơn cần OTP, chế độ bảo trì, tự xuất báo cáo cuối ngày.

### Thanh toán (admin/manager) — `TabPayment`
- **Phương thức:** toggle Tiền mặt / Chuyển khoản ngân hàng / Quét mã QR (PayOS).
- **Tài khoản nhận tiền:** ngân hàng, STK, chủ TK, QR nhận tiền.
- **Tích hợp PayOS:** Client ID, API Key, Checksum Key, nút "Kiểm tra kết nối", note trạng thái.
- **Logic ràng buộc:** khi **PayOS bật** → card "Tài khoản nhận tiền" `opacity-60`, badges "Tạm vô hiệu", các input/select `disabled`, hiện note cảnh báo amber. Tắt PayOS → khôi phục.

### Thông báo & Giao diện (admin/manager + staff) — `TabNotifyAppearance`
- **Thông báo hệ thống:** toggle đơn mới, món hoàn thành, tồn kho sắp hết, báo cáo cuối ngày, âm thanh.
- **Giao diện & Chủ đề:** chế độ Sáng/Tối/Theo hệ thống (segmented), màu nhấn (swatch 6 màu, chọn có ring + check), toggle giao diện compact.

### Phân quyền & Vai trò (admin/manager) — `TabRoles`
- **Vai trò:** card Superadmin (toàn quyền) + danh sách Admin/Manager/Staff, nút "Vai trò mới".
- **Quyền chi tiết — Admin:** grid toggle Bán hàng, Thanh toán, Kho & tồn, Menu món ăn, Nhân viên, Cài đặt hệ thống.

### Tài khoản (staff + super-admin) — `TabAccount`
- **Thông tin cá nhân:** avatar, tên, SĐT, email (disabled, chỉ đọc).
- **Đổi mật khẩu:** mật khẩu hiện tại / mới / xác nhận.

### Nền tảng (super-admin) — `TabPlatform`
- **Cổng PayOS** (card cerulean, mặc định bật) + **Cổng VNPay** (tuỳ chọn, card có opacity khi tắt): Client ID, API Key, Checksum Key, Kiểm tra kết nối.

### Hệ thống & Hạ tầng (super-admin) — `TabInfrastructure`
- **System Domain & Subdomain:** domain chính, subdomain mặc định, toggle SSL, trạng thái DNS.
- **Mail Server (SMTP):** host, port, username, password, người gửi, Kiểm tra kết nối.
- **Storage (ảnh & file):** chọn AWS S3 / Cloudinary (switch select), bucket/cloud name, region, giới hạn dung lượng mỗi tenant (bytes).
- **Mock mức 1:** UI thuần, state nội bộ component, không gọi API, mất khi reload.

## Component con (đồng bộ UI) — `components/`

- `settings-ui.tsx` — `SettingCard`, `Field` (input + icon + hint), `TextArea`, `SelectField`, `ToggleRow`, `ToggleSwitch`, `PermissionToggle`.
- `TabStoreSystem`, `TabPayment`, `TabNotifyAppearance`, `TabRoles`, `TabAccount`, `TabPlatform`, `TabInfrastructure`.

## Tokens (giữ MASTER.md)

- Light mode, background `#F8FAFC` (`bg-slate-50`), card `#FFFFFF` `rounded-2xl border border-slate-200 p-6 shadow-card`.
- Primary cerulean `#3090ff`→`#1a71f6`. Toggle bật: `bg-cerulean-blue-600`. Action bar Lưu: cerulean + `shadow-cerulean-blue-300/60`.
- Input/select: `h-10 rounded-[10px] border-slate-200 bg-slate-50/70`, focus `border-cerulean-blue-500 ring-3 ring-cerulean-blue-100`.
- Scroll layout giống trang Quản Lý Đơn Hàng: wrapper `h-full overflow-y-auto` + `min-h-screen bg-slate-50 p-4 md:p-8`.
- Feedback: toast sonner sau lưu; `cursor-pointer` mọi phần tử click; `cursor-not-allowed` cho phần disable.

## Anti-Patterns (cấm)

- ❌ Emoji làm icon — dùng lucide.
- ❌ Toggle/switch rời không có `role=switch` + aria-checked.
- ❌ Sử dụng lại SettingModal (đã bị xóa) — tất cả entry phải dùng `SettingsPage` (route), trừ luồng `?restaurant=` là query param.
- ❌ Truyền key thật của nhà hàng dưới dạng UI text hiển thị lộ (chỉ dùng tên + id trong URL / state).