import { Router } from 'express';
import restaurantController from './restaurant.controller.js';
import { verifyRole, verifyToken } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/', verifyToken, verifyRole(['admin']), restaurantController.createRestaurant);
router.get('/', restaurantController.findAllRestaurants);
router.get('/:id', verifyToken, restaurantController.getRestaurantById);
router.put(
  '/update/:id',
  verifyToken,
  verifyRole(['admin']),
  restaurantController.updateRestaurant,
);
router.patch(
  '/status/:id',
  verifyToken,
  verifyRole(['super-admin']),
  restaurantController.updateRestaurantStatus,
);
router.delete('/:id', verifyToken, verifyRole(['admin']), restaurantController.deleteRestaurant);

export default router;
