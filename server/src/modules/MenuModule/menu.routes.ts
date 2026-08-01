import { Router } from 'express';
import menuController from './menu.controller.js';
import {
  verifyRole,
  verifyTenant,
  verifyToken,
  requireResourceTenant,
  menuCategoryTenantResolver,
  menuItemTenantResolver,
} from '../../middlewares/auth.middleware.js';
import { menuReadRateLimit } from '../../middlewares/rateLimit.middleware.js';

const router = Router();

// Menu Category
router.post(
  '/category',
  verifyToken,
  verifyRole(['manager', 'admin']),
  verifyTenant,
  menuController.createMenuCat,
);
router.put(
  '/category/:id',
  verifyToken,
  verifyRole(['manager', 'admin']),
  requireResourceTenant(menuCategoryTenantResolver),
  menuController.updateMenuCat,
);
router.get('/category/:restaurantId', menuReadRateLimit, menuController.findAllMenuCat);

// Menu Item
router.post(
  '/item',
  verifyToken,
  verifyRole(['manager']),
  verifyTenant,
  menuController.createMenuItem,
);
router.put(
  '/item/:id',
  verifyToken,
  verifyRole(['manager', 'admin']),
  requireResourceTenant(menuItemTenantResolver),
  menuController.updateMenuItem,
);
router.put(
  '/item/:id/availability',
  verifyToken,
  verifyRole(['staff', 'manager', 'admin']),
  requireResourceTenant(menuItemTenantResolver),
  menuController.updateAvailability,
);
router.get('/item/category/:catId', menuReadRateLimit, menuController.getItemsByCategory);
router.get('/items/:restaurantId', menuReadRateLimit, menuController.getAllItems);
router.get('/item/available/:restaurantId', menuReadRateLimit, menuController.getAvailableItems);
router.get('/items/bestsellers/:restaurantId', menuReadRateLimit, menuController.getTopBestSellers);
router.get('/item/:id', menuReadRateLimit, menuController.getItemById);
export default router;
