import DB_Connection from '../../models/DB_Connection.js';
import type { IPopulatedReservation, IReservation } from '../../models/Schema/ReservationSchema.js';
import type { ClientSession, FilterQuery } from 'mongoose';

class ReservationRepository {
  // ==========================================
  // I. CORE CRUD (Cơ bản cho Reservation)
  // ==========================================

  /**
   * Tạo mới một lượt đặt bàn
   */
  async createReservation(
    reservationData: Partial<IReservation>,
    options?: { session: ClientSession },
  ): Promise<IReservation> {
    const newReservation = new DB_Connection.Reservation({ ...reservationData });
    return await newReservation.save(options);
  }

  /**
   * Tìm nhanh một Reservation bằng ID (Không populate)
   */
  async findReservationById(id: string): Promise<IReservation | null> {
    return await DB_Connection.Reservation.findById(id).exec();
  }

  /**
   * Cập nhật thông tin đặt bàn hoặc trạng thái tùy chỉnh
   * Trả về dữ liệu mới sau khi update ngay lập tức thay vì save() lần 2 cồng kềnh
   */
  async updateReservation(
    id: string,
    reservationData: Partial<IReservation>,
    options?: { session?: ClientSession },
  ): Promise<IReservation | null> {
    return await DB_Connection.Reservation.findByIdAndUpdate(id, reservationData, {
      new: true,
      session: options?.session ?? null,
    })
      .populate('table')
      .exec();
  }

  // ==========================================
  // II. QUERIES ĐẶC THÙ (Business Logic)
  // ==========================================

  /**
   * Hàm Query tổng lực: Tìm kiếm danh sách Đặt Bàn linh hoạt theo bộ lọc (Filter)
   * Thay thế hoàn toàn cho các hàm cũ: findReservationsByUser, findReservationsByRestaurant, findAllReservations
   */
  async findReservations(filter: FilterQuery<IReservation>): Promise<IReservation[]> {
    return await DB_Connection.Reservation.find(filter)
      .populate([
        { path: 'restaurant', select: 'name address phone' },
        { path: 'table', select: 'tableNumber capacity status' },
        { path: 'customer', select: 'name email phone' },
      ])
      .sort({ date: -1, reservationTime: -1 }) // Ưu tiên sắp xếp theo thời gian đặt bàn mới nhất
      .exec();
  }

  /**
   * Lấy chi tiết đơn đặt bàn dạng Full Populate phục vụ hiển thị UI chi tiết
   */
  async findDetailReservation(id: string): Promise<IPopulatedReservation | null> {
    return await DB_Connection.Reservation.findById(id)
      .populate(['restaurant', 'table', 'customer'])
      .exec();
  }
}

export default new ReservationRepository();
