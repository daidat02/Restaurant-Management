import type { Request, Response } from 'express';
import authService from './auth.service.js'; // Nhận instance Singleton trực tiếp, không cần 'new'
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
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
      res.cookie('refreshToken', result.data.refreshToken, {
        httpOnly: true,
        secure: false, // Để true nếu chạy production có HTTPS
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
        sameSite: 'lax',
      });

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
      res.cookie('refreshToken', result.data.refreshToken, {
        httpOnly: true,
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
      });

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
      // Đổi role user là hành động nhạy cảm → ghi audit
      if (req.params?.id && updateData?.role) {
        await writeAuditLog({
          action: 'user.update.role',
          restaurant: req.tenantId || req.user?.restaurantId || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'user',
          targetId: id || null,
          summary: `Đổi role user ${id} thành ${updateData.role}`,
          meta: { role: updateData.role },
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
   * Xóa tài khoản (Xóa mềm bằng Service)
   */
  async deleteUser(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const result = await authService.deleteUserService(id || '');
      if (result.code === 200) {
        await writeAuditLog({
          action: 'user.delete',
          restaurant: req.tenantId || req.user?.restaurantId || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'user',
          targetId: id || null,
          summary: `Xóa user ${id}`,
        });
      }
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error deleting user:', error);
      return res.status(500).json({ message: 'Lỗi server khi xóa người dùng' });
    }
  }

  /**
   * Tạo nhân viên mới (Staff / Manager)
   */
  async createStaff(req: AuthRequest, res: Response) {
    // Ép user được tạo thuộc đúng tenant đang xác thực (req.tenantId), chặn gán tùy ý restaurantIds
    const userData = { ...req.body, restaurantIds: req.tenantId ? [req.tenantId] : undefined };
    try {
      const result = await authService.createStaffService(userData);
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

      // Nhà hàng lấy từ ngữ cảnh tenant đã xác thực (không tin query)
      const result = await authService.getUsersByRolesService(roles, req.tenantId);
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ message: 'Lỗi server khi lấy danh sách người dùng' });
    }
  }

  /**
   * Chuyển nhà hàng đang hoạt động (switch tenant) — trả access token mới
   */
  async switchTenant(req: AuthRequest, res: Response) {
    const { restaurantId } = req.body;
    try {
      const userId = req.user?.userId;
      const result = await authService.switchTenantService(userId || '', restaurantId);
      if (result.code === 200) {
        await writeAuditLog({
          action: 'user.switch-tenant',
          restaurant: restaurantId || null,
          actor: userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'system',
          targetId: restaurantId || null,
          summary: `Chuyển nhà hàng hoạt động sang ${restaurantId}`,
        });
      }
      return res.status(result.code).json(result);
    } catch (error) {
      console.error('Error switching tenant:', error);
      return res.status(500).json({ message: 'Lỗi server khi chuyển nhà hàng' });
    }
  }
}

export default new AuthController();
