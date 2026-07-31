import { Router } from 'express';
import { verifyToken } from '../../middlewares/auth.middleware.js';
import { uploadController } from './upload.controller.js';
import { upload } from '../../middlewares/multer.middleware.js';

const router = Router();

// Upload yêu cầu token hợp lệ; folder ảnh được phân vùng theo tenant từ claim
router.post('/', verifyToken, upload.single('image'), uploadController.upload);
router.post('/multiple', verifyToken, upload.array('images', 5), uploadController.uploadMultiple);
router.delete('/', verifyToken, uploadController.delete);

export default router;
