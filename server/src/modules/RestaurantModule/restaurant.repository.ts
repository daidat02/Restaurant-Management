import DB_Connection from '../../models/DB_Connection.js';
import {
  type IRestaurant,
  type IRestaurantDocument,
} from '../../models/Schema/RestaurantSchema.js';
import type { ClientSession, FilterQuery } from 'mongoose';

class RestaurantRepository {
  // ==========================================
  // I. CORE CRUD (Cơ bản cho Restaurant)
  // ==========================================

  /**
   * Tạo mới một nhà hàng/chi nhánh trong hệ thống
   */
  async createRestaurant(
    restaurantData: Partial<IRestaurant>,
    options?: { session: ClientSession },
  ): Promise<IRestaurant> {
    const restaurant = new DB_Connection.Restaurant({ ...restaurantData });
    return await restaurant.save(options);
  }

  /**
   * Tìm nhanh một nhà hàng bằng ID (Không populate chuyên sâu)
   */
  async findRestaurantById(id: string): Promise<IRestaurant | null> {
    return await DB_Connection.Restaurant.findById(id).exec();
  }

  /**
   * Cập nhật thông tin chi nhánh nhà hàng
   * Sử dụng trực tiếp dữ liệu thay vì bọc $set thủ công (Mongoose tự xử lý)
   */
  async updateRestaurant(
    id: string,
    restaurantData: Partial<IRestaurant>,
    options?: { session?: ClientSession },
  ): Promise<IRestaurant | null> {
    return await DB_Connection.Restaurant.findByIdAndUpdate(
      id,
      restaurantData, // Mongoose tự động hiểu đây là toán tử $set ngầm định
      {
        new: true,
        session: options?.session ?? null,
      },
    ).exec();
  }

  /**
   * Xóa một nhà hàng khỏi hệ thống
   */
  async deleteRestaurant(id: string): Promise<boolean> {
    const result = await DB_Connection.Restaurant.findByIdAndDelete(id).exec();
    return result !== null;
  }

  // ==========================================
  // II. QUERIES ĐẶC THÙ (Business Logic)
  // ==========================================

  /**
   * Hàm Query tổng lực: Tìm kiếm danh sách nhà hàng linh hoạt theo mọi bộ lọc (Filter)
   * Thay thế hoàn toàn cho: findAllRestaurants, findRestaurantByCity, v.v.
   */
  async findRestaurants(filter: FilterQuery<IRestaurant>): Promise<IRestaurantDocument[]> {
    return await DB_Connection.Restaurant.find(filter)
      .populate([{ path: 'managerId', select: 'name email phone' }])
      .sort({ createdAt: -1 }) // Ưu tiên hiển thị các chi nhánh mới thành lập lên đầu
      .exec();
  }
}

export default new RestaurantRepository();
