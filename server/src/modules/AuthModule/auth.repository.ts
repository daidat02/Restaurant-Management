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
   * Cập nhật mật khẩu mới (Đã băm password).
   * Đồng thời đánh dấu `passwordChangedAt` + tăng `tokenVersion` để vô hiệu token cũ.
   */
  async updatePassword(
    id: string,
    newPassword: string,
    options?: { session?: ClientSession },
  ): Promise<IUserDocument | null> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return await DB_Connection.User.findByIdAndUpdate(
      id,
      {
        $set: { password: hashedPassword, passwordChangedAt: new Date() },
        $inc: { tokenVersion: 1 },
      },
      {
        new: true,
        session: options?.session ?? null,
      },
    ).exec();
  }

  /**
   * Xóa mềm người dùng khỏi hệ thống (Đặt isActive = false + deletedAt = now).
   * Giữ lại doc để lịch sử order/reservation không bị đứt tham chiếu.
   */
  async deleteUser(
    id: string,
    options?: { session?: ClientSession },
  ): Promise<IUserDocument | null> {
    return await DB_Connection.User.findByIdAndUpdate(
      id,
      { $set: { isActive: false, deletedAt: new Date() } },
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
   * Hàm Query tổng lực: Tìm kiếm danh sách User linh hoạt theo mọi bộ lọc (Filter).
   * Luôn loại trừ user đã soft-delete (deletedAt != null).
   * Populate `restaurantIds` (name) để client hiển thị tên nhà hàng mà không cần fetch riêng.
   */
  async findUsers(filter: FilterQuery<IUserDocument>): Promise<IUserDocument[]> {
    return await DB_Connection.User.find({ ...filter, deletedAt: null })
      .sort({ createdAt: -1 })
      .populate('restaurantIds', 'name')
      .exec();
  }

  /**
   * Tìm kiếm một User duy nhất dựa trên Filter (Thường dùng cho Login/Verify bằng Email hoặc Phone)
   */
  async findOneUser(filter: FilterQuery<IUserDocument>): Promise<IUserDocument | null> {
    return await DB_Connection.User.findOne(filter).exec();
  }

  /**
   * Ghi nhận đăng nhập thành công: reset đếm sai + xóa lock, cập nhật lastLoginAt.
   */
  async updateLoginSuccess(id: string): Promise<IUserDocument | null> {
    return await DB_Connection.User.findByIdAndUpdate(
      id,
      {
        $set: { loginAttempts: 0, lastLoginAt: new Date() },
        $unset: { lockUntil: 1 },
      },
      { new: true },
    ).exec();
  }

  /**
   * Ghi nhận đăng nhập thất bại: tăng loginAttempts, tùy chọn đặt lockUntil.
   */
  async updateLoginFailure(
    id: string,
    attempts: number,
    lockUntil?: Date,
  ): Promise<IUserDocument | null> {
    const update: Record<string, unknown> = { $set: { loginAttempts: attempts } };
    if (lockUntil) {
      (update.$set as Record<string, unknown>).lockUntil = lockUntil;
    }
    return await DB_Connection.User.findByIdAndUpdate(id, update, { new: true }).exec();
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
}

export default new AuthRepository();
