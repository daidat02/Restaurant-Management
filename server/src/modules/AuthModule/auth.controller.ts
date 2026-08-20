import type { Request, Response } from 'express';
import authService from './auth.service.js';

/**
 * Options cookie refresh token.
 * Production: client (Vercel) gọi cross-site tới server (Render) → bắt buộc
 * `sameSite: 'none'` + `secure: true` (HTTPS) để browser gửi cookie khi refresh.
 * Local/test (HTTP, không cross-site): giữ `lax` + không `secure`.
 */
const refreshCookieOptions = (): any => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  };
}; // Nhận instance Singleton trực tiếp, không cần 'new'
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import type { IUser } from '../../models/Schema/UserSchema.js';
import { writeAuditLog } from '../../services/auditLog.service.js';

class AuthController {
  /**
   * Đăng ký người dùng
   */
  async registerUser(req: Request, res: Response) {
    const userData = req.body;
    try {
      const result = await authService.registerUserService(userData);
      if (result.code === 201 || result.code === 200) {
        await writeAuditLog({
          action: 'user.register',
          restaurant: userData?.restaurant || req.query?.restaurantId || null,
          actor: null,
          targetType: 'user',
          targetId: result.data?._id || null,
          summary: `Đăng ký tài khoản mới (${userData?.role || 'customer'})`,
          meta: { email: userData?.email },
        });
      }
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error during user registration:', error);
      return res.status(500).json({ message: 'Lỗi server khi đăng ký người dùng' });
    }
  }

  /**
   * Đăng ký chủ nhà hàng (role admin, self-serve) — tách khỏi đăng ký khách.
   */
  async registerOwner(req: Request, res: Response) {
    const userData = req.body;
    try {
      const result = await authService.registerOwnerService(userData);
      if (result.code === 201 || result.code === 200) {
        await writeAuditLog({
          action: 'user.register',
          restaurant: null,
          actor: null,
          targetType: 'user',
          targetId: result.data?._id || null,
          summary: `Đăng ký chủ nhà hàng mới (${userData?.email})`,
          meta: { email: userData?.email, role: 'admin' },
        });
      }
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error during owner registration:', error);
      return res.status(500).json({ message: 'Lỗi server khi đăng ký chủ nhà hàng' });
    }
  }

  /**
   * Đăng nhập người dùng + Cài đặt HttpOnly Cookie
   */
  async loginUser(req: Request, res: Response) {
    const userData = req.body;
    try {
      const result = await authService.loginUserService(userData);

      if (result.code !== 200 || !result.data) {
        return res.status(result.code).json(result);
      }

      // Lưu refreshToken vào HttpOnly Cookie an toàn
      res.cookie('refreshToken', result.data.refreshToken, refreshCookieOptions());

      // Bóc tách bỏ refreshToken khỏi object trả về Client DApp/Frontend
      const { refreshToken, ...userWithoutRefreshToken } = result.data;

      return res.status(result.code).json({
        message: result.message,
        data: userWithoutRefreshToken,
      });
    } catch (error) {
      console.error('Error during login:', error);
      return res.status(500).json({ message: 'Lỗi server khi đăng nhập' });
    }
  }

  /**
   * Làm mới Access Token thông qua Refresh Token trong Cookie
   */
  async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken;
      const { restaurantId } = req.body;

      if (!refreshToken) {
        return res
          .status(401)
          .json({ success: false, message: 'Không tìm thấy Refresh Token trong Cookie' });
      }

      const result = await authService.refreshTokenService(refreshToken, restaurantId);

      if (result.code !== 200 || !result.data) {
        res.clearCookie('refreshToken');
        return res.status(result.code || 401).json({
          success: false,
          message: result.message || 'Refresh Token không hợp lệ hoặc đã hết hạn',
        });
      }

      // Set lại cookie Refresh Token mới tuần hoàn
      res.cookie('refreshToken', result.data.refreshToken, refreshCookieOptions());

      const { refreshToken: newRefreshToken, ...resultWithoutRefreshToken } = result.data;

