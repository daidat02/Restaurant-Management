import { deleteFile, uploadMultipleFile, uploadSingleFile } from '@/api/upload.api';
import { useState } from 'react';
import { toast } from 'sonner';
import { useGlobalLoading } from '@/components/LoadingOverlay';

interface IFile {
  url: string;
  publicId: string;
}

export const useUpload = () => {
  const { showLoading, hideLoading } = useGlobalLoading();
  const [error, setError] = useState<string | null>(null);

  const handleUploadFile = async (file: File) => {
    showLoading();
    setError(null);
    try {
      const result = await uploadSingleFile(file);
      return result;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
    } finally {
      hideLoading();
    }
  };

  const handleUploadMultipleFile = async (files: File[]) => {
    showLoading();
    setError(null);
    try {
      const result = await uploadMultipleFile(files);
      console.log(result);
      return result;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
    } finally {
      hideLoading();
    }
  };

  const handleDeleteFile = async (id: string) => {
    showLoading();
    setError(null);
    try {
      await deleteFile(id);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải dữ liệu');
    } finally {
      hideLoading();
    }
  };

  return {
    error,
    uploadSingle: handleUploadFile,
    uploadMultiple: handleUploadMultipleFile,
    deleteFile: handleDeleteFile,
  };
};
