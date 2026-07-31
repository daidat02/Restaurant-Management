import TableService from './table.service.js';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';

const tableService = new TableService();

class TableController {
  async createTable(req: Request, res: Response) {
    const { tableData } = req.body;
    try {
      const result = await tableService.createTableService(tableData || '');
      res.status(result.code).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Lỗi server khi tạo bàn' });
    }
  }

  async getTableById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const result = await tableService.findTableByIdService(id || '');
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server khi lấy bàn' });
    }
  }
  async updateTable(req: Request, res: Response) {
    const { id } = req.params;
    const { tableData } = req.body;
    try {
      const result = await tableService.updateTableService(id || '', tableData);
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server khi cập nhật bàn' });
    }
  }
  async deleteTable(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const result = await tableService.deleteTableService(id || '');
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server khi xóa bàn' });
    }
  }
  async getTablesByRestaurant(req: AuthRequest, res: Response) {
    const restaurantId = req.tenantId;
    try {
      const result = await tableService.findTablesByRestaurantService(restaurantId || '');
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server khi lấy danh sách bàn' });
    }
  }

  async updateTableStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body;
    try {
      const result = await tableService.updateTableStatusService(id || '', status);
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái bàn' });
    }
  }
}

export default new TableController();
