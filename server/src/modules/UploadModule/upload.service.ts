import { uploadRepository } from './upload.repository.js';

class UploadService {
  async upload(file: Express.Multer.File) {
    if (!file) {
      throw new Error('Không có file nào được upload');
    }
    const result = await uploadRepository.uploadImage(file.path);
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }
  
  async uploadMultiple(files: Express.Multer.File[]){
    if (!files) {
      throw new Error('Không có file nào được upload');
    }

    const uploadPromises = files.map(file=>{
        return uploadRepository.uploadImage(file.path);
    });


    const result = (await Promise.all(uploadPromises));

    return result.map(image=>{
        return{
            url:image.secure_url ,
            publicId:image.public_id 
        }
    }); 
  }

  async delete(publicId: string) {
    if (!publicId) {
      throw new Error('Thiếu publicId để xóa ảnh');
    }
    await uploadRepository.deleteImage(publicId);
    return { message: 'Đã xóa ảnh thành công' };
  }
}

export const uploadService = new UploadService();
