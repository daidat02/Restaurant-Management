import { Router } from 'express';
import SettingController from './setting.controller.js';
import {
  verifyRole,
  verifyTenant,
  verifyToken,
  requireResourceTenant,
  settingTenantResolver,
} from '../../middlewares/auth.middleware.js';
import { kdsVerifyRateLimit } from '../../middlewares/rateLimit.middleware.js';

const router = Router();

// 1. Tạo mới một bản ghi cấu hình (Chỉ Admin hệ thống được quyền khởi tạo)
router.post('/create', verifyToken, verifyRole(['admin']), SettingController.createSetting);

// Xác thực mã nhà bếp để vào màn hình KDS (Public - không cần đăng nhập)
router.post('/kds/verify', kdsVerifyRateLimit, SettingController.verifyKitchenCode);

// Tạo mã nhà bếp mới cho màn hình KDS (Chỉ admin/manager, mã hiển thị đúng 1 lần).
// KHÔNG gate theo gói: sinh mã là bước cấu hình (onboarding chi nhánh đầu = gói Miễn Phí);
// việc DÙNG KDS bị gate ở route GET /orders/kds/:restaurantId.
router.post(
  '/:id/kds-code',
  verifyToken,
  verifyRole(['admin', 'manager']),
  verifyTenant,
  requireResourceTenant(settingTenantResolver),
  SettingController.generateKitchenCode,
);

router.get(
  '/get-or-create/:scope/:model/:targetId',
  verifyToken,
  verifyRole(['admin', 'manager']),
  verifyTenant,
  SettingController.getOrCreateSetting,
);

// Cấu hình cổng thanh toán hệ thống (Chỉ Super Admin) — Ticket 07
// Đặt TRƯỚC route '/:id' để 'gateway' không bị nhầm thành id
router.get(
  '/gateway',
  verifyToken,
  verifyRole(['super-admin']),
  SettingController.getGatewayConfig,
);
router.put(
  '/gateway',
  verifyToken,
  verifyRole(['super-admin']),
  SettingController.upsertGatewayConfig,
);
// Gửi email thử từ cấu hình SMTP nền tảng (Chỉ Super Admin)
router.post(
  '/gateway/test-email',
  verifyToken,
  verifyRole(['super-admin']),
  SettingController.sendTestEmail,
);

// 3. Lấy thông tin cấu hình chi tiết theo ID bản ghi setting
router.get(
  '/:id',
  verifyToken,
  verifyRole(['admin', 'manager', 'staff']),
  verifyTenant,
  SettingController.getSettingById,
);

// 4. Cập nhật toàn bộ/một phần cấu hình cài đặt (Khi bấm nút Lưu ở các Tab form)
router.put(
  '/:id',
  verifyToken,
  verifyRole(['admin', 'manager']),
  requireResourceTenant(settingTenantResolver),
  SettingController.updateSetting,
);

router.patch(
  '/:id/payment-method',
  verifyToken,
  verifyRole(['admin', 'manager']),
  requireResourceTenant(settingTenantResolver),
  SettingController.updatePaymentMethodType,
);

// 6. Xóa cấu hình cài đặt khỏi hệ thống (Chỉ Admin hệ thống được quyền xóa)
router.delete(
  '/:id',
  verifyToken,
  verifyRole(['admin']),
  requireResourceTenant(settingTenantResolver),
  SettingController.deleteSetting,
);

export default router;
