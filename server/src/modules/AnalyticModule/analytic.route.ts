import { Router } from 'express';
import analyticController from './analytic.controller.js'; // 🌟 Import Analytic Controller bạn vừa tạo
import { verifyRole, verifyTenant, verifyToken, intersectRestaurantIds } from '../../middlewares/auth.middleware.js';
import { assertFeature } from '../../services/plan-gate.service.js';

const router = Router();

// ── Nhóm endpoint trang HOME (mọi gói — KHÔNG gate advanced_report) ──

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

// Top món bán chạy — home hiển thị cho mọi gói
router.get(
  '/top-items',
  verifyToken,
  verifyRole(['manager', 'admin']),
  verifyTenant,
  intersectRestaurantIds,
  analyticController.getTopItems,
);

// Doanh thu từng chi nhánh của admin (chủ chuỗi) — bảng xếp hạng ở Home
router.get(
  '/revenue-branches',
  verifyToken,
  verifyRole(['manager', 'admin']),
  verifyTenant,
  intersectRestaurantIds,
  analyticController.getBranchRevenueByIds,
);

// ── Nhóm endpoint ADVANCED (chỉ gói có advanced_report) ──

router.get(
  '/order-channels',
  verifyToken,
  verifyRole(['manager', 'admin']),
  verifyTenant,
  intersectRestaurantIds,
  assertFeature('advanced_report'),
  analyticController.getOrderChannels,
);

router.get(
  '/channel-trend',
  verifyToken,
  verifyRole(['manager', 'admin']),
  verifyTenant,
  intersectRestaurantIds,
  assertFeature('advanced_report'),
  analyticController.getChannelTrend,
);

router.get(
  '/hour-matrix',
  verifyToken,
  verifyRole(['manager', 'admin']),
  verifyTenant,
  intersectRestaurantIds,
  assertFeature('advanced_report'),
  analyticController.getHourMatrix,
);

router.get(
  '/revenue-channels',
  verifyToken,
  verifyRole(['super-admin']),
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
