import type{ Request, Response } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import { uploadService } from './upload.service.js';

class UploadController {
  async upload(req: AuthRequest, res: Response) {
    try {
      const file = req.file;
      const result = await uploadService.upload(file!);
      res.status(200).json({
        status: 200,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        status: 400,
        message: err.message || 'Upload thất bại',
      });
    }
  }

   async uploadMultiple(req: AuthRequest, res: Response) {
    try {
        const files = req.files as Express.Multer.File[];

        const result = await uploadService.uploadMultiple(files);
        res.status(200).json({
            status: 200,
            data: result,
        });
    } catch (err: any) {
        res.status(400).json({
            status: 400,
            message: err.message || 'Upload thất bại',
        });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.query;
      // Người gọi thuộc tenant nào (từ token) — dùng để kiểm tra ownership ảnh
      const requesterTenantId = req.user?.restaurantId;
      const result = await uploadService.delete(id as string, requesterTenantId);
      res.status(200).json({
        status: 200,
        data: result,
      });
    } catch (err: any) {
      res.status(400).json({
        status: 400,
        message: err.message || 'Xóa ảnh thất bại',
      });
    }
  }
}

export const uploadController = new UploadController();
