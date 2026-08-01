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

// Tạo mã nhà bếp mới cho màn hình KDS (Chỉ admin/manager, mã hiển thị đúng 1 lần)
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
  verifyRole(['admin']),
  verifyTenant,
  SettingController.getOrCreateSetting,
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
