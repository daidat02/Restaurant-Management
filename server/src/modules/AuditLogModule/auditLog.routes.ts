import { Router } from 'express';
import auditLogController from './auditLog.controller.js';
import { verifyRole, verifyToken } from '../../middlewares/auth.middleware.js';

const router = Router();

// Audit log chỉ cho super-admin (quyền nền tảng) — optional filter restaurantId
router.get(
  '/',
  verifyToken,
  verifyRole(['super-admin']),
  auditLogController.getAuditLogs,
);

export default router;
