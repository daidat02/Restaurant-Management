import type { IMenuCategoryDocument } from '../../models/Schema/MenuCategorySchema.js';
import type { IMenuItemDocument } from '../../models/Schema/MenuItemSchema.js';
import type { ServiceResponse } from '../../shared/type.js';
import mongoose from 'mongoose';
import menuRepository from './menu.repository.js';
import { getOrSetCache, invalidateCache } from '../../services/cache.service.js';

interface MenuComposite {
  categories: any[];
  items: IMenuItemDocument[];
}

class MenuService {
  private readonly MENU_CACHE_TTL = 300;
  private readonly menuCacheKey = (restaurantId: string): string => `menu:${restaurantId}`;

  /**
   * Lấy composite { categories, items } của 1 nhà hàng qua Redis cache (1 key per-restaurant).
   * Cache miss / Redis tắt / lỗi → query Database như cũ; sau đó tự SET kèm TTL.
   */
  private async getMenuComposite(restaurantId: string): Promise<MenuComposite> {
    return getOrSetCache<MenuComposite>(
      this.menuCacheKey(restaurantId),
      async () => {
        const [categories, items] = await Promise.all([
          menuRepository.findAllMenuCatWithCount(restaurantId),
          menuRepository.findItems({ restaurant: restaurantId }),
        ]);
        console.log(`[Cache Miss] Fetched menu from DB for restaurant: ${restaurantId}`);
        return { categories, items };
      },
      this.MENU_CACHE_TTL,
    );
  }

  /**
   * Xoá cache menu của 1 nhà hàng khi dữ liệu gốc thay đổi (fire-and-forget).
   * Redis tắt → no-op, không lỗi.
   */
  private invalidateMenuCache(restaurantId: string | undefined | null): void {
    if (!restaurantId) return;
    void invalidateCache(this.menuCacheKey(restaurantId.toString()));
  }

  // ==========================================
  // VALIDATE OPTION GROUPS
  // ==========================================

  /**
   * Kiểm tra cấu trúc optionGroups của món ăn. Trả về message lỗi hoặc null nếu hợp lệ.
   * - type: 'single' (chọn 1) hoặc 'multiple' (chọn nhiều)
   * - choices: mỗi lựa chọn có name + price (price = 0 là free)
   */
  private validateOptionGroups(optionGroups: any[]): string | null {
    if (!optionGroups || !Array.isArray(optionGroups)) return null;
    if (optionGroups.length === 0) return null;

    for (const group of optionGroups) {
      if (!group?.name || typeof group.name !== 'string' || !group.name.trim()) {
        return 'Nhóm lựa chọn phải có tên';
      }
      if (group.type !== 'single' && group.type !== 'multiple') {
        return `Nhóm "${group.name}" phải có loại là single hoặc multiple`;
      }
      if (!Array.isArray(group.choices) || group.choices.length === 0) {
        return `Nhóm "${group.name}" phải có ít nhất 1 lựa chọn`;
      }
      for (const choice of group.choices) {
        if (!choice?.name || typeof choice.name !== 'string' || !choice.name.trim()) {
          return `Nhóm "${group.name}" có lựa chọn thiếu tên`;
        }
        if (typeof choice.price !== 'number' || choice.price < 0) {
          return `Nhóm "${group.name}" có lựa chọn giá không hợp lệ`;
        }
      }
      if (group.type === 'multiple') {
        if (typeof group.min === 'number' && group.min < 0) {
          return `Nhóm "${group.name}" có số lượng tối thiểu không hợp lệ`;
        }
        if (
          typeof group.max === 'number' &&
          (group.max < 0 || (typeof group.min === 'number' && group.max < group.min))
        ) {
          return `Nhóm "${group.name}" có số lượng tối đa không hợp lệ`;
        }
      }
    }
    return null;
  }

  // ==========================================
  // MENU CATEGORY SERVICE
  // ==========================================

