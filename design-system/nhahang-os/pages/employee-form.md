# Employee Form Page — Design Override

> **Project:** NhàHàng OS
> **Page:** Chỉnh sửa / Thêm nhân viên (`/admin/customers/new|edit/:id`, `/manager/staff/new|edit/:id`)
> **Override:** Ghi đè MASTER.md khi build riêng trang Form Nhân viên.
> **Component:** `client/src/pages/Admin/UserPage/user-form.tsx` + `components/Stepper.tsx`

## Quyết định thiết kế

**Pattern: Stepper wizard 3 bước** — thay thế tab-header tách rời + banner gradient đen + nút "Tiếp theo" đen.

- 3 bước: `1. Tài khoản & Phân quyền` → `2. Hồ sơ nhân sự` → `3. Liên hệ khẩn cấp`.
- Stepper hiển thị trạng thái: `completed` (dấu check), `active` (số + ring glow), `upcoming` (số mờ); đường nối đổi màu cerulean khi bước trước hoàn thành.
- Mobile: stepper thu gọn — chỉ icon + số, ẩn nhãn text (trừ active), cuộn ngang không có scrollbar.
- Nút điều khiển ở **footer bar cố định**: nút `Quay lại` (outline) + `Tiếp theo →` (primary) + `Lưu thay đổi` ở bước cuối; hiển thị `Bước X của 3`.
- **Inline validation** từng bước (lỗi dưới mỗi field, `role=alert`), KHÔNG submit-only toast; lỗi ở top chỉ dùng cho lỗi server/global.

## Bố cục

1. **Top bar** (sticky): nút back tròn outline + tiêu đề "Chỉnh sửa nhân viên" / "Thêm nhân viên mới" + mô tả; phải: `Hủy bỏ` (outline) + `Lưu thay đổi` (primary).
2. **Stepper** dưới top bar.
3. **Summary card** (trắng, không gradient đen): avatar initial cerulean gradient `from-cerulean-blue-600 to-cerulean-blue-800`, tên + email + SĐT, badge vai trò, khối thông tin nhanh `Chi nhánh` + `Mã nhân viên`.
4. **Form content**: card trắng `rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm`, mỗi bước gom vào section có header + mô tả.
5. **Footer bar** (sticky): điều hướng wizard.

## Tokens

- Màu primary: cerulean blue `#3090ff`→`#1a71f6` (`bg-cerulean-blue-600 hover:bg-cerulean-blue-700`). Cấm dùng `bg-blue-600`/`bg-slate-900` làm nút chính.
- Banner summary: **không** dùng gradient `slate-900`; dùng card trắng + avatar gradient cerulean.
- Input/select: giữ chuẩn đã có (`h-10 rounded-xl`, focus `border-cerulean-blue-500 ring-cerulean-blue-100`).
- Stepper: vòng `h-9 w-9`, completed `bg-cerulean-blue-600 text-white`, active `bg-white border-2 border-cerulean-blue-600 text-cerulean-blue-600 ring-4 ring-cerulean-blue-100`, upcoming `bg-slate-100 text-slate-400`.
- `scrollbar-none` KHÔNG tồn tại → dùng `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden` (pattern đã có ở cart.tsx).

## Anti-Patterns (cấm)

- ❌ Nút CTA chính màu đen (`bg-slate-900`) — dùng cerulean.
- ❌ Banner gradient xám đen cho summary — dùng card trắng.
- ❌ Validation chỉ ở submit bằng toast — phải inline theo field.
- ❌ Stepper dùng chung style tab toggle bình thường — cần trạng thái completed với dấu check.
- ❌ Emoji làm icon — dùng lucide.