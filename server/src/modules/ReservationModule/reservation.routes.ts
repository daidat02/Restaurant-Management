import { Router } from 'express';
import reservationController from './reservation.controller.js';
import {
  verifyRole,
  verifyTenant,
  verifyToken,
  requireResourceTenant,
  reservationTenantResolver,
} from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/create', reservationController.createReservation);
router.post(
  '/create-by-staff',
  verifyToken,
  verifyRole(['staff', 'manager']),
  reservationController.createReservationByStaff,
);

router.get('/restaurants', reservationController.getRestaurantHaveTablesEmpty);
router.get('/tables/slots', reservationController.getTableTimeSlots);

router.get(
  '/:id/restaurant',
  verifyToken,
  verifyRole(['staff', 'manager']),
  verifyTenant,
  reservationController.getReservationByRestaurant,
);
router.get(
  '/me',
  verifyToken,
  verifyRole(['customer']),
  reservationController.getReservationByUser,
);

router.get(
  '/:id',
  verifyToken,
  verifyRole(['admin', 'staff']),
  requireResourceTenant(reservationTenantResolver),
  reservationController.getReservationById,
);

router.put(
  '/update/:id',
  verifyToken,
  verifyRole(['admin', 'staff', 'manager']),
  requireResourceTenant(reservationTenantResolver),
  reservationController.updateReservation,
);

router.put(
  '/update-status/:id',
  verifyToken,
  verifyRole(['admin', 'staff', 'manager']),
  requireResourceTenant(reservationTenantResolver),
  reservationController.updateStatusReservation,
);

router.put(
  '/cancel/:id',
  verifyToken,
  verifyRole(['customer', 'staff', 'admin']),
  requireResourceTenant(reservationTenantResolver),
  reservationController.updateStatusReservation,
);

export default router;
