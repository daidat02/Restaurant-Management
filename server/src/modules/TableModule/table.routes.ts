import { Router } from 'express';
import TableController from './table.controller.js';
import {
  verifyRole,
  verifyTenant,
  verifyToken,
  requireResourceTenant,
  tableTenantResolver,
} from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/create', verifyToken, verifyRole(['manager', 'admin']), TableController.createTable);
router.get('/:id', TableController.getTableById);
router.put(
  '/:id',
  verifyToken,
  verifyRole(['admin', 'manager']),
  requireResourceTenant(tableTenantResolver),
  TableController.updateTable,
);
router.delete(
  '/:id',
  verifyToken,
  verifyRole(['admin', 'manager']),
  requireResourceTenant(tableTenantResolver),
  TableController.deleteTable,
);
router.get(
  '/restaurant/:restaurantId',
  verifyToken,
  verifyRole(['admin', 'staff', 'manager']),
  verifyTenant,
  TableController.getTablesByRestaurant,
);
router.patch(
  '/:id/status',
  verifyToken,
  verifyRole(['admin', 'staff', 'manager']),
  requireResourceTenant(tableTenantResolver),
  TableController.updateTableStatus,
);

export default router;
