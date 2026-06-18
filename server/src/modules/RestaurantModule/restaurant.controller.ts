import type { Request, Response } from 'express';
import RestaurantSerice from './restaurant.service.js';

const restaurantService = new RestaurantSerice();
class RestaurantController {
  async createRestaurant(req: Request, res: Response) {
    const restaurantData = req.body;
    try {
      const result = await restaurantService.createRestaurantService(restaurantData);
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

  async deleteRestaurant(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const result = await restaurantService.deleteRestaurantService(id || '');
      res.status(result.code).json({ result });
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server khi xóa nhà hàng' });
    }
  }
}

export default new RestaurantController();
