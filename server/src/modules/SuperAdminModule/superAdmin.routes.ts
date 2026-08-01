import { Router } from 'express';
import superAdminController from './superAdmin.controller.js';
import { verifyRole, verifyToken } from '../../middlewares/auth.middleware.js';

const router = Router();

// Toàn bộ endpoint quản trị nền tảng — chỉ super-admin
router.get('/admin/dashboard', verifyToken, verifyRole(['super-admin']), superAdminController.dashboard);
router.get('/admin/tenants', verifyToken, verifyRole(['super-admin']), superAdminController.tenants);
router.get('/admin/transactions', verifyToken, verifyRole(['super-admin']), superAdminController.transactions);
router.patch('/admin/users/:id/block', verifyToken, verifyRole(['super-admin']), superAdminController.blockOwner);

export default router;
