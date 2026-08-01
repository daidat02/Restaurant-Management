import { Router } from 'express';
import pricingController from './pricing.controller.js';
import { verifyRole, verifyToken } from '../../middlewares/auth.middleware.js';

const router = Router();

// Giá chu kỳ — mọi user có token đọc được (hiển thị trên màn thanh toán)
router.get('/pricing', verifyToken, pricingController.getPricing);
// Chỉnh giá — super-admin
router.put('/admin/pricing', verifyToken, verifyRole(['super-admin']), pricingController.updatePricing);

export default router;
