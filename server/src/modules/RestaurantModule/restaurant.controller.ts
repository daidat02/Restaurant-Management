import type { Request, Response } from 'express';
import RestaurantSerice from './restaurant.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import { writeAuditLog } from '../../services/auditLog.service.js';

const restaurantService = new RestaurantSerice();
class RestaurantController {
  async createRestaurant(req: AuthRequest, res: Response) {
    const restaurantData = req.body;
    try {
      const result = await restaurantService.createRestaurantService(restaurantData);
      if (result.code === 201 || result.code === 200) {
        const newId = (result as any)?.result?._id || (result as any)?.data?._id || restaurantData?._id;
        await writeAuditLog({
          action: 'restaurant.create',
          restaurant: String(newId || ''),
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'restaurant',
          targetId: newId || null,
          summary: `Tạo nhà hàng mới (${restaurantData?.name || ''})`,
        });
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

  async updateRestaurant(req: Request, res: Response) {
    const { id } = req.params;
    const restaurantData = req.body;
    try {
      const result = await restaurantService.updateRestaurantService(id || '', restaurantData);
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
          summary: `Xóa nhà hàng ${id}`,
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
        await writeAuditLog({
          action: status === 'inactive' ? 'restaurant.lock' : 'restaurant.unlock',
          restaurant: id || null,
          actor: req.user?.userId || null,
          actorInfo: { name: req.user?.name, role: req.user?.role },
          targetType: 'restaurant',
          targetId: id || null,
          summary: status === 'inactive' ? `Khoá nhà hàng ${id}` : `Mở khoá nhà hàng ${id}`,
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
