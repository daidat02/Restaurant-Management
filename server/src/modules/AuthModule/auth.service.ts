import type { IUser, IUserDocument, UserRole } from '../../models/Schema/UserSchema.js';
import type { ObjectId } from 'mongoose';
import type { ServiceResponse } from '../../shared/type.js';
import authRepository from './auth.repository.js'; // Nhận instance Singleton trực tiếp, không cần 'new'
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import DB_Connection from '../../models/DB_Connection.js';
import { sendEmailAsync } from '../../services/email.service.js';
import { APP_PUBLIC_URL } from '../../configs/constants.js';

/** Thời hạn hiệu lực của token đặt lại mật khẩu (30 phút). */
const RESET_PASSWORD_TTL_MS = 30 * 60 * 1000;

const generateAccessToken = (userId: string, role: string, restaurantId?: string): string => {
  return jwt.sign({ _id: userId, role: role, restaurantId }, process.env.JWT_ACCESS_SECRET || '', {
    expiresIn: '30m',
  });
};

const generateRefreshToken = (userId: string, role: string): string => {
  return jwt.sign({ _id: userId, role: role }, process.env.JWT_REFRESH_SECRET || '', {
    expiresIn: '7d',
  });
};

/** Sinh token đặt lại mật khẩu (32 hex ngẫu nhiên). */
function generateResetToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

