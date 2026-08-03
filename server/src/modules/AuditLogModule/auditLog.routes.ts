import { Router } from 'express';
import auditLogController from './auditLog.controller.js';
import {
  verifyRole,
  verifyToken,
  intersectRestaurantIds,
} from '../../middlewares/auth.middleware.js';

const router = Router();

// Audit log: super-admin (quyền nền tảng) + admin (chỉ thấy chi nhánh của chuỗi mình)
router.get(
  '/',
  verifyToken,
  verifyRole(['super-admin', 'admin']),
  intersectRestaurantIds,
  auditLogController.getAuditLogs,
);

// Lịch sử thanh toán mọi chi nhánh của chủ (admin)
router.get(
  '/payments',
  verifyToken,
  verifyRole(['admin']),
  auditLogController.getPaymentLogs,
);

export default router;
