import { Router } from 'express';
import pricingController from './pricing.controller.js';
import { verifyRole, verifyToken } from '../../middlewares/auth.middleware.js';

const router = Router();

// Giá chu kỳ — công khai (landing page / bảng giá không cần token)
router.get('/pricing', pricingController.getPricing);
// Chỉnh giá — super-admin
router.put('/admin/pricing', verifyToken, verifyRole(['super-admin']), pricingController.updatePricing);

export default router;
