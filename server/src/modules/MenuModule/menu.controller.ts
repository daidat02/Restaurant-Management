import type { Request, Response } from 'express';
import menuService from './menu.service.js';

class MenuController {
  async createMenuCat(req: Request, res: Response) {
    const menuCatData = req.body;
    try {
      const result = await menuService.createMenuCat(menuCatData);
      res.status(result.code).json(result);
    } catch (error) {
      console.error('Error in createMenuCat:', error);
      res.status(500).json({ message: 'Lỗi server khi tạo danh mục' });
    }
  }

  async updateMenuCat(req: Request, res: Response) {
    const menuCatData = req.body;
    const { id } = req.params;
    try {
      const result = await menuService.updateMenuCat(id || '', menuCatData);
      res.status(result.code).json(result);
    } catch (error) {
      console.error('Error in updateMenuCat:', error);
      res.status(500).json({ message: 'Lỗi server khi cập nhật danh mục' });
    }
  }

  async findAllMenuCat(req: Request, res: Response) {
    // Đã sửa: Lấy chính xác restaurantId từ params (ví dụ route: /categories/:restaurantId)
    const { restaurantId } = req.params;
    try {
      const result = await menuService.findAllMenuCat(restaurantId || '');
      res.status(result.code).json(result);
    } catch (error) {
      console.error('Error in findAllMenuCat:', error);
      res.status(500).json({ message: 'Lỗi server khi lấy danh mục' });
    }
  }

  // ==========================================
  // MENU ITEM CONTROLLER
  // ==========================================

  async createMenuItem(req: Request, res: Response) {
    const menuItemData = req.body;
    try {
      const result = await menuService.createMenuItem(menuItemData);
      res.status(result.code).json(result);
    } catch (error) {
      console.error('Error in createMenuItem:', error);
      res.status(500).json({ message: 'Lỗi server khi tạo món ăn' });
    }
  }

  async updateMenuItem(req: Request, res: Response) {
    const menuItemData = req.body;
    const { id } = req.params;
    try {
      const result = await menuService.updateMenuItem(id || '', menuItemData);
      res.status(result.code).json(result);
    } catch (error) {
      console.error('Error in updateMenuItem:', error);
      res.status(500).json({ message: 'Lỗi server khi cập nhật món ăn' });
    }
  }

  async updateAvailability(req: Request, res: Response) {
    const { id } = req.params;
    const { isAvailable } = req.body;
    try {
      const result = await menuService.updateAvailabilityService(id || '', isAvailable);
      res.status(result.code).json(result);
    } catch (error) {
      console.error('Error in updateAvailability:', error);
      res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái món ăn' });
    }
  }

  async getItemsByCategory(req: Request, res: Response) {
    const { catId } = req.params;
    try {
      const result = await menuService.getItemByMenucatService(catId || '');
      res.status(result.code).json(result);
    } catch (error) {
      console.error('Error in getItemsByCategory:', error);
      res.status(500).json({ message: 'Lỗi server khi lấy món ăn theo danh mục' });
    }
  }

  async getAllItems(req: Request, res: Response) {
    // Đã sửa: Lấy theo restaurantId từ params hoặc query thay vì biến catId bị nhầm trước đó
    const { restaurantId } = req.params;
    try {
      const result = await menuService.getAllItemService(restaurantId || '');
      res.status(result.code).json(result);
    } catch (error) {
      console.error('Error in getAllItems:', error);
      res.status(500).json({ message: 'Lỗi server khi lấy toàn bộ món ăn' });
    }
  }

  async getAvailableItems(req: Request, res: Response) {
    const { restaurantId } = req.params;
    try {
      const result = await menuService.getAvailableItemsService(restaurantId || '');
      res.status(result.code).json(result);
    } catch (error) {
      console.error('Error in getAvailableItems:', error);
      res.status(500).json({ message: 'Lỗi server khi lấy món ăn còn bán' });
    }
  }

  async getTopBestSellers(req: Request, res: Response) {
    // Đã sửa: Nhận restaurantId từ query hoặc params xuống để bọc gọn phạm vi cửa hàng
    const { restaurantId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

    try {
      const result = await menuService.getItemTopSaleService(restaurantId || '', limit);
      res.status(result.code).json(result);
    } catch (error) {
      console.error('Error in getTopBestSellers:', error);
      res.status(500).json({ message: 'Lỗi server khi lấy món ăn bán chạy' });
    }
  }

  async getItemById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const result = await menuService.getItemByIdService(id || '');
      res.status(result.code).json(result);
    } catch (error) {
      console.error('Error in getItemById:', error);
      res.status(500).json({ message: 'Lỗi server khi lấy thông tin món ăn' });
    }
  }
}

export default new MenuController();