/** Link đặt lại mật khẩu hiển thị trong email. */
function buildResetPasswordUrl(token: string): string {
  return `${APP_PUBLIC_URL}/reset-password/${token}`;
}

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
   * Lấy nhà hàng đang hoạt động mặc định:
   * ưu tiên `primaryRestaurantId` (field tường minh), fallback phần tử đầu restaurantIds, rồi legacy `restaurant`.
   */
  private getActiveRestaurantId(user: IUserDocument): string | undefined {
    if (user.primaryRestaurantId) return user.primaryRestaurantId.toString();
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
    return {
      message: 'Đăng ký chủ nhà hàng thành công!',
      data: this.serializeUser(user),
      code: 201,
    };
  }

  /**
   * Đăng nhập hệ thống
   */
  async loginUserService(userData: {
    email: string;
    password: string;
  }): Promise<ServiceResponse<any>> {
    // Hỗ trợ đăng nhập bằng email HOẶC số điện thoại (field `email` có thể chứa SĐT).
    const identifier = (userData.email || '').trim();
    const exitUser = await authRepository.findOneUser({
      $or: [{ email: identifier }, { phone: identifier }],
    });
    if (!exitUser) {
      return { message: 'Email hoặc số điện thoại không được tìm thấy!', code: 400 };
    }

    // Chống brute-force: khóa tạm thời khi nhập sai quá nhiều lần (5 lần / 15 phút).
    const now = Date.now();
    if (exitUser.lockUntil && exitUser.lockUntil.getTime() > now) {
      const minutesLeft = Math.ceil((exitUser.lockUntil.getTime() - now) / 60000);
      return {
        message: `Tài khoản đã bị khóa tạm thời. Vui lòng thử lại sau ${minutesLeft} phút!`,
        code: 429,
      };
    }

    const isPasswordValid = await bcrypt.compare(userData.password, exitUser.password);
    if (!isPasswordValid) {
      const MAX_LOGIN_ATTEMPTS = 5;
      const LOCKOUT_MS = 15 * 60 * 1000;
      const attempts = (exitUser.loginAttempts ?? 0) + 1;
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        await authRepository.updateLoginFailure(
          exitUser._id.toString(),
          attempts,
          new Date(now + LOCKOUT_MS),
        );
        return {
          message: 'Quá nhiều lần đăng nhập sai. Tài khoản bị khóa 15 phút!',
          code: 429,
        };
      }
      await authRepository.updateLoginFailure(exitUser._id.toString(), attempts);
      return {
        message: `Mật khẩu không hợp lệ! (còn ${MAX_LOGIN_ATTEMPTS - attempts} lần thử)`,
        code: 400,
      };
    }

    if (!exitUser.isActive) {
      return { message: 'Tài khoản đã bị khóa!', code: 400 };
    }

    // Đăng nhập thành công → reset đếm sai + ghi nhận lần đăng nhập gần nhất.
    await authRepository.updateLoginSuccess(exitUser._id.toString());

    // Token cần restaurantId dạng id string thuần — lấy TRƯỚC khi populate,
    // vì sau populate restaurantIds[0] là document (toString() cho chuỗi không dùng được).
    const accessToken = generateAccessToken(
      exitUser._id.toString(),
      exitUser.role,
      this.getActiveRestaurantId(exitUser),
    );
    const refreshToken = generateRefreshToken(exitUser._id.toString(), exitUser.role);

    const exitUserPopulate = await exitUser.populate('restaurantIds', 'name');

    const userWithoutPassword = this.serializeUser(exitUserPopulate);

    console.log('User logged in:', userWithoutPassword);
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
    'gender',
    'birthday',
  ];

  /**
   * Kiểm tra quyền quản lý user khác theo thang bậc role.
   * - super-admin: quản lý mọi role.
   * - admin (chủ chuỗi): quản lý staff & manager (KHÔNG chạm tài khoản admin khác).
   * - manager: chỉ quản lý staff (KHÔNG chạm manager/admin).
   * - staff/customer: không quản lý ai.
   * Tự cập nhật bản thân luôn được phép.
   */
  private canManageTarget(actorRole: string, actorId: string, targetId: string, targetRole: string): boolean {
    if (actorId === targetId) return true;
    if (actorRole === 'super-admin') return true;
    if (actorRole === 'admin') return targetRole === 'staff' || targetRole === 'manager';
    if (actorRole === 'manager') return targetRole === 'staff';
    return false;
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

    if (exitUser._id.toString() !== id) {
      const targetUser = await authRepository.findUserById(id);
      if (!targetUser) {
        return { message: 'Không tìm thấy người dùng cần cập nhật!!!', code: 400 };
      }
      if (!this.canManageTarget(exitUser.role, userId, id, targetUser.role)) {
        return {
          message: 'Bạn không có quyền cập nhật người dùng này (chỉ quản lý được staff/manager trong phạm vi của bạn)!!!',
          code: 403,
        };
      }
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
        const restaurantUpdate: Partial<IUser> = {
          restaurantIds: restaurantIds as unknown as ObjectId[],
        };
        // Đồng bộ nhà hàng chính theo lần gán mới (nếu có nhà hàng được gán)
        if (restaurantIds[0]) {
          restaurantUpdate.primaryRestaurantId = restaurantIds[0] as unknown as ObjectId;
        }
        updateData = { ...cleanUpdate, ...restaurantUpdate };
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
   * Yêu cầu đặt lại mật khẩu (quên mật khẩu) — public, chống leak email:
   * trả 200 chung dù email tồn tại hay không; chỉ gửi email khi tài khoản tồn tại.
   */
  async forgotPasswordService(email: string): Promise<ServiceResponse<any>> {
    const user = await authRepository.findOneUser({ email, deletedAt: null });
    if (user) {
      const resetToken = generateResetToken();
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = new Date(Date.now() + RESET_PASSWORD_TTL_MS);
      await user.save();
      // Gửi email — lỗi gửi không ảnh hưởng response 200 chung (chống leak email).
      try {
        await sendEmailAsync({
          template: 'reset-password',
          to: user.email,
          data: {
            name: user.name || user.email,
            resetUrl: buildResetPasswordUrl(resetToken),
          },
        });
      } catch (error) {
        console.error('[forgotPasswordService] Gửi email reset-password thất bại:', error);
      }
    }
    return {
      message: 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.',
      code: 200,
    };
  }

  /**
   * Đặt mật khẩu mới bằng token (từ link trong email) — xác thực token + hết hạn,
   * băm mật khẩu, xoá token, tăng tokenVersion để vô hiệu phiên cũ.
   */
  async forgotPasswordResetService(token: string, newPassword: string): Promise<ServiceResponse<any>> {
    if (!token) return { message: 'Liên kết đặt lại mật khẩu không hợp lệ.', code: 400 };
    if (!newPassword || newPassword.length < 6) {
      return { message: 'Mật khẩu mới phải có ít nhất 6 ký tự.', code: 400 };
    }

    const user = await authRepository.findOneUser({
      resetPasswordToken: token,
      deletedAt: null,
    });
    if (!user || !user.resetPasswordExpires || user.resetPasswordExpires.getTime() < Date.now()) {
      return { message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.', code: 400 };
    }

    const updated = await authRepository.updatePassword(String(user._id), newPassword);
    if (!updated) {
      return { message: 'Đặt lại mật khẩu thất bại, vui lòng thử lại.', code: 400 };
    }
    // Xoá token sau khi dùng thành công (chống dùng lại lần 2).
    await DB_Connection.User.findByIdAndUpdate(user._id, {
      $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 },
    });
    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.', code: 200 };
  }

  /**
   * Xóa tài khoản (Xóa mềm - ẩn hoạt động)
   */
  async deleteUserService(actorUserId: string, actorRole: string, id: string): Promise<ServiceResponse<any>> {
    const exitUser = await authRepository.findUserById(id);
    if (!exitUser) {
      return { message: 'Không tìm thấy người dùng!!!', code: 400 };
    }

    if (!this.canManageTarget(actorRole, actorUserId, id, exitUser.role)) {
      return {
        message: 'Bạn không có quyền xóa người dùng này (chỉ quản lý được staff/manager trong phạm vi của bạn)!!!',
        code: 403,
      };
    }

    const user = await authRepository.deleteUser(id);
    if (!user) {
      return { message: 'Xóa người dùng thất bại, không tìm thấy người dùng!!!', code: 400 };
    }
    return { message: 'Xóa người dùng thành công!!!', data: this.serializeUser(user), code: 200 };
  }

  /**
   * Khoá / mở khoá user (manager xử lý staff, admin xử lý staff/manager).
   * Chỉ nhắm tới target có role thấp hơn; không thể khoá bản thân/admin khác.
   */
  async blockUserService(
    actorUserId: string,
    actorRole: string,
    id: string,
    blocked: boolean,
  ): Promise<ServiceResponse<any>> {
    const exitUser = await authRepository.findUserById(id);
    if (!exitUser) {
      return { message: 'Không tìm thấy người dùng!!!', code: 400 };
    }

    if (!this.canManageTarget(actorRole, actorUserId, id, exitUser.role)) {
      return {
        message: 'Bạn không có quyền khoá/mở khoá người dùng này!!!',
        code: 403,
      };
    }

    const user = await authRepository.updateProfile(id, { isActive: !blocked });
    if (!user) {
      return { message: 'Không tìm thấy người dùng!!!', code: 400 };
    }
    return {
      message: blocked ? 'Khoá tài khoản thành công!!!' : 'Mở khoá tài khoản thành công!!!',
      data: this.serializeUser(user),
      code: 200,
    };
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

    // Gate giới hạn theo gói: đếm nhân viên hiện có của chi nhánh trước khi tạo.
    const rid = restaurantIds[0]?.toString();
    if (rid) {
      const { assertLimit, countResource } = await import('../../services/plan-gate.service.js');
      const used = await countResource(rid, 'staff');
      try {
        await assertLimit(rid, 'staff', used, 1);
      } catch (gateError: any) {
        if (gateError?.code === 'PLAN_LIMIT_REACHED') {
          return {
            code: 403,
            errorCode: 'PLAN_LIMIT_REACHED',
            message: gateError.message,
            meta: { ...gateError.meta, restaurantId: rid },
          };
        }
        throw gateError;
      }
    }

    const { restaurant: _legacyRestaurant, ...rest } = userData;
    const resetToken = generateResetToken();
    const createData: Partial<IUser> = {
      ...rest,
      role: userData.role,
      restaurantIds: restaurantIds as unknown as ObjectId[],
      // Nhà hàng chính + thời điểm khởi tạo mật khẩu (nhân sự mới được admin/manager tạo)
      primaryRestaurantId: restaurantIds[0] as unknown as ObjectId,
      passwordChangedAt: new Date(),
      // Token đặt mật khẩu (dùng cho email account-created; đặt trước để user không phải chờ).
      resetPasswordToken: resetToken,
      resetPasswordExpires: new Date(Date.now() + RESET_PASSWORD_TTL_MS),
    };
    const user = await authRepository.createUser(createData);

    // Gửi email thông báo tạo tài khoản + link đặt mật khẩu (nền — lỗi gửi không ảnh hưởng tạo user).
    try {
      await this.sendAccountCreatedEmail(user, resetToken);
    } catch (error) {
      console.error('[createStaffService] Gửi email account-created thất bại:', error);
    }

    return { message: 'Tạo nhân viên thành công!!!', data: this.serializeUser(user), code: 201 };
  }

  /** Gửi email "tài khoản đã được tạo" tới nhân sự mới (kèm link đặt mật khẩu). */
  private async sendAccountCreatedEmail(user: IUser, resetToken: string): Promise<void> {
    if (!user.email) return;
    let restaurantName = '';
    if (user.primaryRestaurantId || (user.restaurantIds?.length ?? 0) > 0) {
      const restaurantId = user.primaryRestaurantId ?? user.restaurantIds![0];
      const restaurant = (await DB_Connection.Restaurant.findById(restaurantId).select('name').lean()) as
        | { name?: string }
        | null;
      restaurantName = restaurant?.name || '';
    }
    await sendEmailAsync({
      template: 'account-created',
      to: user.email,
      data: {
        name: user.name || user.email,
        roleName: user.role === 'manager' ? 'Quản lý' : 'Nhân viên',
        restaurantName,
        email: user.email,
        setPasswordUrl: buildResetPasswordUrl(resetToken),
      },
    });
  }

  /**
   * Lấy thông tin chi tiết một User bằng ID
   */
  async getProfileUserByIdService(id: string): Promise<ServiceResponse<any>> {
    const exitUser = await authRepository.findUserById(id);
    if (!exitUser) {
      return { message: 'Không tìm thấy người dùng!!!', code: 400 };
    }

    // Populate tên nhà hàng để client hiển thị (giống luồng login)
    const populated = await exitUser.populate('restaurantIds', 'name');

    return {
      message: 'Lấy thông tin người dùng thành công!!!',
      data: this.serializeUser(populated),
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
   * Lấy danh sách toàn bộ Nhân viên (Staff & Manager) thuộc một/nhiều nhà hàng.
   * @param restaurantIds - đơn id hoặc mảng id đã được intersectRestaurantIds xác thực;
   *   admin không truyền → mọi id sở hữu (union toàn chuỗi).
   */
  async getUsersByRolesService(
    roles: string[],
    restaurantIds?: string | string[],
  ): Promise<ServiceResponse<any>> {
    const filterQuery: any = {
      role: { $in: roles },
    };

    const ids = Array.isArray(restaurantIds) ? restaurantIds : restaurantIds ? [restaurantIds] : [];
    if (ids.length > 0) {
      // Ưu tiên restaurantIds (mới); fallback `restaurant` cho dữ liệu legacy chưa backfill (sẽ dọn ở ticket 03)
      filterQuery.$or = [{ restaurantIds: { $in: ids } }, { restaurant: { $in: ids } }];
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
