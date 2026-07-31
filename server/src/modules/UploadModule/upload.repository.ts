import cloudinary from '../../configs/cloudinaryConfig.js';

class UploadRepository {
  async deleteImage(publicId: string) {
    return cloudinary.uploader.destroy(publicId);
  }
}
export const uploadRepository = new UploadRepository();
