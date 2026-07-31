import { Router } from 'express';
import analyticController from './analytic.controller.js'; // 🌟 Import Analytic Controller bạn vừa tạo
import { verifyRole, verifyTenant, verifyToken } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get(
  '/overview',
  verifyToken,
  verifyRole(['manager', 'admin']),
  verifyTenant,
  analyticController.getOverviewStats,
);

router.get(
  '/revenue-hourly',
  verifyToken,
  verifyRole(['manager', 'admin']),
  verifyTenant,
  analyticController.getRevenueHourly,
);

router.get(
  '/order-channels',
  verifyToken,
  verifyRole(['manager', 'admin']),
  verifyTenant,
  analyticController.getOrderChannels,
);
router.get(
  '/revenue-channels',
  verifyToken,
  verifyRole(['admin']),
  analyticController.getBranchRevenueStats,
);
// Dashboard gộp toàn hệ thống — chỉ super-admin (quyền nền tảng)
router.get(
  '/system-overview',
  verifyToken,
  verifyRole(['super-admin']),
  analyticController.getSystemOverview,
);
export default router;
