import { Router } from 'express';
import {
  verifyRole,
  verifyTenant,
  verifyToken,
  requireResourceTenant,
  orderTenantResolver,
} from '../../middlewares/auth.middleware.js';
import orderController from './order.controller.js';

const router = Router();

router.post('/', orderController.createOrder);
router.post('/add-item', orderController.addItemIntoOrder);
router.post('/item/:itemId/:status', verifyToken, orderController.updateOrederItemStatus);

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

export default router;
