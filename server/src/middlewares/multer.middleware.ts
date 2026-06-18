// middleware/multer.ts
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../configs/cloudinaryConfig.js';
import type { CloudinaryParams } from '../shared/type.js';

const storage = new CloudinaryStorage({
  cloudinary,
  params:  (_file) => ({
    folder: 'restaurants-system',
    allowed_formats: ['jpeg', 'png', 'jpg'],
  }),
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
  fileFilter: (_req, file, cb) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.mimetype)) {
      return cb(new Error('Chỉ chấp nhận JPEG, PNG, JPG'));
    }
    cb(null, true);
  },
});