  async createMenuCat(menuCatData: any): Promise<ServiceResponse<IMenuCategoryDocument>> {
    const newMenuCat = await menuRepository.createMenuCategory(menuCatData);
    // Menu thay đổi → xoá cache menu của nhà hàng đó (fire-and-forget; Redis tắt → no-op)
    this.invalidateMenuCache(newMenuCat.restaurant?.toString());
    return { code: 201, message: 'Tạo danh mục thành công', data: newMenuCat };
  }

  async updateMenuCat(
    id: string,
    menuCatData: any,
  ): Promise<ServiceResponse<IMenuCategoryDocument>> {
    const menuCat = await menuRepository.updateMenuCategory(id, menuCatData);
    if (!menuCat) {
      return { code: 404, message: 'Danh mục không tồn tại' };
    }
    // Menu thay đổi → xoá cache menu của nhà hàng đó (fire-and-forget; Redis tắt → no-op)
    this.invalidateMenuCache(menuCat.restaurant?.toString());
    return { code: 200, message: 'Cập nhật danh mục thành công', data: menuCat };
  }

  /**
   * Đã sửa: Truyền thêm restaurantId từ Controller xuống để bảo mật data
   * Đọc danh mục qua cache composite (4 list endpoints dùng chung key `menu:{restaurantId}`)
   */
  async findAllMenuCat(restaurantId: string): Promise<ServiceResponse<any[]>> {
    const { categories } = await this.getMenuComposite(restaurantId);
    return { code: 200, message: 'Lấy danh sách danh mục thành công', data: categories };
  }

  // ==========================================
  // MENU ITEM SERVICE
  // ==========================================

  async createMenuItem(menuItemData: any): Promise<ServiceResponse<IMenuItemDocument>> {
    // Validate cấu trúc optionGroups trước khi lưu
    const optionError = this.validateOptionGroups(menuItemData?.optionGroups);
    if (optionError) {
      return { code: 400, message: optionError };
    }

    // Validate xem danh mục có tồn tại thật không trước khi gán món ăn vào
    const menuCat = await menuRepository.findCategoryById(menuItemData?.category?.toString());
    if (!menuCat) {
      return { code: 404, message: 'Không tìm thấy danh mục món ăn tương ứng' };
    }

    // Chặn khi nhà hàng bị khoá do hết hạn thanh toán
    const restaurantId = menuItemData?.restaurant || menuCat?.restaurant;
    if (restaurantId) {
      const { assertRestaurantUsable } = await import('../../services/subscription.service.js');
      try {
        await assertRestaurantUsable(restaurantId.toString());
      } catch (error: any) {
        if (error?.code === 'RESTAURANT_LOCKED') {
          return {
            code: 403,
            errorCode: 'RESTAURANT_LOCKED',
            message: 'Nhà hàng bị khoá do hết hạn thanh toán',
          };
        }
        if (error?.statusCode === 404) return { code: 404, message: error.message };
        throw error;
      }
    }

    const newMenuItem = await menuRepository.createMenuItem(menuItemData);
    // Menu thay đổi → xoá cache menu của nhà hàng đó (fire-and-forget; Redis tắt → no-op)
    this.invalidateMenuCache(newMenuItem.restaurant?.toString());
    return { code: 201, message: 'Tạo món ăn thành công', data: newMenuItem };
  }

  async updateMenuItem(id: string, menuItemData: any): Promise<ServiceResponse<IMenuItemDocument>> {
    // Validate cấu trúc optionGroups trước khi lưu
    const optionError = this.validateOptionGroups(menuItemData?.optionGroups);
    if (optionError) {
      return { code: 400, message: optionError };
    }

    const menuItem = await menuRepository.updateMenuItem(id, menuItemData);
    if (!menuItem) {
      return { code: 404, message: 'Không tìm thấy món ăn' };
    }
    // Menu thay đổi → xoá cache menu của nhà hàng đó (fire-and-forget; Redis tắt → no-op)
    this.invalidateMenuCache(menuItem.restaurant?.toString());
    return { code: 200, message: 'Cập nhật món ăn thành công', data: menuItem };
  }

