import { Router } from 'express';
import { uploadController } from './upload.controller.js';
import { upload } from '../../middlewares/multer.middleware.js';

const router = Router();

router.post('/',upload.single('image'),(uploadController.upload));
router.post('/multiple',upload.array('images',5),uploadController.uploadMultiple);
router.delete('/', uploadController.delete);

export default router;
