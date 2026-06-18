import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { IMenuCategory, IMenuItem } from '@/types/category.type';
import {
  createMenuCat,
  updateMenuCat,
  findAllMenuCat,
  createMenuItem,
  updateMenuItem,
  updateAvailability,
  getItemsByCategory,
  getAvailableItems,
  getAllItems,
  getTopBestSellers,
  getItemById,
} from '@/api/category.api';

import { useGlobalLoading } from '@/components/LoadingOverlay';

export const useMenu = () => {
  const { showLoading, hideLoading } = useGlobalLoading();
  // State quản lý dữ liệu
  const [categories, setCategories] = useState<IMenuCategory[]>([]);
  const [items, setItems] = useState<IMenuItem[]>([]);
  const [currentItem, setCurrentItem] = useState<IMenuItem | null>(null);
  // State quản lý UI
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // MENU CATEGORY METHODS
  // ==========================================

  const fetchCategories = useCallback(async (restaurantId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await findAllMenuCat(restaurantId);
      setCategories(result ?? []);
    } catch (err: any) {
      setError(err || 'Đã xảy ra lỗi khi tải danh mục');
      toast.error(err || 'Đã xảy ra lỗi khi tải danh mục', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addCategory = useCallback(async (data: Partial<IMenuCategory>) => {
    showLoading();
    setError(null);
    try {
      const newCategory = await createMenuCat(data);
      if (newCategory) {
        setCategories((prev) => [...prev, newCategory]); // Cập nhật local state
        toast.success('Thêm danh mục thành công', { position: 'top-right' });
        return newCategory;
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi thêm danh mục');
      toast.error(err.message || 'Đã xảy ra lỗi khi thêm danh mục', { position: 'top-right' });
    } finally {
      hideLoading();
    }
  }, []);

  const editCategory = useCallback(async (id: string, dataUpdate: Partial<IMenuCategory>) => {
    showLoading();
    setError(null);
    try {
      const updatedCategory = await updateMenuCat(id, dataUpdate);
      setCategories((prev) =>
        prev.map((cat) => (cat._id === id ? { ...cat, ...updatedCategory } : cat)),
      );
      toast.success('Cập nhật danh mục thành công', { position: 'top-right' });
      return updatedCategory;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi cập nhật danh mục');
      toast.error(err.message || 'Đã xảy ra lỗi khi cập nhật danh mục', { position: 'top-right' });
    } finally {
      hideLoading();
    }
  }, []);

  // ==========================================
  // MENU ITEM METHODS
  // ==========================================

  const fetchAllItems = useCallback(async (restaurantId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAllItems(restaurantId);
      setItems(result ?? []);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải món ăn');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải món ăn', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchItemsByCat = useCallback(async (catId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getItemsByCategory(catId);
      setItems(result ?? []);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải món ăn');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải món ăn', { position: 'top-right' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAvailable = useCallback(async (restaurantId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAvailableItems(restaurantId);
      setItems(result ?? []);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải danh sách món ăn');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải danh sách món ăn', {
        position: 'top-right',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addItem = useCallback(async (data: Partial<IMenuItem>) => {
    showLoading();
    setError(null);
    try {
      const newItem = await createMenuItem(data);
      if (newItem) {
        setItems((prev) => [...prev, newItem]);
        toast.success('Thêm món ăn thành công', { position: 'top-right' });
        return newItem;
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi thêm món ăn');
      toast.error(err.message || 'Đã xảy ra lỗi khi thêm món ăn', { position: 'top-right' });
    } finally {
      hideLoading();
    }
  }, []);

  const editItem = useCallback(async (id: string, dataUpdate: Partial<IMenuItem>) => {
    showLoading();
    setError(null);
    try {
      const updatedItem = await updateMenuItem(id, dataUpdate);
      setItems((prev) =>
        prev.map((item) => (item._id === id ? { ...item, ...updatedItem } : item)),
      );
      toast.success('Cập nhật món ăn thành công', { position: 'top-right' });
      return updatedItem;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi cập nhật món ăn');
      toast.error(err.message || 'Đã xảy ra lỗi khi cập nhật món ăn', { position: 'top-right' });
    } finally {
      hideLoading();
    }
  }, []);

  const toggleAvailability = useCallback(async (id: string, isAvailable: boolean) => {
    showLoading();
    setError(null);
    try {
      const updatedItem = await updateAvailability(id, isAvailable);
      setItems((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, isAvailable: updatedItem.isAvailable } : item,
        ),
      );
      toast.success(`Đã ${isAvailable ? 'mở bán' : 'ngừng bán'} món ăn`, { position: 'top-right' });
      return updatedItem;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi cập nhật trạng thái');
      toast.error(err.message || 'Đã xảy ra lỗi khi cập nhật trạng thái', {
        position: 'top-right',
      });
    } finally {
      hideLoading();
    }
  }, []);

  const fetchTopBestSellers = useCallback(async (restaurantId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getTopBestSellers(restaurantId);
      setItems(result ?? []);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải danh sách món ăn bán chạy');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải danh sách món ăn bán chạy', {
        position: 'top-right',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchItemById = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getItemById(id);
      setCurrentItem(result);
      return result;
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi tải thông tin món ăn');
      toast.error(err.message || 'Đã xảy ra lỗi khi tải thông tin món ăn', {
        position: 'top-right',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  return {
    categories,
    items,
    currentItem,
    isLoading,
    error,
    // Categories
    fetchCategories,
    addCategory,
    editCategory,
    // Items
    fetchAllItems,
    fetchItemsByCat,
    fetchTopBestSellers,
    fetchAvailable,
    addItem,
    editItem,
    toggleAvailability,
    fetchItemById,
  };
};
