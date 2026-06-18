import type { IMenuCategoryDocument } from '../../models/Schema/MenuCategorySchema.js';
import type { IMenuItemDocument } from '../../models/Schema/MenuItemSchema.js';
import type { ServiceResponse } from '../../shared/type.js';
import menuRepository from './menu.repository.js';

class MenuService {
  // ==========================================
  // MENU CATEGORY SERVICE
  // ==========================================

  async createMenuCat(menuCatData: any): Promise<ServiceResponse<IMenuCategoryDocument>> {
    const newMenuCat = await menuRepository.createMenuCategory(menuCatData);
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
    return { code: 200, message: 'Cập nhật danh mục thành công', data: menuCat };
  }

  /**
   * Đã sửa: Truyền thêm restaurantId từ Controller xuống để bảo mật data
   */
  async findAllMenuCat(restaurantId: string): Promise<ServiceResponse<any[]>> {
    // Gọi hàm aggregate đếm số món ăn đã được bọc gọn theo nhà hàng cụ thể
    const menuCat = await menuRepository.findAllMenuCatWithCount(restaurantId);
    return { code: 200, message: 'Lấy danh sách danh mục thành công', data: menuCat };
  }

  // ==========================================
  // MENU ITEM SERVICE
  // ==========================================

  async createMenuItem(menuItemData: any): Promise<ServiceResponse<IMenuItemDocument>> {
    // Validate xem danh mục có tồn tại thật không trước khi gán món ăn vào
    const menuCat = await menuRepository.findCategoryById(menuItemData?.category?.toString());
    if (!menuCat) {
      return { code: 404, message: 'Không tìm thấy danh mục món ăn tương ứng' };
    }

    const newMenuItem = await menuRepository.createMenuItem(menuItemData);
    return { code: 201, message: 'Tạo món ăn thành công', data: newMenuItem };
  }

  async updateMenuItem(id: string, menuItemData: any): Promise<ServiceResponse<IMenuItemDocument>> {
    const menuItem = await menuRepository.updateMenuItem(id, menuItemData);
    if (!menuItem) {
      return { code: 404, message: 'Không tìm thấy món ăn' };
    }
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
    return { code: 200, message: 'Cập nhật trạng thái hiển thị thành công', data: menuItem };
  }

  async getItemByMenucatService(catId: string): Promise<ServiceResponse<IMenuItemDocument[]>> {
    const filter = { category: catId };
    const items = await menuRepository.findItems(filter);

    if (!items || items.length === 0) {
      return { code: 404, message: 'Không có món ăn nào trong danh mục này', data: [] };
    }
    return { code: 200, message: 'Lấy danh sách món ăn theo danh mục thành công', data: items };
  }

  async getAllItemService(restaurantId: string): Promise<ServiceResponse<IMenuItemDocument[]>> {
    // Đã sửa: Ép điều kiện lọc theo restaurantId của cửa hàng đó, tránh lấy bừa bãi toàn hệ thống
    const items = await menuRepository.findItems({ restaurant: restaurantId });
    if (!items || items.length === 0) {
      return { code: 404, message: 'Không tìm thấy món ăn nào' };
    }
    return { code: 200, message: 'Lấy toàn bộ danh sách món ăn thành công', data: items };
  }

  /**
   * Đã sửa: Chuyển đổi sang gọi hàm Top-Sellers thực tế sắp xếp theo số lượng bán (Realtime)
   */
  async getItemTopSaleService(
    restaurantId: string,
    limit: number = 10,
  ): Promise<ServiceResponse<IMenuItemDocument[]>> {
    const items = await menuRepository.findTopBestSellers(restaurantId, limit);

    if (!items || items.length === 0) {
      return { code: 404, message: 'Chưa có dữ liệu món ăn bán chạy', data: [] };
    }

    return { code: 200, message: 'Lấy danh sách món ăn bán chạy nhất thành công', data: items };
  }

  async getAvailableItemsService(
    restaurantId: string,
  ): Promise<ServiceResponse<IMenuItemDocument[]>> {
    const filter = {
      restaurant: restaurantId,
      isAvailable: true,
    };

    const items = await menuRepository.findItems(filter);
    if (!items || items.length === 0) {
      return {
        code: 404,
        message: 'Không tìm thấy món ăn nào đang hoạt động tại nhà hàng này',
        data: [],
      };
    }
    return { code: 200, message: 'Lấy danh sách món ăn đang phục vụ thành công', data: items };
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
