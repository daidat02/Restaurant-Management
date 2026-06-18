import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, File as FileIcon } from 'lucide-react';

interface FileUploadProps {
  label?: string;
  accept?: string;
  // Cập nhật onChange để trả về mảng (nếu multiple) hoặc 1 file (nếu single)
  onChange?: (data: File | File[] | null) => void; 
  // Hỗ trợ truyền mảng link ảnh nếu ở chế độ Edit có nhiều ảnh
  onRemoveUploaded?: (removedItem: any) => void; // <--- THÊM DÒNG NÀY
  initialPreview?:any; 
  multipleFile?: boolean;
}

// Interface định nghĩa cấu trúc của 1 file để render
type FileItem = {
  file: File | null;
  url: string | null;
  name: string;
  isImage: boolean;
  originalData?: any;
};

export const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  accept = "image/*", 
  onChange, 
  onRemoveUploaded,
  initialPreview,
  multipleFile = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  // Dùng chung 1 state mảng để quản lý cả single và multiple
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Lắng nghe thay đổi từ initialPreview (Chế độ Edit)
  useEffect(() => {
    if (initialPreview) {
      console.log("initialPreview: ",initialPreview)
      const previews = Array.isArray(initialPreview) ? initialPreview : [initialPreview];
      const initialItems = previews.map(item => ({
          file: null,
          url: item.url,
          name: 'image', // Trích xuất tên từ URL
          isImage: true,
          originalData: item 
        }
      ));
      setFileItems(multipleFile ? initialItems : [initialItems[0]]);
    } else {
      setFileItems([]);
    }
  }, [initialPreview, multipleFile]);

  // 2. Hàm xử lý file chung
  const processFiles = (files: File[]) => {
    // Nếu không phải multiple thì chỉ lấy file đầu tiên
    const validFiles = multipleFile ? files : [files[0]];
    
    const newItems = validFiles.map(file => {
      const isImage = file.type.startsWith('image/');
      return {
        file,
        url: isImage ? URL.createObjectURL(file) : null, // Tạo url preview
        name: file.name,
        isImage
      };
    });

    if (multipleFile) {
      const updatedList = [...fileItems, ...newItems];
      setFileItems(updatedList);
      // Lọc ra các File object thật (loại bỏ các file khởi tạo từ URL ban đầu nếu có)
      if (onChange) onChange(updatedList.map(i => i.file).filter((f): f is File => f !== null));
    } else {
      setFileItems(newItems);
      if (onChange) onChange(newItems[0].file);
    }
  };

  // 3. Xóa file
  const removeFile = (indexToRemove: number) => {
    const itemToRemove = fileItems[indexToRemove]; // Lấy ra file sắp bị xóa
    const updatedList = fileItems.filter((_, index) => index !== indexToRemove);
    setFileItems(updatedList);
    
    if (inputRef.current) inputRef.current.value = ''; 
    
    if (!itemToRemove.file && onRemoveUploaded) {
      onRemoveUploaded(itemToRemove.originalData);
    }
    
    // Trả về danh sách file MỚI còn lại cho onChange như bình thường
    if (onChange) {
      if (multipleFile) {
        onChange(updatedList.map(i => i.file).filter((f): f is File => f !== null));
      } else {
        onChange(null);
      }
    }
  };

  // 4. Các sự kiện kéo thả & input
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      
      {/* KHUNG KÉO THẢ */}
      <div 
        className={`relative w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors cursor-pointer min-h-[160px]
          ${dragActive ? 'border-cerulean-blue-500 bg-cerulean-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input 
          ref={inputRef}
          type="file" 
          accept={accept}
          multiple={multipleFile} // Bật tính năng chọn nhiều file
          onChange={handleChange}
          className="hidden" 
        />

        {/* LOGIC HIỂN THỊ TRONG KHUNG:
            - Nếu là Single và đã có file: Hiển thị Preview đè lên khung
            - Nếu là Multiple hoặc chưa có file: Hiển thị Icon Upload Cloud 
        */}
        {!multipleFile && fileItems.length > 0 ? (
          <div className="w-full flex flex-col items-center pointer-events-none">
            {fileItems[0].isImage && fileItems[0].url ? (
              <img src={fileItems[0].url} alt="Preview" className="max-h-32 object-contain rounded-lg shadow-sm mb-2" />
            ) : (
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg border shadow-sm">
                <FileIcon className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-700 truncate max-w-[200px]">{fileItems[0].name}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center flex flex-col items-center pointer-events-none">
            <div className="p-3 bg-white rounded-full shadow-sm mb-3">
              <UploadCloud className="w-6 h-6 text-cerulean-blue-500" />
            </div>
            <p className="text-sm font-medium text-gray-700">
              Click to upload <span className="font-normal text-gray-500">or drag and drop</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">SVG, PNG, JPG or GIF (max. 800x400px)</p>
          </div>
        )}
      </div>

      {/* NÚT XÓA CHO CHẾ ĐỘ SINGLE */}
      {!multipleFile && fileItems.length > 0 && (
        <button 
          type="button" 
          onClick={(e) => { e.stopPropagation(); removeFile(0); }}
          className="self-end flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition mt-1"
        >
          <X className="w-3 h-3" /> Remove File
        </button>
      )}

      {/* DANH SÁCH PREVIEW CHO CHẾ ĐỘ MULTIPLE */}
      {multipleFile && fileItems.length > 0 && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {fileItems.map((item, index) => (
            <div key={index} className="relative group border border-gray-200 rounded-lg p-2 bg-white flex flex-col items-center shadow-sm">
              {/* Nút xóa item */}
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Hình ảnh hoặc Icon */}
              {item.isImage && item.url ? (
                <img src={item.url} alt={item.name} className="h-16 w-full object-cover rounded" />
              ) : (
                <FileIcon className="h-16 w-10 text-gray-400" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};