      return res.status(result.code).json({
        success: true,
        message: result.message,
        data: resultWithoutRefreshToken,
      });
    } catch (error) {
      console.error('Error during token refresh:', error);
      return res.status(500).json({ success: false, message: 'Lỗi server khi làm mới token' });
    }
  }

  /**
   * Cập nhật thông tin cá nhân
   */
  async updateUser(req: AuthRequest, res: Response) {
    const updateData = req.body;
    try {
      const userId = req.user?.userId;
      const id = req.params?.id || userId;

      if (!id) {
        return res.status(400).json({ message: 'Thiếu ID người dùng' });
      }

      const result = await authService.updateUserService(id, userId || '', updateData);
      // Chỉ audit khi admin/manager cập nhật user KHÁC (bản thân tự sửa profile thì bỏ qua — tránh spam log)
      if (req.params?.id && result.code === 200) {
        const isRoleChange = !!updateData?.role;
        await writeAuditLog({
          action: isRoleChange ? 'user.update.role' : 'user.update',
          restaurant: req.tenantId || req.user?.restaurantId || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'user',
          targetId: id || null,
          summary: isRoleChange
            ? `Đổi role user ${id} thành ${updateData.role}`
            : `Cập nhật thông tin user ${id}`,
          meta: isRoleChange ? { role: updateData.role } : { fields: Object.keys(updateData || {}) },
        });
      }
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ message: 'Lỗi server khi cập nhật người dùng' });
    }
  }

  /**
   * Đổi mật khẩu
   */
  async updatePassword(req: AuthRequest, res: Response) {
    const { newPassword, isvalidPassword } = req.body;
    try {
      const id = req.user?.userId;
      const result = await authService.updatePasswordService(
        id || '',
        newPassword,
        isvalidPassword,
      );
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error updating password:', error);
      return res.status(500).json({ message: 'Lỗi server khi cập nhật mật khẩu' });
    }
  }

  /**
   * Đổi mật khẩu có xác thực mật khẩu hiện tại (Dành cho khách hàng từ trang Settings)
   */
  async changePassword(req: AuthRequest, res: Response) {
    const { currentPassword, newPassword } = req.body;
    try {
      const id = req.user?.userId;
      const result = await authService.changePasswordService(
        id || '',
        currentPassword,
        newPassword,
      );
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error changing password:', error);
      return res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu' });
    }
  }

  /**
   * Yêu cầu đặt lại mật khẩu (quên mật khẩu) — public.
   */
  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Vui lòng nhập email.' });
    try {
      const result = await authService.forgotPasswordService(String(email));
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error forgot password:', error);
      return res.status(500).json({ message: 'Lỗi server khi xử lý yêu cầu' });
    }
  }

  /**
   * Đặt lại mật khẩu bằng token từ email — public.
   */
  async forgotPasswordReset(req: Request, res: Response) {
    const { token, newPassword } = req.body;
    try {
      const result = await authService.forgotPasswordResetService(String(token), String(newPassword));
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error reset password:', error);
      return res.status(500).json({ message: 'Lỗi server khi đặt lại mật khẩu' });
    }
  }

  /**
   * Xác thực mã OTP để hoàn tất đăng ký — public + rate-limit.
   * Thành công → set refreshToken cookie + trả tokens (auto-login).
   */
  async verifyOtp(req: Request, res: Response) {
    const { email, otp } = req.body;
    try {
      const result = await authService.verifyOtpService(String(email || ''), String(otp || ''));
      if (result.code === 200 && result.data?.refreshToken) {
        res.cookie('refreshToken', result.data.refreshToken, refreshCookieOptions());
        const { refreshToken: _refreshToken, ...dataWithoutRefreshToken } = result.data;
        return res.status(200).json({ ...result, data: dataWithoutRefreshToken });
      }
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return res.status(500).json({ message: 'Lỗi server khi xác thực mã OTP' });
    }
  }

  /**
   * Gửi lại mã OTP — public + rate-limit (cooldown 60s phía service).
   */
  async resendOtp(req: Request, res: Response) {
    const { email } = req.body;
    try {
      const result = await authService.resendOtpService(String(email || ''));
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error resending OTP:', error);
      return res.status(500).json({ message: 'Lỗi server khi gửi lại mã OTP' });
    }
  }

  /**
   * Xóa tài khoản (Xóa mềm bằng Service)
   */
  async deleteUser(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const actorUserId = req.user?.userId || '';
      const actorRole = req.user?.role || '';
      const result = await authService.deleteUserService(actorUserId, actorRole, id || '');
      if (result.code === 200) {
        await writeAuditLog({
          action: 'user.delete',
          restaurant: req.tenantId || req.user?.restaurantId || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'user',
          targetId: id || null,
          summary: 'Xóa tài khoản người dùng',
        });
      }
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ message: 'Lỗi server khi xóa người dùng' });
    }
  }

  /**
   * Khoá / mở khoá tài khoản (staff/manager) — chỉ quản lý cấp dưới, không chạm admin.
   */
  async blockUser(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const blocked = req.body?.blocked === true;
    try {
      const actorUserId = req.user?.userId || '';
      const actorRole = req.user?.role || '';
      const result = await authService.blockUserService(actorUserId, actorRole, id || '', blocked);
      if (result.code === 200) {
        await writeAuditLog({
          action: blocked ? 'user.block' : 'user.unblock',
          restaurant: req.tenantId || req.user?.restaurantId || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'user',
          targetId: id || null,
          summary: blocked ? 'Khoá tài khoản người dùng' : 'Mở khoá tài khoản người dùng',
        });
      }
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error blocking user:', error);
      return res.status(500).json({ message: 'Lỗi server khi khoá/mở khoá người dùng' });
    }
  }

  /**
   * Tạo nhân viên mới (Staff / Manager)
   */
  async createStaff(req: AuthRequest, res: Response) {
    // Ép user được tạo thuộc đúng tenant đang xác thực (req.tenantId), chặn gán tùy ý restaurantIds.
    // Bỏ field legacy `restaurant` để buildRestaurantIds không gộp nhầm id ngoài phạm vi.
    const { restaurant: _legacyRestaurant, ...bodyRest } = req.body;
    const userData = {
      ...bodyRest,
      restaurantIds: req.tenantId ? [req.tenantId] : undefined,
    } as IUser;
    try {
      const result = await authService.createStaffService(userData);
      if (result.code === 201) {
        await writeAuditLog({
          action: 'user.create',
          restaurant: req.tenantId || req.user?.restaurantId || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'user',
          targetId: result.data?._id || null,
          summary: `Tạo tài khoản nội bộ (${result.data?.role || userData.role}) ${userData.email}`,
          meta: { email: userData.email, role: result.data?.role || userData.role },
        });
      }
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error creating staff:', error);
      return res.status(500).json({ message: 'Lỗi server khi tạo nhân viên' });
    }
  }

  /**
   * Xem thông tin cá nhân qua ID
   */
  async getProfileUserById(req: AuthRequest, res: Response) {
    const id = req.params.id || req.user?.userId;
    try {
      if (!id) {
        return res.status(400).json({ message: 'Thiếu ID người dùng' });
      }
      const result = await authService.getProfileUserByIdService(id);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ message: 'Lỗi server khi lấy thông tin người dùng' });
    }
  }

  /**
   * Lấy toàn bộ Khách hàng (Customer)
   */
  async getAllCustomer(req: AuthRequest, res: Response) {
    try {
      const result = await authService.getAllCustomerService();
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error fetching customers:', error);
      return res.status(500).json({ message: 'Lỗi server khi lấy danh sách khách hàng' });
    }
  }

  async getUsersWithFilter(req: AuthRequest, res: Response) {
    try {
      const queryRoles = req.query.roles;

      // Chuyển đổi query thành mảng string kể cả khi FE chỉ truyền 1 role (ví dụ: ?roles=customer)
      const roles = Array.isArray(queryRoles)
        ? (queryRoles as string[])
        : queryRoles
          ? [queryRoles as string]
          : [];

      // Nhà hàng lấy từ danh sách đã được intersectRestaurantIds xác thực (không tin query)
      // - Admin bỏ param → toàn chuỗi (union); gửi restaurantIds/restaurantId → đúng các chi nhánh đã chọn.
      // - Manager/staff → tenant hiện tại.
      const result = await authService.getUsersByRolesService(roles, req.user?.restaurantIds);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ message: 'Lỗi server khi lấy danh sách người dùng' });
    }
  }

  /**
   * Chuyển nhà hàng đang hoạt động (switch tenant) — trả access token mới.
   * Không ghi audit (hành động cá nhân, không phải thay đổi dữ liệu).
   */
  async switchTenant(req: AuthRequest, res: Response) {
    const { restaurantId } = req.body;
    try {
      const userId = req.user?.userId;
      const result = await authService.switchTenantService(userId || '', restaurantId);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error switching tenant:', error);
      return res.status(500).json({ message: 'Lỗi server khi chuyển nhà hàng' });
    }
  }
}

export default new AuthController();
