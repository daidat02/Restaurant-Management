import { uploadRepository } from './upload.repository.js';

// Folder ảnh được phân vùng theo tenant: restaurants/<restaurantId>/...
// (do CloudinaryStorage trong multer đặt sẵn). Khi xoá phải kiểm tra ownership.
const TENANT_FOLDER_REGEX = /^restaurants\/([^/]+)\//;

class UploadService {
  async upload(file: Express.Multer.File) {
    if (!file) {
      throw new Error('Không có file nào được upload');
    }
    // Với CloudinaryStorage, file.path = URL, file.filename = public_id (đã upload 1 lần duy nhất)
    return {
      url: file.path,
      publicId: file.filename,
    };
  }

  async uploadMultiple(files: Express.Multer.File[]) {
    if (!files) {
      throw new Error('Không có file nào được upload');
    }
    return files.map((file) => ({
      url: file.path,
      publicId: file.filename,
    }));
  }

  /**
   * Xoá ảnh có kiểm tra ownership: ảnh nằm trong folder restaurants/<tenantId>/
   * chỉ được xoá bởi người gọi thuộc đúng tenant đó.
   */
  async delete(publicId: string, requesterTenantId?: string) {
    if (!publicId) {
      throw new Error('Thiếu publicId để xóa ảnh');
    }

    const match = publicId.match(TENANT_FOLDER_REGEX);
    const ownerTenant = match?.[1];
    if (ownerTenant && ownerTenant !== '_public') {
      if (!requesterTenantId || requesterTenantId !== ownerTenant) {
        throw new Error('Bạn không có quyền xóa ảnh của nhà hàng khác!');
      }
    }

    await uploadRepository.deleteImage(publicId);
    return { message: 'Đã xóa ảnh thành công' };
  }
}

export const uploadService = new UploadService();
