import { Router } from 'express';
import analyticController from './analytic.controller.js'; // 🌟 Import Analytic Controller bạn vừa tạo
import { verifyRole, verifyToken } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get(
  '/overview',
  verifyToken,
  verifyRole(['manager', 'admin']),
  analyticController.getOverviewStats,
);

router.get(
  '/revenue-hourly',
  verifyToken,
  verifyRole(['manager', 'admin']),
  analyticController.getRevenueHourly,
);

router.get(
  '/order-channels',
  verifyToken,
  verifyRole(['manager', 'admin']),
  analyticController.getOrderChannels,
);
router.get(
  '/revenue-channels',
  verifyToken,
  verifyRole(['admin']),
  analyticController.getBranchRevenueStats,
);
export default router;
