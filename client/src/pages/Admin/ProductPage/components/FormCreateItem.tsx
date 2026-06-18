import { FileUpload } from '@/components/FileUpload';
import { useEffect, useState } from 'react';

// Import hooks và types
import { useMenu } from '@/hooks/use-menu';
import type { IMenuItem, IMenuCategory } from '@/types/category.type';
import PageHeader from '@/components/PageHeader';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useUpload } from '@/hooks/use-upload';
import { deleteFile } from '@/api/upload.api';
import { useAuth } from '@/hooks/use-auth';
import { extractId } from '@/utils/helpers';
import { CustomInput } from '@/components/FormInput';
import { FormSelect } from '@/components/FormSelect';
import { CustomTextarea } from '@/components/CustomTextArea';
import { Button } from '@/components/ui/button';

const statusOptions = [
  { label: 'Đang mở bán', value: 'true' },
  { label: 'Ngừng bán', value: 'false' },
];

const FormMenuItem = () => {
  const location = useLocation();
  const { id } = useParams(); // Lấy ID trên URL (ví dụ: /manager/menu/items/edit/123)

  // Lấy object itemData đã truyền từ trang danh sách
  const initialData = location.state?.itemData;

  const { user } = useAuth();
  const { addItem, editItem, categories, fetchCategories } = useMenu();
  const { uploadMultiple } = useUpload();
  const navigate = useNavigate();
  // States quản lý form
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [isAvailable, setIsAvailable] = useState('true');
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  // Map categories sang định dạng của FormSelect
  const categoryOptions = categories.map((cat) => ({
    label: cat.name,
    value: cat._id,
  }));

  // Đổ dữ liệu
  useEffect(() => {
    fetchCategories(extractId(user?.restaurant));
    if (initialData) {
      setName(initialData.name || '');
      setPrice(initialData.price?.toString() || '');
      setDescription(initialData.description || '');
      setTags(initialData.tags?.join(', ') || '');
      setIngredients(initialData.ingredients?.join(', ') || '');
      setIsAvailable(initialData.isAvailable ? 'true' : 'false');

      const catId =
        typeof initialData.category === 'object'
          ? initialData.category._id
          : (initialData.category as string);
      setCategoryId(catId || '');
      setExistingImages(initialData.imageUrl || []);
    } else {
      setName('');
      setPrice('');
      setCategoryId('');
      setDescription('');
      setTags('');
      setIngredients('');
      setIsAvailable('true');
      setImageFiles([]);
    }
  }, [initialData, fetchCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let isSuccess = false;

    // 1. Tạo payload cơ bản
    const payload: Partial<IMenuItem> = {
      restaurant: extractId(user?.restaurant),
      name,
      price: Number(price),
      category: categoryId,
      description,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t !== ''),
      ingredients: ingredients
        .split(',')
        .map((i) => i.trim())
        .filter((i) => i !== ''),
      isAvailable: isAvailable === 'true',
    };

    try {
      if (initialData) {
        let uploadedUrls = [];
        if (imageFiles.length > 0) {
          uploadedUrls = await uploadMultiple(imageFiles);
        }

        const finalPayload = {
          ...payload,
          imageUrl: [...existingImages, ...uploadedUrls],
        };

        console.log('Gọi API Update món ăn:', initialData._id, finalPayload);
        const updated = await editItem(initialData._id, finalPayload);
        if (updated) {
          isSuccess = true;
          if (imagesToDelete.length > 0) {
            // Dùng Promise.all để xóa nhiều ảnh song song cho nhanh
            await Promise.all(imagesToDelete.map((publicId) => deleteFile(publicId))).catch((err) =>
              console.error('Lỗi khi dọn dẹp ảnh cũ:', err),
            );
          }
        }
      } else {
        let uploadedUrls = [];
        if (imageFiles.length > 0) {
          uploadedUrls = await uploadMultiple(imageFiles);
        }

        const finalPayload = {
          ...payload,
          imageUrl: uploadedUrls,
        };

        console.log('Gọi API Create món ăn mới:', finalPayload);
        const created = await addItem(finalPayload);
        if (created) isSuccess = true;
      }

      if (isSuccess) {
        navigate('/manager/menu/items');
      }
    } catch (error) {
      console.error('Lỗi khi lưu món ăn:', error);
      // Thêm logic hiển thị toast thông báo lỗi cho người dùng ở đây nếu cần
    }
  };

  return (
    // 1. Container ngoài cùng: flex-col, h-full, min-h-0 (Rất quan trọng để flex không bị tràn)
    <>
      <div className="p-2 h-full flex flex-col min-h-0 bg-gray-50/50">
        <PageHeader
          title={initialData ? 'Edit Product' : 'Add Product'}
          breadcrumbs={[
            { label: 'Dashboard', path: '/manager/dashboard' },
            { label: 'Món Ăn', path: '/manager/menu/items' },
            { label: initialData ? 'Chỉnh Sửa Món Ăn' : 'Thêm Món Ăn' },
          ]}
        />

        {/* 2. Thẻ form: flex-1 để chiếm hết phần còn lại, min-h-0 để chứa nội dung cuộn */}
        <form
          onSubmit={handleSubmit}
          className="mt-2 flex flex-col lg:flex-row gap-6 flex-1 min-h-0"
        >
          {/* =========================================
            CỘT TRÁI: PRODUCT INFORMATION 
        ========================================= */}
          {/* 3. Cột trái: overflow-y-auto để có thanh cuộn riêng */}
          <div className="flex-[1.5] bg-white border border-gray-200 rounded-xl p-6 shadow-sm overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Thông Tin Món Ăn</h2>
              <p className="text-sm text-gray-500 mt-1">
                Nhập các thông tin cơ bản, thành phần và giá bán chi tiết cho món ăn này.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              {/* Tên món ăn */}
              <CustomInput
                label="Tên Món Ăn"
                placeholder="Input product name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              {/* Danh mục & Giá */}
              <div className="flex flex-col md:flex-row gap-4 w-full">
                <FormSelect
                  label="Danh Mục"
                  placeholder="Select product category"
                  options={categoryOptions}
                  containerClassName="flex-1 h-[42px]"
                  value={categoryId}
                  onValueChange={(val) => {
                    setCategoryId(val);
                    console.log(val);
                  }}
                  key={categoryId}
                />
                <CustomInput
                  type="number"
                  label="Giá Bán"
                  placeholder="Input Price"
                  containerClassName="flex-1"
                  required
                  value={price}
                  min={0}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              {/* Nguyên liệu & Tags */}
              <div className="flex flex-col md:flex-row gap-4 w-full">
                <CustomInput
                  label="Nguyên Liệu"
                  placeholder="Input ingredients..."
                  containerClassName="flex-1"
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                />
                <CustomInput
                  label="Tags"
                  placeholder="Input tags"
                  containerClassName="flex-1"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>

              {/* Mô tả - Giữ nguyên 3 textarea như code của bạn để test scroll */}
              <CustomTextarea
                label="Mô tả món ăn"
                placeholder="Nhập mô tả hấp dẫn về món ăn..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {/* Trạng thái */}
              <FormSelect
                label="Trạng Thái món ăn"
                placeholder="Select status product"
                options={statusOptions}
                containerClassName="w-full h-[42px] mb-2"
                value={isAvailable}
                onValueChange={(val) => setIsAvailable(val)}
              />
            </div>
          </div>

          {/* =========================================
            CỘT PHẢI: IMAGE PRODUCT & SUBMIT
        ========================================= */}
          {/* Cột phải không cần cuộn, chỉ chứa ảnh và nút lưu */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Khối upload ảnh */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Hình Ảnh Món Ăn</h2>
                <p className="text-sm text-gray-500 mt-1">
                  <span className="text-blue-600 font-medium">Ghi Chú:</span> Định Dạng Ảnh SVG,
                  PNG, or JPG (Max size 4mb)
                </p>
              </div>

              <FileUpload
                label=""
                accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                initialPreview={initialData?.imageUrl as any}
                multipleFile={true}
                onRemoveUploaded={(removedItem) => {
                  // 1. Ẩn khỏi giao diện (lọc khỏi mảng existingImages)
                  setExistingImages((prev) => prev.filter((img) => img._id !== removedItem._id));

                  // 2. Đưa publicId vào danh sách "tử tù" chờ xóa thật
                  if (removedItem.publicId) {
                    setImagesToDelete((prev) => [...prev, removedItem.publicId]);
                  }
                }}
                onChange={(data) => {
                  setImageFiles(data ? (data as File[]) : []);
                }}
              />
            </div>

            {/* Nút Submit nằm rời ở dưới cùng bên phải */}
            <div className="flex justify-center w-full">
              <Button
                type="submit"
                className="bg-[#3b82f6] hover:bg-blue-600 text-white font-medium px-8 py-5 rounded-lg w-full shadow-md transition-all"
              >
                {initialData ? 'Cập nhật Món Ăn' : 'Lưu Món Ăn'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default FormMenuItem;
