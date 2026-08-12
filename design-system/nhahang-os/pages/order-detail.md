# Order Detail Page — Design Override

> **Project:** NhàHàng OS
> **Page:** Chi Tiết Đơn Hàng (`/<role>/orders/:id`)
> **Override:** Ghi đè MASTER.md khi build trang Chi Tiết Đơn Hàng.
> **Nguồn thiết kế:** MASTER.md + `pages/settings.md` (bộ card/header chuẩn đã duyệt).

## Quyết định thiết kế

**Pattern: Header tĩnh + Grid 2 cột (main / sidebar)**
- Nền `bg-slate-50` (không `bg-gray-50/50`).
- Header: nút back + tiêu đề `#orderId` + badge trạng thái (icon + nhãn) + meta ngày/giờ/loại/PTTT + nhóm action phải.
- Main cột: card "Sản phẩm" (bảng món + tóm tắt tiền) — bảng món có qty badge tròn, topping con, note amber.
- Sidebar cột: card "Cập nhật trạng thái" (stepper tiến trình) + card "Khách hàng" + card "Thanh toán".

## Tokens

- Card: `rounded-2xl border border-slate-200 bg-white shadow-card`.
- Primary cerulean `#3090ff→#1a71f6`. Total dùng `text-cerulean-blue-600`.
- Badge status: `rounded-full` + icon lucide + chữ `text-xs font-semibold`.
- Stepper: dot 8×8 có ring, màu theo trạng thái, line nối giữa các dot; disabled `opacity-40 cursor-not-allowed`.

## Anti-Patterns (cấm)

- ❌ Emoji làm icon — dùng lucide.
- ❌ Giữ `bg-gray-50/50` cũ — dùng `bg-slate-50`.
- ❌ Trạng thái dạng select thô — dùng stepper tiến trình.
- ❌ Thiếu `cursor-pointer` trên các phần tử click.
