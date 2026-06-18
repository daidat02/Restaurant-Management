import type { IUser } from '../../models/Schema/UserSchema.js';
import type { ServiceResponse } from '../../shared/type.js';
import authRepository from './auth.repository.js'; // Nhận instance Singleton trực tiếp, không cần 'new'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const generateAccessToken = (userId: string, role: string): string => {
  return jwt.sign({ _id: userId, role: role }, process.env.JWT_ACCESS_SECRET || '', {
    expiresIn: '30m',
  });
};

const generateRefreshToken = (userId: string, role: string): string => {
  return jwt.sign({ _id: userId, role: role }, process.env.JWT_REFRESH_SECRET || '', {
    expiresIn: '7d',
  });
};

class AuthService {
  /**
   * Đăng ký người dùng mới (Mặc định khách hàng)
   */
  async registerUserService(userData: IUser): Promise<ServiceResponse<any>> {
    const exitUser = await authRepository.findOneUser({ email: userData.email });
    if (exitUser) {
      return { message: 'Email đã tồn tại!', code: 400 };
    }

    const user = await authRepository.createUser(userData);
    return { message: 'Đăng ký thành công!', data: user, code: 201 };
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

    const accessToken = generateAccessToken(exitUser._id.toString(), exitUser.role);
    const refreshToken = generateRefreshToken(exitUser._id.toString(), exitUser.role);

    const { password, ...userWithoutPassword } = exitUser.toObject();

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

    const user = await authRepository.updateProfile(id, updateData);
    return { message: 'Cập nhật thành công!!!', data: user, code: 200 };
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
   * Xóa tài khoản (Xóa mềm - ẩn hoạt động)
   */
  async deleteUserService(id: string): Promise<ServiceResponse<any>> {
    const exitUser = await authRepository.findUserById(id);
    if (!exitUser) {
      return { message: 'Không tìm thấy người dùng!!!', code: 400 };
    }

    const user = await authRepository.deleteUser(id);
    return { message: 'Xóa người dùng thành công!!!', data: user, code: 200 };
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

    const user = await authRepository.createUser(userData);
    const { password, ...userWithoutPassword } = user.toObject();
    return { message: 'Tạo nhân viên thành công!!!', data: userWithoutPassword, code: 201 };
  }

  /**
   * Lấy thông tin chi tiết một User bằng ID
   */
  async getProfileUserByIdService(id: string): Promise<ServiceResponse<any>> {
    const exitUser = await authRepository.findUserById(id);
    if (!exitUser) {
      return { message: 'Không tìm thấy người dùng!!!', code: 400 };
    }

    const { password, ...userWithoutPassword } = exitUser.toObject();
    return {
      message: 'Lấy thông tin người dùng thành công!!!',
      data: userWithoutPassword,
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

    const usersWithoutPassword = users.map((user) => {
      const { password, ...userWithoutPassword } = user.toObject();
      return userWithoutPassword;
    });

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
      filterQuery.restaurant = restaurantId;
    }
    const users = await authRepository.findUsers(filterQuery);

    const usersWithoutPassword = users.map((user) => {
      const { password, ...userWithoutPassword } = user.toObject();
      return userWithoutPassword;
    });

    return {
      message: 'Lấy tất cả nhân viên thành công!!!',
      data: usersWithoutPassword,
      code: 200,
    };
  }

  /**
   * Cấp lại cặp Token mới bằng Refresh Token
   */
  async refreshTokenService(refreshToken: string): Promise<ServiceResponse<any>> {
    if (!refreshToken) {
      return { message: 'Token không được cung cấp!', code: 400 };
    }

    try {
      const decoded: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || '');
      const userId = decoded._id;
      const role = decoded.role;

      const newAccessToken = generateAccessToken(userId, role);
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
}

export default new AuthService(); // Export Instance đồng bộ với tầng Repo
