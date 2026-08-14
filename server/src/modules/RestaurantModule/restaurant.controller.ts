import type { Request, Response } from 'express';
import RestaurantSerice from './restaurant.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import { writeAuditLog } from '../../services/auditLog.service.js';

const restaurantService = new RestaurantSerice();
class RestaurantController {
  async createRestaurant(req: AuthRequest, res: Response) {
    const restaurantData = req.body;
    try {
      const result = await restaurantService.createRestaurantService(
        restaurantData,
        req.user?.userId || undefined,
      );
      if (result.code === 201 || result.code === 200) {
        const newId = (result as any)?.result?._id || (result as any)?.data?._id || restaurantData?._id;
        const tx = (result as any)?.transaction;
        await writeAuditLog({
          action: 'restaurant.create',
          restaurant: String(newId || ''),
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'restaurant',
          targetId: newId || null,
          summary: `Tạo nhà hàng mới (${restaurantData?.name || ''})`,
        });
        if (tx) {
          await writeAuditLog({
            action: 'transaction.create',
            restaurant: String(newId || ''),
            actor: req.user?.userId || null,
            actorInfo: { name: req.user?.name, role: req.user?.role },
            targetType: 'restaurant',
            targetId: newId || null,
            summary: `Thanh toán mở nhà hàng (${tx.amount.toLocaleString('vi-VN')}đ)`,
            meta: { transactionId: tx.id, amount: tx.amount },
          });
        } else {
          await writeAuditLog({
            action: 'subscription.trial.started',
            restaurant: String(newId || ''),
            actor: req.user?.userId || null,
            actorInfo: { name: req.user?.name, role: req.user?.role },
            targetType: 'restaurant',
            targetId: newId || null,
            summary: `Bắt đầu dùng thử 30 ngày cho nhà hàng (${restaurantData?.name || ''})`,
          });
        }
      }
      res.status(result.code).json({ result });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server khi tạo nhà hàng' });
    }
  }

  async getRestaurantById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const result = await restaurantService.getRestaurantByIdService(id || '');
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server khi lấy nhà hàng' });
    }
  }

  async findAllRestaurants(req: Request, res: Response) {
    try {
      const result = await restaurantService.findAllRestaurantsService();
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server khi lấy danh sách nhà hàng' });
    }
  }

  /** Chỉ trả các nhà hàng thuộc chuỗi của admin/manager đang đăng nhập (theo restaurantIds). */
  async getMyRestaurants(req: AuthRequest, res: Response) {
    try {
      const result = await restaurantService.findMyRestaurantsService(req.user?.userId);
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server khi lấy danh sách nhà hàng của bạn' });
    }
  }

  async updateRestaurant(req: Request, res: Response) {
    const { id } = req.params;
    const restaurantData = req.body;
    try {
      const result = await restaurantService.updateRestaurantService(id || '', restaurantData);
      if (result.code === 200 && id) {
        const restaurantName = result.data?.name;
        await writeAuditLog({
          action: 'restaurant.update',
          restaurant: id,
          actor: (req as AuthRequest).user?.userId || null,
          actorInfo: { name: (req as AuthRequest).user?.name, role: (req as AuthRequest).user?.role },
          targetType: 'restaurant',
          targetId: id,
          summary: restaurantName
            ? `Cập nhật thông tin nhà hàng ${restaurantName}`
            : 'Cập nhật thông tin nhà hàng',
          meta: { fields: Object.keys(restaurantData || {}) },
        });
      }
      res.status(result.code).json({ result });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Lỗi server khi cập nhật nhà hàng' });
    }
  }

  async deleteRestaurant(req: AuthRequest, res: Response) {
    const { id } = req.params;
    try {
      const result = await restaurantService.deleteRestaurantService(id || '');
      if (result.code === 200) {
        await writeAuditLog({
          action: 'restaurant.delete',
          restaurant: id || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'restaurant',
          targetId: id || null,
          summary: 'Xóa nhà hàng',
        });
      }
      res.status(result.code).json({ result });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server khi xóa nhà hàng' });
    }
  }

  /**
   * Khoá/Mở nhà hàng (chỉ super-admin): cập nhật field `status` = 'active' | 'inactive'.
   */
  async updateRestaurantStatus(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { status } = req.body;
    try {
      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({ message: 'Trạng thái nhà hàng không hợp lệ!' });
      }
      const result = await restaurantService.updateRestaurantService(id || '', { status });
      if (result.code === 200) {
        const restaurantName = result.data?.name;
        await writeAuditLog({
          action: status === 'inactive' ? 'restaurant.lock' : 'restaurant.unlock',
          restaurant: id || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'restaurant',
          targetId: id || null,
          summary:
            status === 'inactive'
              ? restaurantName
                ? `Khoá nhà hàng ${restaurantName}`
                : 'Khoá nhà hàng'
              : restaurantName
                ? `Mở khoá nhà hàng ${restaurantName}`
                : 'Mở khoá nhà hàng',
          meta: { status },
        });
      }
      res.status(result.code).json(result);
    } catch (error) {
      console.error('Error updating restaurant status:', error);
      res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái nhà hàng' });
    }
  }
}

export default new RestaurantController();
