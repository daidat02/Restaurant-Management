import type{ Request, Response } from 'express';
import { uploadService } from './upload.service.js';

class UploadController {
  async upload(req: Request, res: Response) {
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

   async uploadMultiple(req: Request, res: Response) {
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

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.query;
      const result = await uploadService.delete(id! as string);
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
