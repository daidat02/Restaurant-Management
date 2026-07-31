import SettingService from './setting.service.js';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';

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
   * Cập nhật thông tin chi tiết cấu hình (Form tổng lực)
   */
  async updateSetting(req: Request, res: Response) {
    const { id } = req.params;
    const settingData = req.body;
    console.log(settingData);
    try {
      const result = await settingService.updateSettingService(id || '', settingData);
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
        scope as 'admin' | 'restaurant',
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
  async updatePaymentMethodType(req: Request, res: Response) {
    const { id } = req.params;
    const { paymentMethodType, payload } = req.body;
    try {
      const result = await settingService.updatePaymentMethodTypeService(
        id || '',
        paymentMethodType,
        payload,
      );
      res.status(result.code).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi cập nhật phương thức thanh toán' });
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
      res.status(result.code).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi tạo mã nhà bếp' });
    }
  }
}

export default new SettingController();
