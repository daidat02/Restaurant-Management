import cloudinary from '../../configs/cloudinaryConfig.js';

class UploadRepository {
  async uploadImage(filePath: string, folder = 'restaurants-system') {
    return cloudinary.uploader.upload(filePath, { folder });
  }
  async deleteImage(publicId: string) {
    return cloudinary.uploader.destroy(publicId);
  }
}
export const uploadRepository = new UploadRepository();
 