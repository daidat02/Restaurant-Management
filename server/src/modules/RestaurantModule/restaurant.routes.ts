import { Router } from 'express';
import restaurantController from './restaurant.controller.js';
import {
  verifyRole,
  verifyToken,
  requireResourceTenant,
  restaurantTenantResolver,
} from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/', verifyToken, verifyRole(['admin']), restaurantController.createRestaurant);
router.get('/', restaurantController.findAllRestaurants);
// Danh sách nhà hàng của chính admin/manager đăng nhập — lọc theo restaurantIds (server tự đọc DB).
// Đặt trước route '/:id' để không bị nuốt mất.
router.get(
  '/my',
  verifyToken,
  verifyRole(['admin', 'manager']),
  restaurantController.getMyRestaurants,
);
router.get('/:id', verifyToken, restaurantController.getRestaurantById);
router.put(
  '/update/:id',
  verifyToken,
  verifyRole(['admin']),
  requireResourceTenant(restaurantTenantResolver),
  restaurantController.updateRestaurant,
);
router.patch(
  '/status/:id',
  verifyToken,
  verifyRole(['super-admin']),
  restaurantController.updateRestaurantStatus,
);
router.delete(
  '/:id',
  verifyToken,
  verifyRole(['admin']),
  requireResourceTenant(restaurantTenantResolver),
  restaurantController.deleteRestaurant,
);

export default router;
