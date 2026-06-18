import type {
  IMenuCategory,
  IMenuCategoryDocument,
} from '../../models/Schema/MenuCategorySchema.js';
import type { IMenuItem, IMenuItemDocument } from '../../models/Schema/MenuItemSchema.js';
import DB_Connection from '../../models/DB_Connection.js';
import { Types, type FilterQuery } from 'mongoose';

class MenuRepository {
  // ==========================================
  // MENU CATEGORY REPOSITORY
  // ==========================================

  async createMenuCategory(menuCatData: Partial<IMenuCategory>): Promise<IMenuCategoryDocument> {
    return await new DB_Connection.MenuCategory(menuCatData).save();
  }

  async updateMenuCategory(
    id: string,
    menuCatData: Partial<IMenuCategory>,
  ): Promise<IMenuCategoryDocument | null> {
    return await DB_Connection.MenuCategory.findByIdAndUpdate(id, menuCatData, {
      new: true,
    }).exec();
  }

  async deleteMenuCategory(id: string): Promise<IMenuCategoryDocument | null> {
    return await DB_Connection.MenuCategory.findByIdAndDelete(id).exec();
  }

  async findCategoryById(id: string): Promise<IMenuCategoryDocument | null> {
    return await DB_Connection.MenuCategory.findById(id).exec();
  }

  /**
   * Lấy danh sách danh mục kèm số lượng món ăn ĐÃ ĐƯỢC LỌC THEO NHÀ HÀNG
   * @param restaurantId ID của nhà hàng cần lấy
   */
  async findAllMenuCatWithCount(restaurantId: string): Promise<any[]> {
    return await DB_Connection.MenuCategory.aggregate([
      {
        // BẮT BUỘC: Lọc theo nhà hàng trước để tối ưu hóa performance và bảo mật dữ liệu
        $match: { restaurant: new Types.ObjectId(restaurantId) },
      },
      {
        $lookup: {
          from: 'menuitems',
          localField: '_id',
          foreignField: 'category',
          as: 'menuItemsInfo',
        },
      },
      {
        $addFields: {
          foodCount: { $size: '$menuItemsInfo' },
        },
      },
      { $project: { menuItemsInfo: 0 } },
    ]).exec();
  }

  // ==========================================
  // MENU ITEM REPOSITORY
  // ==========================================

  async createMenuItem(menuItemData: Partial<IMenuItem>): Promise<IMenuItemDocument> {
    return await new DB_Connection.MenuItem(menuItemData).save();
  }

  async updateMenuItem(
    id: string,
    menuItemData: Partial<IMenuItem>,
  ): Promise<IMenuItemDocument | null> {
    return await DB_Connection.MenuItem.findByIdAndUpdate(id, menuItemData, { new: true }).exec();
  }

  async deleteMenuItemHard(id: string): Promise<IMenuItemDocument | null> {
    return await DB_Connection.MenuItem.findByIdAndDelete(id).exec();
  }

  async findItemById(id: string): Promise<IMenuItemDocument | null> {
    return await DB_Connection.MenuItem.findById(id).populate('category', 'name').exec();
  }

  /**
   * Tìm kiếm món ăn linh hoạt theo Filter cụ thể
   * Giới hạn kiểu dữ liệu truyền vào thay vì dùng `any` bừa bãi
   */
  async findItems(
    filter: FilterQuery<IMenuItem> & Record<string, any>,
  ): Promise<IMenuItemDocument[]> {
    return await DB_Connection.MenuItem.find(filter).populate('category', 'name').exec();
  }

  /**
   * Lấy danh sách món ăn bán chạy nhất của MỘT nhà hàng cụ thể
   */
  async findTopBestSellers(restaurantId: string, limitCount: number): Promise<IMenuItemDocument[]> {
    return await DB_Connection.MenuItem.find({
      restaurant: new Types.ObjectId(restaurantId),
      isAvailable: true,
    })
      .sort({ orderCount: -1 }) // Tận dụng index cọc orderCount đã đánh ở Schema
      .limit(limitCount)
      .populate('category', 'name')
      .exec();
  }
}

export default new MenuRepository();
