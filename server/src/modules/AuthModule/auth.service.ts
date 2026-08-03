import type { IUser, IUserDocument, UserRole } from '../../models/Schema/UserSchema.js';
import type { ObjectId } from 'mongoose';
import type { ServiceResponse } from '../../shared/type.js';
import authRepository from './auth.repository.js'; // Nhận instance Singleton trực tiếp, không cần 'new'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import DB_Connection from '../../models/DB_Connection.js';

const generateAccessToken = (userId: string, role: string, restaurantId?: string): string => {
  return jwt.sign(
    { _id: userId, role: role, restaurantId },
    process.env.JWT_ACCESS_SECRET || '',
    {
      expiresIn: '30m',
    },
  );
};

const generateRefreshToken = (userId: string, role: string): string => {
  return jwt.sign({ _id: userId, role: role }, process.env.JWT_REFRESH_SECRET || '', {
    expiresIn: '7d',
  });
};

class AuthService {
  /**
   * Chuẩn hoá danh sách restaurantIds từ body.
   * Hỗ trợ cả field mới `restaurantIds` (mảng) lẫn field cũ `restaurant` (đơn) để client legacy vẫn gửi được.
   */
  private buildRestaurantIds(userData: Partial<IUser>): string[] {
    const ids = Array.isArray(userData.restaurantIds) ? userData.restaurantIds : [];
    const legacy = userData.restaurant ? [userData.restaurant] : [];
    const merged = [...ids, ...legacy].filter(Boolean).map((id) => String(id));
    return Array.from(new Set(merged));
  }

  /**
   * Validate số lượng nhà hàng theo role (đa tenant).
   * staff/manager = đúng 1; admin = nhiều (>=1); super-admin/customer = rỗng.
   * Trả về message lỗi hoặc null nếu hợp lệ.
   */
  private validateRestaurantCount(role: UserRole, count: number): string | null {
    if (role === 'staff' || role === 'manager') {
      if (count !== 1) return `Vai trò '${role}' phải thuộc đúng 1 nhà hàng.`;
    }
    if (role === 'admin') {
      if (count < 1) return "Vai trò 'admin' phải thuộc ít nhất 1 nhà hàng.";
    }
    if (role === 'customer' || role === 'super-admin') {
      if (count > 0) return `Vai trò '${role}' không được gán nhà hàng.`;
    }
    return null;
  }

  /**
   * Lấy nhà hàng đang hoạt động mặc định (phần tử đầu tiên của restaurantIds, fallback field legacy `restaurant`).
   */
  private getActiveRestaurantId(user: IUserDocument): string | undefined {
    if (user.restaurantIds && user.restaurantIds.length > 0) {
      return user.restaurantIds[0]!.toString();
    }
    return user.restaurant?.toString();
  }

  /**
   * Serialize user ra DTO cho client: bỏ password, giữ field `restaurant` compat cho client legacy.
   * Field compat `restaurant` sẽ bị xoá ở ticket 06 sau khi client migrate sang restaurantIds.
   */
  private serializeUser(user: IUserDocument) {
    const { password, restaurantIds, ...rest } = user.toObject();
    const legacyRestaurant =
      restaurantIds && restaurantIds.length > 0 ? restaurantIds[0] : user.restaurant;
    return { ...rest, restaurantIds, restaurant: legacyRestaurant };
  }

  /**
   * Đăng ký người dùng mới (Mặc định khách hàng)
   */
  async registerUserService(userData: IUser): Promise<ServiceResponse<any>> {
    const exitUser = await authRepository.findOneUser({ email: userData.email });
    if (exitUser) {
      return { message: 'Email đã tồn tại!', code: 400 };
    }

    // Đăng ký công khai chỉ tạo tài khoản khách hàng, không gán nhà hàng
    // (loại bỏ field legacy `restaurant` khỏi body để không lọt vào DB)
    const { restaurant: _legacyRestaurant, ...rest } = userData;
    const createData: Partial<IUser> = {
      ...rest,
      role: 'customer',
      restaurantIds: [],
    };
    const user = await authRepository.createUser(createData);
    return { message: 'Đăng ký thành công!', data: this.serializeUser(user), code: 201 };
  }

