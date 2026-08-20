import SettingService from './setting.service.js';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import { writeAuditLog } from '../../services/auditLog.service.js';

const settingService = new SettingService();

class SettingController {
  /**
   * Tạo mới cấu hình cài đặt
   */
  async createSetting(req: Request, res: Response) {
    const settingData = req.body;
    try {
      const result = await settingService.createSettingService(settingData);
      res.status(result.code).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi tạo cấu hình cài đặt' });
    }
  }

  async getSettingById(req: AuthRequest, res: Response) {
    // Nhà hàng lấy từ ngữ cảnh tenant đã xác thực (không tin params.id)
    const restaurantId = req.tenantId;
    try {
      const result = await settingService.findSettingByRestaurantIdService(restaurantId || '');
      res.status(result.code).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi lấy thông tin cấu hình' });
    }
  }

  /**
   * Cập nhật thông tin chi tiết cấu hình (Form tổng lực).
   * Chỉ ghi audit khi thay đổi liên quan cấu hình PayOS (thay đổi cấu hình khác không ghi log).
   */
  async updateSetting(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const settingData = req.body;
    try {
      const result = await settingService.updateSettingService(id || '', settingData);
      if (result.code === 200 && id) {
        const changedKeys = Object.keys(settingData || {});
        const isPayos = changedKeys.some((k) => k.toLowerCase().includes('payos') || k === 'payosConfig');
        if (isPayos) {
          await writeAuditLog({
            action: 'setting.payos.update',
            restaurant: req.tenantId || req.user?.restaurantId || null,
            actor: req.user?.userId || null,
            actorInfo: { name: req.user?.name, role: req.user?.role },
            targetType: 'setting',
            targetId: id || null,
            summary: 'Cập nhật cấu hình PayOS',
            meta: { fields: changedKeys },
          });
        }
      }
      res.status(result.code).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi cập nhật cấu hình' });
    }
  }

  /**
   * Xóa cấu hình cài đặt khỏi hệ thống
   */
  async deleteSetting(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const result = await settingService.deleteSettingService(id || '');
      res.status(result.code).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi xóa cấu hình' });
    }
  }

  /**
   * Lấy hoặc Khởi tạo nhanh cấu hình theo scope và targetId
   * API này cực kỳ phù hợp khi tab Cài đặt ở Front-end được click mở ra
   */
  async getOrCreateSetting(req: AuthRequest, res: Response) {
    const { scope, model, targetId } = req.params; // Hoặc lấy từ req.query tùy theo cách bạn thiết kế Route
    try {
      // Với setting của nhà hàng, targetId lấy từ ngữ cảnh tenant đã xác thực
      const effectiveTargetId = model === 'Restaurant' ? req.tenantId : targetId;
      const result = await settingService.getOrCreateSettingService(
        scope as 'admin' | 'restaurant' | 'platform',
        model as 'User' | 'Restaurant',
        effectiveTargetId || '',
      );
      res.status(result.code).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi tải hoặc khởi tạo cấu hình cài đặt' });
    }
  }

  /**
   * Cập nhật nhanh loại hình phương thức thanh toán chuyển khoản mặc định
   */
  async updatePaymentMethodType(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { paymentMethodType, payload } = req.body;
    try {
      const result = await settingService.updatePaymentMethodTypeService(
        id || '',
        paymentMethodType,
        payload,
      );
      if (result.code === 200 && id) {
        await writeAuditLog({
          action: 'setting.payos.update',
          restaurant: req.tenantId || req.user?.restaurantId || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'setting',
          targetId: id || null,
          summary: 'Cập nhật phương thức thanh toán',
          meta: { paymentMethodType },
        });
      }
      res.status(result.code).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi cập nhật phương thức thanh toán' });
    }
  }

  /**
   * Lấy cấu hình cổng thanh toán hệ thống (Chỉ Super Admin)
   */
  async getGatewayConfig(_req: Request, res: Response) {
    try {
      const result = await settingService.getGatewayConfigService();
      res.status(result.code).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi lấy cấu hình cổng thanh toán' });
    }
  }

  /**
   * Lưu cấu hình cổng thanh toán hệ thống (Chỉ Super Admin)
   */
  async upsertGatewayConfig(req: AuthRequest, res: Response) {
    try {
      const result = await settingService.upsertGatewayConfigService(req.body);
      if (result.code === 200) {
        await writeAuditLog({
          action: 'setting.gateway.update',
          restaurant: null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'setting',
          targetId: (result as any)?.data?._id || null,
          summary: 'Cập nhật cấu hình cổng thanh toán hệ thống',
        });
      }
      res.status(result.code).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi lưu cấu hình cổng thanh toán' });
    }
  }

  /**
   * Gửi email thử từ trang cấu hình nền tảng (Chỉ Super Admin)
   */
  async sendTestEmail(req: AuthRequest, res: Response) {
    const { to } = req.body || {};
    try {
      const result = await settingService.sendTestEmailService(to);
      res.status(result.code).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi gửi email thử' });
    }
  }

  /**
   * Xác thực mã nhà bếp (Cổng vào màn hình KDS, không cần đăng nhập)
   */
  async verifyKitchenCode(req: Request, res: Response) {
    const { code } = req.body;
    try {
      const result = await settingService.verifyKitchenCodeService(code);
      res.status(result.code).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi xác thực mã nhà bếp' });
    }
  }

  /**
   * Tạo mã nhà bếp mới (Mã hiển thị đúng 1 lần, tạo mã mới sẽ vô hiệu hóa mã cũ)
   */
  async generateKitchenCode(req: AuthRequest, res: Response) {
    // Nhà hàng lấy từ ngữ cảnh tenant đã xác thực (không tin params.id)
    const restaurantId = req.tenantId;
    try {
      const result = await settingService.generateKitchenCodeService(restaurantId || '');
      if (result.code === 200) {
        await writeAuditLog({
          action: 'setting.kds-code.generate',
          restaurant: restaurantId || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'system',
          targetId: (result as any)?.data?._id || null,
          summary: 'Tạo mã nhà bếp mới',
        });
      }
      res.status(result.code).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi tạo mã nhà bếp' });
    }
  }
}

export default new SettingController();
