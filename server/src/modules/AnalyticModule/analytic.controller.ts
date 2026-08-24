import analyticService from './analytic.service.js';
import type { Request, Response } from 'express';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';

class AnalyticController {
  /**
   * API Endpoint: GET /api/v1/analytics/overview
   * Lấy số liệu thống kê tổng quan kèm so sánh tăng trưởng với kỳ trước
   */
  async getOverviewStats(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { startDate, endDate } = req.query;
      const restaurantIds = req.user?.restaurantIds;
      // 1. Kiểm tra các tham số bắt buộc phải có
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu tham số bắt buộc: restaurantId, startDate, hoặc endDate.',
        });
      }

      // 2. Ép kiểu chuỗi (string) nhận từ query parameter thành đối tượng Date của JS
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // 3. Kiểm tra tính hợp lệ của định dạng ngày tháng đầu vào
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Định dạng ngày tháng không hợp lệ. Vui lòng sử dụng chuẩn ISO (YYYY-MM-DD).',
        });
      }

      // Đảm bảo ngày bắt đầu không lớn hơn ngày kết thúc
      if (start > end) {
        return res.status(400).json({
          success: false,
          message: 'Ngày bắt đầu (startDate) không thể lớn hơn ngày kết thúc (endDate).',
        });
      }

      // 4. Gọi tầng Service xử lý tính toán
      const data = await analyticService.getOverviewStats(start, end, restaurantIds as string[]);

      // 5. Trả kết quả thành công về cho Frontend
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      // 6. Xử lý lỗi hệ thống/máy chủ
      console.error('Error in AnalyticController.getOverviewStats:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi hệ thống khi tính toán thống kê phân tích.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /** GET /analytics/top-items?startDate&endDate&limit — top món bán chạy (Home, mọi gói). */
  async getTopItems(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { startDate, endDate } = req.query;
      const restaurantIds = req.user?.restaurantIds;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu tham số bắt buộc: startDate hoặc endDate.',
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Định dạng ngày tháng không hợp lệ (Chuẩn ISO: YYYY-MM-DD).',
        });
      }
      if (start > end) {
        return res.status(400).json({
          success: false,
          message: 'Ngày bắt đầu (startDate) không thể lớn hơn ngày kết thúc (endDate).',
        });
      }
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const limit = Number(req.query.limit) || 5;
      const data = await analyticService.getTopItems(
        start,
        end,
        restaurantIds as string[],
        limit,
      );

      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error in AnalyticController.getTopItems:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi hệ thống khi thống kê món bán chạy.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  async getRevenueHourly(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { startDate, endDate } = req.query;
      const restaurantIds = req.user?.restaurantIds;

      // 1. Kiểm tra tham số đầu vào bắt buộc
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu tham số bắt buộc: restaurantId, startDate, hoặc endDate.',
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      // 2. Validate định dạng ngày tháng đầu vào
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Định dạng ngày tháng không hợp lệ (Chuẩn ISO: YYYY-MM-DD).',
        });
      }

      // Nới rộng khung giờ để quét trọn vẹn từ đầu ngày start đến cuối ngày end
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      // 3. Gọi xuống tầng Service để lấy mảng dữ liệu đã điền đầy các khung giờ trống (amount = 0)
      const chartData = await analyticService.getRevenueByHour(restaurantIds as string[], start, end);

      // 4. Trả mảng dữ liệu sạch về cho Frontend nạp vào Component Chart
      return res.status(200).json({
        success: true,
        data: chartData,
      });
    } catch (error: any) {
      console.error('Error in AnalyticController.getRevenueHourly:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi hệ thống khi tính toán dòng doanh thu theo giờ.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
  async getOrderChannels(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { startDate, endDate } = req.query;
      const restaurantIds = req.user?.restaurantIds;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu tham số bắt buộc: restaurantId, startDate, hoặc endDate.',
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const data = await analyticService.getOrderChannelAnalytics(
        start,
        end,
        restaurantIds as string[],
      );

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Error in AnalyticController.getOrderChannels:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi hệ thống khi phân tích kênh đặt đơn.',
      });
    }
  }

  /** GET /analytics/channel-trend?startDate&endDate — doanh thu theo ngày × kênh (Advanced). */
  async getChannelTrend(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { startDate, endDate } = req.query;
      const restaurantIds = req.user?.restaurantIds;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu tham số bắt buộc: startDate hoặc endDate.',
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Định dạng ngày tháng không hợp lệ (Chuẩn ISO: YYYY-MM-DD).',
        });
      }
      if (start > end) {
        return res.status(400).json({
          success: false,
          message: 'Ngày bắt đầu (startDate) không thể lớn hơn ngày kết thúc (endDate).',
        });
      }
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const data = await analyticService.getChannelTrend(start, end, restaurantIds as string[]);

      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error in AnalyticController.getChannelTrend:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi hệ thống khi phân tích xu hướng kênh đặt đơn.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  /** GET /analytics/hour-matrix?startDate&endDate — ma trận thứ × giờ cho heatmap (Advanced). */
  async getHourMatrix(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { startDate, endDate } = req.query;
      const restaurantIds = req.user?.restaurantIds;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu tham số bắt buộc: startDate hoặc endDate.',
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Định dạng ngày tháng không hợp lệ (Chuẩn ISO: YYYY-MM-DD).',
        });
      }
      if (start > end) {
        return res.status(400).json({
          success: false,
          message: 'Ngày bắt đầu (startDate) không thể lớn hơn ngày kết thúc (endDate).',
        });
      }
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const data = await analyticService.getHourMatrix(start, end, restaurantIds as string[]);

      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error in AnalyticController.getHourMatrix:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi hệ thống khi tính ma trận giờ cao điểm.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }

  async getBranchRevenueStats(req: Request, res: Response): Promise<Response> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu tham số bắt buộc: restaurantId, startDate, hoặc endDate.',
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const data = await analyticService.getBranchRevenueStatsService(start, end);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi hệ thống khi phân tích doanh thu chi nhánh.',
      });
    }
  }

  /**
   * GET /analytics/revenue-branches — doanh thu từng chi nhánh của admin (chủ chuỗi).
   * Lọc theo restaurantIds (qua intersectRestaurantIds).
   */
  async getBranchRevenueByIds(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { startDate, endDate } = req.query;
      const restaurantIds = req.user?.restaurantIds;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu tham số bắt buộc: startDate, hoặc endDate.',
        });
      }

      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const data = await analyticService.getBranchRevenueByIdsService(
        start,
        end,
        restaurantIds as string[],
      );

      return res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error in AnalyticController.getBranchRevenueByIds:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi hệ thống khi phân tích doanh thu chi nhánh.',
      });
    }
  }

  /**
   * API Endpoint: GET /api/v1/analytics/system-overview
   * Dashboard gộp toàn hệ thống (chỉ super-admin).
   */
  async getSystemOverview(req: Request, res: Response): Promise<Response> {
    try {
      const data = await analyticService.getSystemOverviewService();
      return res.status(200).json({ success: true, data });
    } catch (error: any) {
      console.error('Error in AnalyticController.getSystemOverview:', error);
      return res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi hệ thống khi tính toán thống kê toàn hệ thống.',
      });
    }
  }
}

export default new AnalyticController();
