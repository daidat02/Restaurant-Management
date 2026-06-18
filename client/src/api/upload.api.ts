import axiosClient from '@/utils/configClient';
import type { ApiResponse } from '@/types/api.type';

import { API_ENDPOINTS } from '@/constants/index';

// Destruct nhánh API Tải file (Upload) để code gọn gàng, đồng bộ
const { UPLOAD } = API_ENDPOINTS;

export const uploadSingleFile = async (file: File) => {
  // 1. Tạo FormData
  const formData = new FormData();
  // 2. Tên trường 'image' phải khớp với upload.single('image') ở backend
  formData.append('image', file);

  const res = await axiosClient.post<any, ApiResponse<any>>(UPLOAD.SINGLE, formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // Bắt buộc cho upload file
    },
  });
  return res.data;
};

export const uploadMultipleFile = async (files: File[]) => {
  // 1. Tạo FormData
  const formData = new FormData();
  // 2. Lặp qua mảng file và append từng file vào cùng một trường 'images'
  // Tên 'images' phải khớp với upload.array('images', 5) ở backend
  files.forEach((file) => {
    formData.append('images', file);
  });

  const res = await axiosClient.post<any, ApiResponse<any>>(UPLOAD.MULTIPLE, formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // Bắt buộc cho upload file
    },
  });
  return res.data;
};

export const deleteFile = async (id: string) => {
  // Sử dụng template string để đính kèm thêm query param `?id=${id}` sau URL base tương đối
  const res = await axiosClient.delete<any, ApiResponse<any>>(`${UPLOAD.DELETE}?id=${id}`);
  return res.data;
};