  /**
   * Đăng ký chủ nhà hàng (self-serve SaaS): role = admin, restaurantIds = [].
   * Chủ đăng ký xong sẽ vào wizard tạo nhà hàng đầu tiên (trial 30 ngày).
   */
  async registerOwnerService(userData: Partial<IUser>): Promise<ServiceResponse<any>> {
    const exitUser = await authRepository.findOneUser({ email: userData.email });
    if (exitUser) {
      return { message: 'Email đã tồn tại!', code: 400 };
    }

    const { restaurant: _legacyRestaurant, restaurantIds: _legacyIds, ...rest } = userData;
    const createData: Partial<IUser> = {
      ...rest,
      role: 'admin',
      restaurantIds: [],
    };
    const user = await authRepository.createUser(createData);
    return { message: 'Đăng ký chủ nhà hàng thành công!', data: this.serializeUser(user), code: 201 };
  }

  /**
   * Đăng nhập hệ thống
   */
  async loginUserService(userData: {
    email: string;
    password: string;
  }): Promise<ServiceResponse<any>> {
    const exitUser = await authRepository.findOneUser({ email: userData.email });
    if (!exitUser) {
      return { message: 'Email không được tìm thấy!', code: 400 };
    }

    const isPasswordValid = await bcrypt.compare(userData.password, exitUser.password);
    if (!isPasswordValid) {
      return { message: 'Mật khẩu không hợp lệ!', code: 400 };
    }

    if (!exitUser.isActive) {
      return { message: 'Tài khoản đã bị khóa!', code: 400 };
    }

    const accessToken = generateAccessToken(
      exitUser._id.toString(),
      exitUser.role,
      this.getActiveRestaurantId(exitUser),
    );
    const refreshToken = generateRefreshToken(exitUser._id.toString(), exitUser.role);

    const userWithoutPassword = this.serializeUser(exitUser);

    return {
      message: 'Đăng nhập thành công!',
      data: {
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      },
      code: 200,
    };
  }

  // Danh sách trường người dùng tự cập nhật cho chính mình (Profile/Settings)
  private readonly SELF_UPDATE_FIELDS = [
    'name',
    'phone',
    'address',
    'avatar',
    'notificationEnabled',
  ];

  /**
   * Cập nhật thông tin cá nhân (Profile)
   */
  async updateUserService(
    id: string,
    userId: string,
    updateData: Partial<IUser>,
  ): Promise<ServiceResponse<any>> {
    const exitUser = await authRepository.findUserById(userId);
    if (!exitUser) {
      return { message: 'Không tìm thấy người dùng!!!', code: 400 };
    }

    if (exitUser._id.toString() !== id && exitUser.role !== 'admin') {
      return { message: 'Bạn không có quyền cập nhật người dùng này!!!', code: 403 };
    }

    // Nếu là user tự cập nhật bản thân: chỉ cho phép cập nhật các trường an toàn,
    // tránh lộ role/restaurantIds/password qua endpoint /auth/update/me
    if (exitUser._id.toString() === id) {
      const sanitizedData: Partial<IUser> = {};
      for (const field of this.SELF_UPDATE_FIELDS) {
        if (field in updateData) {
          (sanitizedData as any)[field] = (updateData as any)[field];
        }
      }
      updateData = sanitizedData;
    }

    // Admin cập nhật user khác: nếu đổi nhà hàng, chuẩn hoá + validate theo role của user bị sửa
    if (exitUser._id.toString() !== id) {
      if ('restaurantIds' in updateData || 'restaurant' in updateData) {
        const targetUser = await authRepository.findUserById(id);
        if (!targetUser) {
          return { message: 'Không tìm thấy người dùng cần cập nhật!!!', code: 400 };
        }
        const restaurantIds = this.buildRestaurantIds(updateData);
        const error = this.validateRestaurantCount(targetUser.role, restaurantIds.length);
        if (error) {
          return { message: error, code: 400 };
        }
        // Admin (chủ chuỗi) chỉ được gán user vào nhà hàng thuộc chuỗi của chính mình
        if (exitUser.role === 'admin') {
          const ownedIds = (exitUser.restaurantIds || []).map((id) => String(id));
          const notOwned = restaurantIds.filter((id) => !ownedIds.includes(id));
          if (notOwned.length > 0) {
            return {
              message: 'Chỉ được gán nhà hàng thuộc chuỗi của bạn!!!',
              code: 403,
            };
          }
        }
        const { restaurant: _legacyRestaurant, ...cleanUpdate } = updateData;
        updateData = { ...cleanUpdate, restaurantIds: restaurantIds as unknown as ObjectId[] };
      }
    }

    const user = await authRepository.updateProfile(id, updateData);
    if (!user) {
      return { message: 'Cập nhật thất bại, không tìm thấy người dùng!!!', code: 400 };
    }
    return { message: 'Cập nhật thành công!!!', data: this.serializeUser(user), code: 200 };
  }

