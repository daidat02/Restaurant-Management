import { Router } from 'express';
import menuController from './menu.controller.js';
import { verifyToken, verifyRole } from '../../middlewares/auth.middleware.js';

const router = Router();

// Menu Category
router.post(
  '/category',
  verifyToken,
  verifyRole(['manager', 'admin']),
  menuController.createMenuCat,
);
router.put(
  '/category/:id',
  verifyToken,
  verifyRole(['manager', 'admin']),
  menuController.updateMenuCat,
);
router.get('/category/:restaurantId', menuController.findAllMenuCat);

// Menu Item
router.post('/item', verifyToken, verifyRole(['manager']), menuController.createMenuItem);
router.put(
  '/item/:id',
  verifyToken,
  verifyRole(['manager', 'admin']),
  menuController.updateMenuItem,
);
router.put(
  '/item/:id/availability',
  verifyToken,
  verifyRole(['staff', 'manager', 'admin']),
  menuController.updateAvailability,
);
router.get('/item/category/:catId', menuController.getItemsByCategory);
router.get('/items/:restaurantId', menuController.getAllItems);
router.get('/item/available/:restaurantId', menuController.getAvailableItems);
router.get('/items/bestsellers/:restaurantId', menuController.getTopBestSellers);
router.get('/item/:id', menuController.getItemById);
export default router;
