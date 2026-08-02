import { Router } from 'express';
import analyticController from './analytic.controller.js'; // 🌟 Import Analytic Controller bạn vừa tạo
import { verifyRole, verifyTenant, verifyToken, intersectRestaurantIds } from '../../middlewares/auth.middleware.js';

const router = Router();

router.get(
  '/overview',
  verifyToken,
  verifyRole(['manager', 'admin']),
  verifyTenant,
  intersectRestaurantIds,
  analyticController.getOverviewStats,
);

router.get(
  '/revenue-hourly',
  verifyToken,
  verifyRole(['manager', 'admin']),
  verifyTenant,
  intersectRestaurantIds,
  analyticController.getRevenueHourly,
);

router.get(
  '/order-channels',
  verifyToken,
  verifyRole(['manager', 'admin']),
  verifyTenant,
  intersectRestaurantIds,
  analyticController.getOrderChannels,
);
router.get(
  '/revenue-channels',
  verifyToken,
  verifyRole(['super-admin']),
  analyticController.getBranchRevenueStats,
);

// Doanh thu từng chi nhánh của admin (chủ chuỗi) — lọc theo restaurantIds
router.get(
  '/revenue-branches',
  verifyToken,
  verifyRole(['manager', 'admin']),
  verifyTenant,
  intersectRestaurantIds,
  analyticController.getBranchRevenueByIds,
);
// Dashboard gộp toàn hệ thống — chỉ super-admin (quyền nền tảng)
router.get(
  '/system-overview',
  verifyToken,
  verifyRole(['super-admin']),
  analyticController.getSystemOverview,
);
export default router;
