import { Router } from 'express';
import TableController from './table.controller.js';
import { verifyRole, verifyToken } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/create', verifyToken, verifyRole(['manager', 'admin']), TableController.createTable);
router.get('/:id', TableController.getTableById);
router.put('/:id', verifyToken, verifyRole(['admin', 'manager']), TableController.updateTable);
router.delete('/:id', verifyToken, verifyRole(['admin', 'manager']), TableController.deleteTable);
router.get(
  '/restaurant/:restaurantId',
  verifyToken,
  verifyRole(['admin', 'staff', 'manager']),
  TableController.getTablesByRestaurant,
);
router.patch(
  '/:id/status',
  verifyToken,
  verifyRole(['admin', 'staff', 'manager']),
  TableController.updateTableStatus,
);

export default router;