  async updateAvailabilityService(
    id: string,
    isAvailable: boolean,
  ): Promise<ServiceResponse<IMenuItemDocument>> {
    // Tái sử dụng hàm updateMenuItem để cập nhật trạng thái ẩn/hiện
    const menuItem = await menuRepository.updateMenuItem(id, { isAvailable });
    if (!menuItem) {
      return { code: 404, message: 'Không tìm thấy món ăn' };
    }
    // Trạng thái món thay đổi → xoá cache menu (fire-and-forget; Redis tắt → no-op)
    this.invalidateMenuCache(menuItem.restaurant?.toString());
    return { code: 200, message: 'Cập nhật trạng thái hiển thị thành công', data: menuItem };
  }

  async getItemByMenucatService(catId: string): Promise<ServiceResponse<IMenuItemDocument[]>> {
    if (!catId || !mongoose.isValidObjectId(catId)) {
      return { code: 400, message: 'Danh mục không hợp lệ', data: [] };
    }
    const filter = { category: catId };
    const items = await menuRepository.findItems(filter);

    if (!items || items.length === 0) {
      return { code: 404, message: 'Không có món ăn nào trong danh mục này', data: [] };
    }
    return { code: 200, message: 'Lấy danh sách món ăn theo danh mục thành công', data: items };
  }

  async getAllItemService(restaurantId: string): Promise<ServiceResponse<IMenuItemDocument[]>> {
    // Đã sửa: Ép điều kiện lọc theo restaurantId của cửa hàng đó, tránh lấy bừa bãi toàn hệ thống
    // Đọc từ cache composite `menu:{restaurantId}` (fallback DB nếu Redis tắt/miss)
    const { items } = await this.getMenuComposite(restaurantId);
    if (!items || items.length === 0) {
      return { code: 404, message: 'Không tìm thấy món ăn nào' };
    }
    return { code: 200, message: 'Lấy toàn bộ danh sách món ăn thành công', data: items };
  }

  /**
   * Đã sửa: Chuyển đổi sang gọi hàm Top-Sellers thực tế sắp xếp theo số lượng bán (Realtime)
   * Bestseller derive từ composite `menu:{restaurantId}` — cached, sort `orderCount` desc, giới hạn limit
   */
  async getItemTopSaleService(
    restaurantId: string,
    limit: number = 10,
  ): Promise<ServiceResponse<IMenuItemDocument[]>> {
    const { items } = await this.getMenuComposite(restaurantId);
    const topSellers = items
      .filter((item) => item.isAvailable)
      .sort((a, b) => (b.orderCount ?? 0) - (a.orderCount ?? 0))
      .slice(0, limit);

    if (!topSellers || topSellers.length === 0) {
      return { code: 404, message: 'Chưa có dữ liệu món ăn bán chạy', data: [] };
    }

    return {
      code: 200,
      message: 'Lấy danh sách món ăn bán chạy nhất thành công',
      data: topSellers,
    };
  }

  async getAvailableItemsService(
    restaurantId: string,
  ): Promise<ServiceResponse<IMenuItemDocument[]>> {
    const { items } = await this.getMenuComposite(restaurantId);
    const available = items.filter((item) => item.isAvailable);
    if (!available || available.length === 0) {
      return {
        code: 404,
        message: 'Không tìm thấy món ăn nào đang hoạt động tại nhà hàng này',
        data: [],
      };
    }
    return { code: 200, message: 'Lấy danh sách món ăn đang phục vụ thành công', data: available };
  }

  async getItemByIdService(id: string): Promise<ServiceResponse<IMenuItemDocument>> {
    const item = await menuRepository.findItemById(id);
    if (!item) {
      return { code: 404, message: 'Không tìm thấy món ăn' };
    }
    return { code: 200, message: 'Lấy thông tin món ăn thành công', data: item };
  }
}

export default new MenuService();
