import DB_Connection from '../../models/DB_Connection.js';
import type { IUser, IUserDocument } from '../../models/Schema/UserSchema.js';
import type { ClientSession, FilterQuery } from 'mongoose';
import bcrypt from 'bcrypt';

class AuthRepository {
  // ==========================================
  // I. CORE CRUD (Cơ bản cho User)
  // ==========================================

  /**
   * Tạo mới một tài khoản người dùng (Đã băm password)
   */
  async createUser(userData: Partial<IUser>, options?: { session: ClientSession }): Promise<IUserDocument> {
    const hashedPassword = await bcrypt.hash(userData.password!, 10);
    const user = new DB_Connection.User({
      ...userData,
      password: hashedPassword,
    });
    return await user.save(options);
  }

  /**
   * Tìm nhanh một User bằng ID
   */
  async findUserById(id: string): Promise<IUserDocument | null> {
    return await DB_Connection.User.findById(id).exec();
  }

  /**
   * Cập nhật thông tin profile của User
   */
  async updateProfile(
    id: string,
    updateData: Partial<IUser>,
    options?: { session?: ClientSession },
  ): Promise<IUserDocument | null> {
    return await DB_Connection.User.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        session: options?.session ?? null,
      },
    ).exec();
  }

  /**
   * Cập nhật mật khẩu mới (Đã băm password)
   */
  async updatePassword(
    id: string,
    newPassword: string,
    options?: { session?: ClientSession },
  ): Promise<IUserDocument | null> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return await DB_Connection.User.findByIdAndUpdate(
      id,
      { $set: { password: hashedPassword } },
      {
        new: true,
        session: options?.session ?? null,
      },
    ).exec();
  }

  /**
   * Xóa mềm người dùng khỏi hệ thống (Chuyển isActive thành false)
   */
  async deleteUser(
    id: string,
    options?: { session?: ClientSession },
  ): Promise<IUserDocument | null> {
    return await DB_Connection.User.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      {
        new: true,
        session: options?.session ?? null,
      },
    ).exec();
  }

  // ==========================================
  // II. QUERIES ĐẶC THÙ (Business Logic)
  // ==========================================

  /**
   * Hàm Query tổng lực: Tìm kiếm danh sách hoặc một User linh hoạt theo mọi bộ lọc (Filter)
   * Thay thế hoàn toàn cho: findAllUsers, findUserByEmail, findUserByPhone
   */
  async findUsers(filter: FilterQuery<IUserDocument>): Promise<IUserDocument[]> {
    return await DB_Connection.User.find(filter).sort({ createdAt: -1 }).exec();
  }

  /**
   * Tìm kiếm một User duy nhất dựa trên Filter (Thường dùng cho Login/Verify bằng Email hoặc Phone)
   */
  async findOneUser(filter: FilterQuery<IUserDocument>): Promise<IUserDocument | null> {
    return await DB_Connection.User.findOne(filter).exec();
  }

  /**
   * Gắn thêm một nhà hàng vào danh sách restaurantIds của user (dùng khi tạo tenant mới qua wizard)
   */
  async addRestaurantToUser(id: string, restaurantId: string): Promise<IUserDocument | null> {
    return await DB_Connection.User.findByIdAndUpdate(
      id,
      { $addToSet: { restaurantIds: restaurantId } },
      { new: true },
    ).exec();
  }

  /**
   * Đếm số user (staff/manager/admin) thuộc một tenant nhất định.
   */
  async countStaffByTenant(tenantId: string): Promise<number> {
    return await DB_Connection.User.countDocuments({
      restaurantIds: tenantId,
      role: { $in: ['staff', 'manager', 'admin'] },
    });
  }
}

export default new AuthRepository();
