// middleware/multer.ts
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../configs/cloudinaryConfig.js';
import type { CloudinaryParams } from '../shared/type.js';

// Phân vùng folder ảnh theo tenant: restaurants/<restaurantId>/...
// restaurantId lấy từ token (claim) hoặc query param (route công khai / super-admin).
// Không có ngữ cảnh nhà hàng (vd avatar khách) -> cất vào _public (không trộn tenant).
const resolveFolder = (req: any): string => {
  const restaurantId = req.user?.restaurantId || req.query?.restaurantId || '';
  return restaurantId ? `restaurants/${restaurantId}` : 'restaurants/_public';
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, _file): CloudinaryParams => ({
    folder: resolveFolder(req),
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