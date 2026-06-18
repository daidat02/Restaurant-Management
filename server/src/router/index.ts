import { Router } from 'express';
import authRoutes from '../modules/AuthModule/auth.routes.js';
import restaurantRoutes from '../modules/RestaurantModule/restaurant.routes.js';
import tableRoutes from '../modules/TableModule/table.routes.js';
import reservationRoutes from '../modules/ReservationModule/reservation.routes.js';
import menuRoutes from '../modules/MenuModule/menu.routes.js';
import orderRoutes from '../modules/OrderModule/order.routes.js';
import uploadRoute from '../modules/UploadModule/upload.routes.js';
import paymentRoute from '../modules/PaymentModule/payment.routes.js';
import notificationRoute from '../modules/Notification/notification.routes.js';
import analyticsRoute from '../modules/AnalyticModule/analytic.route.js';
import settingsRoute from '../modules/SettingModule/setting.routes.js';
const router = Router();

router.use('/auth', authRoutes);
router.use('/restaurants', restaurantRoutes);
router.use('/tables', tableRoutes);
router.use('/reservations', reservationRoutes);
router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/upload', uploadRoute);
router.use('/payments', paymentRoute);
router.use('/notifications', notificationRoute);
router.use('/analytics', analyticsRoute);
router.use('/settings', settingsRoute);

export default router;
