import { Router } from 'express';
import {
  verifyRole,
  verifyTenant,
  verifyToken,
  requireResourceTenant,
  orderTenantResolver,
} from '../../middlewares/auth.middleware.js';
import { orderCreateRateLimit, publicRateLimit } from '../../middlewares/rateLimit.middleware.js';
import { assertFeature } from '../../services/plan-gate.service.js';
import orderController from './order.controller.js';

const router = Router();

router.post('/', orderCreateRateLimit, orderController.createOrder);
router.post('/add-item', orderCreateRateLimit, orderController.addItemIntoOrder);
router.post('/item/:itemId/:status', verifyToken, orderController.updateOrederItemStatus);

// Khách tại bàn gọi nhân viên / yêu cầu thanh toán — public (không cần token), có rate limit chống spam
router.post('/call-staff', publicRateLimit(20, 60 * 1000), orderController.callStaff);
router.post('/request-payment', publicRateLimit(20, 60 * 1000), orderController.requestPayment);

router.get('/my-orders', verifyToken, verifyRole(['customer']), orderController.getMyOrders);
router.get(
  '/:id',
  verifyToken,
  requireResourceTenant(orderTenantResolver),
  orderController.getDetailOrder,
);
router.get(
  '/restaurant/:id/:status',
  verifyToken,
  verifyTenant,
  orderController.getAllOrderStatusByRestaurant,
);
router.get(
  '/restaurant/:id',
  verifyToken,
  verifyTenant,
  orderController.getAllOrderByRestaurant,
);
router.get(
  '/kds/:restaurantId',
  verifyToken,
  verifyTenant,
  assertFeature('kds'),
  orderController.getKdsOrders,
);
router.get('/active/:restaurantId', verifyToken, verifyTenant, orderController.getActiveOrders);
router.get('/table/:tableId', orderController.getOrderByTableId);

router.put(
  '/:id',
  verifyToken,
  verifyRole(['staff', 'manager']),
  requireResourceTenant(orderTenantResolver),
  orderController.updateOrder,
);
router.put(
  '/:id/status',
  verifyToken,
  verifyRole(['staff', 'manager']),
  requireResourceTenant(orderTenantResolver),
  orderController.updateStatusOrder,
);
// POS: xoá món khỏi đơn, sửa món trong đơn, chuyển đơn sang bàn khác
router.delete(
  '/:id/items/:itemId',
  verifyToken,
  verifyRole(['staff', 'manager']),
  requireResourceTenant(orderTenantResolver),
  orderController.removeItemFromOrder,
);
router.patch(
  '/:id/items/:itemId',
  verifyToken,
  verifyRole(['staff', 'manager']),
  requireResourceTenant(orderTenantResolver),
  orderController.updateOrderItem,
);
router.put(
  '/:id/move-table',
  verifyToken,
  verifyRole(['staff', 'manager']),
  requireResourceTenant(orderTenantResolver),
  orderController.moveOrderToTable,
);

export default router;
