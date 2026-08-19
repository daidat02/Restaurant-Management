import { Router } from 'express';
import authController from './auth.controller.js';
import {
  verifyRole,
  verifyTenant,
  verifyToken,
  intersectRestaurantIds,
  requireResourceTenant,
  userTenantResolver,
} from '../../middlewares/auth.middleware.js';
import { authRateLimit } from '../../middlewares/rateLimit.middleware.js';

const router = Router();
// Đăng ký các route cho user
router.get('/profile/me', verifyToken, authController.getProfileUserById);
router.post('/register', authRateLimit, authController.registerUser);
router.post('/register-owner', authRateLimit, authController.registerOwner);
router.post('/login', authController.loginUser);
router.post('/refresh', authController.refreshToken);
router.post('/switch-tenant', verifyToken, authController.switchTenant);
router.patch('/update/me', verifyToken, authController.updateUser);
router.post('/reset-password', verifyToken, authController.updatePassword);
router.post('/change-password', verifyToken, authController.changePassword);

// đăng ký các route cho admin
router.get(
  '/profile/:id',
  verifyToken,
  verifyRole(['manager', 'admin']),
  requireResourceTenant(userTenantResolver),
  authController.getProfileUserById,
);
router.get(
  '/',
  verifyToken,
  verifyRole(['staff', 'manager', 'admin']),
  intersectRestaurantIds,
  authController.getUsersWithFilter,
);
router.delete(
  '/admin/delete/:id',
  verifyToken,
  verifyRole(['admin', 'manager']),
  requireResourceTenant(userTenantResolver),
  authController.deleteUser,
);
router.put(
  '/admin/update/:id',
  verifyToken,
  verifyRole(['admin', 'manager']),
  requireResourceTenant(userTenantResolver),
  authController.updateUser,
);
// Khoá/mở khoá user (quản lý cấp dưới — manager xử lý staff, admin xử lý staff/manager)
router.patch(
  '/admin/:id/block',
  verifyToken,
  verifyRole(['admin', 'manager']),
  requireResourceTenant(userTenantResolver),
  authController.blockUser,
);
// Tạo user nội bộ (staff/manager) thuộc tenant đang xác thực — dùng cho wizard onboarding
router.post(
  '/admin/create',
  verifyToken,
  verifyRole(['admin', 'manager']),
  verifyTenant,
  authController.createStaff,
);

export default router;