  /**
   * Đổi mật khẩu tài khoản
   */
  async updatePasswordService(
    id: string,
    newPassword: string,
    isValidPassword: string,
  ): Promise<ServiceResponse<any>> {
    if (newPassword !== isValidPassword) {
      return { message: 'Mật khẩu không khớp!!!', code: 400 };
    }

    const user = await authRepository.updatePassword(id, newPassword);
    return { message: 'Cập nhật thành công!!!', data: user, code: 200 };
  }

  /**
   * Đổi mật khẩu có xác thực mật khẩu hiện tại (Dành cho Customer từ trang Settings)
   */
  async changePasswordService(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<ServiceResponse<any>> {
    const exitUser = await authRepository.findOneUser({ _id: id });
    if (!exitUser) {
      return { message: 'Không tìm thấy người dùng!!!', code: 400 };
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, exitUser.password);
    if (!isPasswordValid) {
      return { message: 'Mật khẩu hiện tại không chính xác!!!', code: 400 };
    }

    if (newPassword.length < 6) {
      return { message: 'Mật khẩu mới phải có ít nhất 6 ký tự!!!', code: 400 };
    }

    const user = await authRepository.updatePassword(id, newPassword);
    if (!user) {
      return { message: 'Đổi mật khẩu thất bại, không tìm thấy người dùng!!!', code: 400 };
    }
    return { message: 'Đổi mật khẩu thành công!!!', data: this.serializeUser(user), code: 200 };
  }

  /**
   * Xóa tài khoản (Xóa mềm - ẩn hoạt động)
   */
  async deleteUserService(id: string): Promise<ServiceResponse<any>> {
    const exitUser = await authRepository.findUserById(id);
    if (!exitUser) {
      return { message: 'Không tìm thấy người dùng!!!', code: 400 };
    }

    const user = await authRepository.deleteUser(id);
    if (!user) {
      return { message: 'Xóa người dùng thất bại, không tìm thấy người dùng!!!', code: 400 };
    }
    return { message: 'Xóa người dùng thành công!!!', data: this.serializeUser(user), code: 200 };
  }

  /**
   * Tạo tài khoản nội bộ (Dành cho staff & manager)
   */
  async createStaffService(userData: IUser): Promise<ServiceResponse<any>> {
    const exitUser = await authRepository.findOneUser({ email: userData.email });
    if (exitUser) {
      return { message: 'Email đã tồn tại!!!', code: 400 };
    }

    if (userData.role !== 'staff' && userData.role !== 'manager') {
      return { message: "Chỉ có thể tạo nhân viên với vai trò 'staff' & 'manager'!!!", code: 400 };
    }

    // Chuẩn hoá danh sách nhà hàng (hỗ trợ cả field cũ `restaurant`) + enforce đúng 1 nhà hàng
    const restaurantIds = this.buildRestaurantIds(userData);
    const error = this.validateRestaurantCount(userData.role, restaurantIds.length);
    if (error) {
      return { message: error, code: 400 };
    }

    const { restaurant: _legacyRestaurant, ...rest } = userData;
    const createData: Partial<IUser> = {
      ...rest,
      role: userData.role,
      restaurantIds: restaurantIds as unknown as ObjectId[],
    };
    const user = await authRepository.createUser(createData);
    return { message: 'Tạo nhân viên thành công!!!', data: this.serializeUser(user), code: 201 };
  }

  /**
   * Lấy thông tin chi tiết một User bằng ID
   */
  async getProfileUserByIdService(id: string): Promise<ServiceResponse<any>> {
    const exitUser = await authRepository.findUserById(id);
    if (!exitUser) {
      return { message: 'Không tìm thấy người dùng!!!', code: 400 };
    }

    return {
      message: 'Lấy thông tin người dùng thành công!!!',
      data: this.serializeUser(exitUser),
      code: 200,
    };
  }

  /**
   * Lấy danh sách toàn bộ Khách hàng (Customer)
   */
  async getAllCustomerService(): Promise<ServiceResponse<any>> {
    const users = await authRepository.findUsers({ role: 'customer' });
    if (!users || users.length === 0) {
      return { message: 'Không có người dùng nào!!!', code: 404 };
    }

    const usersWithoutPassword = users.map((user) => this.serializeUser(user));

    return {
      message: 'Lấy tất cả người dùng thành công!!!',
      data: usersWithoutPassword,
      code: 200,
    };
  }

  /**
   * Lấy danh sách toàn bộ Nhân viên (Staff & Manager)
   */
  async getUsersByRolesService(
    roles: string[],
    restaurantId?: string,
  ): Promise<ServiceResponse<any>> {
    const filterQuery: any = {
      role: { $in: roles },
    };

    if (restaurantId) {
      // Ưu tiên restaurantIds (mới); fallback `restaurant` cho dữ liệu legacy chưa backfill (sẽ dọn ở ticket 03)
      filterQuery.$or = [{ restaurantIds: restaurantId }, { restaurant: restaurantId }];
    }
    const users = await authRepository.findUsers(filterQuery);

    const usersWithoutPassword = users.map((user) => this.serializeUser(user));

    return {
      message: 'Lấy tất cả nhân viên thành công!!!',
      data: usersWithoutPassword,
      code: 200,
    };
  }

  /**
   * Cấp lại cặp Token mới bằng Refresh Token.
   * Refresh token không chứa `restaurantId` (không đổi cấu trúc) nên access token mới
   * lấy restaurantId từ body (tenant đang chọn) hoặc nhà hàng mặc định của user.
   */
  async refreshTokenService(
    refreshToken: string,
    restaurantId?: string,
  ): Promise<ServiceResponse<any>> {
    if (!refreshToken) {
      return { message: 'Token không được cung cấp!', code: 400 };
    }

    try {
      const decoded: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || '');
      const userId = decoded._id;
      const role = decoded.role;

      const user = await authRepository.findUserById(userId);
      if (!user) {
        return { message: 'Người dùng không tồn tại!', code: 400 };
      }

      let activeRestaurantId = restaurantId;
      if (restaurantId) {
        // Verify user thuộc nhà hàng được yêu cầu (tránh lạm dụng token refresh để đổi tenant)
        const belongs =
          (user.restaurantIds || []).some((id) => id.toString() === restaurantId) ||
          user.restaurant?.toString() === restaurantId;
        if (!belongs) {
          return { message: 'Bạn không thuộc nhà hàng này!', code: 403 };
        }
      } else {
        activeRestaurantId = this.getActiveRestaurantId(user);
      }

      const newAccessToken = generateAccessToken(userId, role, activeRestaurantId);
      const newRefreshToken = generateRefreshToken(userId, role);

      return {
        message: 'Làm mới token thành công!',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
        code: 200,
      };
    } catch (error) {
      console.error('Error refreshing token:', error);
      return { message: 'Làm mới token thất bại!', code: 401 };
    }
  }

  /**
   * Chuyển nhà hàng đang hoạt động (switch tenant) — cấp access token mới mà không cần đăng nhập lại.
   */
  async switchTenantService(userId: string, restaurantId: string): Promise<ServiceResponse<any>> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      return { message: 'Không tìm thấy người dùng!!!', code: 400 };
    }
    if (!restaurantId) {
      return { message: 'Thiếu restaurantId!', code: 400 };
    }

    const belongs =
      (user.restaurantIds || []).some((id) => id.toString() === restaurantId) ||
      user.restaurant?.toString() === restaurantId;
    if (!belongs) {
      return { message: 'Bạn không thuộc nhà hàng này!', code: 403 };
    }

    const accessToken = generateAccessToken(user._id.toString(), user.role, restaurantId);
    return { message: 'Chuyển nhà hàng thành công!', data: { accessToken }, code: 200 };
  }
}

export default new AuthService(); // Export Instance đồng bộ với tầng Repo
