import { Schema, Types } from 'mongoose';
import { getIO } from '../../configs/socketsConfig.js';
import type { INotification } from '../../models/Schema/NotificationSchema.js';
import type {
  IPopulatedReservation,
  IReservation,
  IReservationDocument,
} from '../../models/Schema/ReservationSchema.js';
import type { IRestaurantDocument } from '../../models/Schema/RestaurantSchema.js';
import type { ITableDocument } from '../../models/Schema/TableSchema.js';
import type { ServiceResponse } from '../../shared/type.js';
import notificationService from '../Notification/notification.service.js';
import restaurantRepository from '../RestaurantModule/restaurant.repository.js';
import tabaleRepository from '../TableModule/table.repository.js';
import ReservationRepository from './reservation.repository.js';
import tableRepository from '../TableModule/table.repository.js';
import { generateId } from '../../configs/constants.js';

export interface ITableTimeSlot {
  _id: string; // Trả ra ID để Frontend làm key
  tableNumber: number;
  capacity: number;
  reservedTimes: Record<string, Partial<IReservation>>;
}

class ReservationService {
  async checkTableAvailable(
    time: string,
    date: Date | string,
    capacity: number,
    restaurantId?: string,
  ): Promise<ITableDocument[]> {
    const tableFilter: any = {
      capacity: { $gte: capacity },
    };

    if (restaurantId) {
      tableFilter.restaurant = restaurantId;
    }

    // 1. Lấy toàn bộ các bàn đạt đủ sức chứa
    const tables = await tabaleRepository.findTables(tableFilter);
    if (!tables || tables.length === 0) {
      return [];
    }

    // 2. Ép chuỗi ngày độc lập múi giờ (YYYY-MM-DD) để quét trọn vẹn 24h trong ngày đó
    const dateString =
      typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
    const startOfDay = new Date(`${dateString}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateString}T23:59:59.999Z`);

    // 3. Quy đổi thời gian đặt mục tiêu ra đơn vị MỘT SỐ PHÚT (để so sánh toán học chính xác)
    const [targetHours, targetMinutes] = time.split(':').map(Number);
    const targetTotalMinutes = (targetHours as number) * 60 + (targetMinutes as number); // Ví dụ: 19:00 -> 1140 phút

    // 4. Lấy tất cả các đơn đặt bàn trong NGÀY HÔM ĐÓ
    const filterQuery: any = {
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed', 'waiting'] },
    };

    if (restaurantId) {
      filterQuery.restaurant = restaurantId;
    }
    const activeReservations = await ReservationRepository.findReservations(filterQuery);

    // 5. Lọc danh sách ID các bàn bị trùng lịch trong khoảng +- 120 phút (2 tiếng)
    const occupiedTableIds = activeReservations
      .filter((r) => {
        if (!r.reservationTime) return false;

        // Quy đổi thời gian của đơn hiện tại trong DB ra số phút
        const [resHours, resMinutes] = r.reservationTime.split(':').map(Number);
        const resTotalMinutes = (resHours as number) * 60 + (resMinutes as number);

        // Tính khoảng cách thời gian tuyệt đối giữa 2 đơn
        const timeDiff = Math.abs(targetTotalMinutes - resTotalMinutes);

        // Nếu khoảng cách nhỏ hơn hoặc bằng 120 phút (2 tiếng) -> BÀN BỊ CHIẾM
        return timeDiff <= 120;
      })
      .map((r) => {
        const table = r.table as any;
        if (!table) return undefined;
        if (typeof table === 'string') return table;
        if (table._id) return table._id.toString();
        return table.toString();
      })
      .filter((id): id is string => !!id);

    // 6. Trả về các bàn không nằm trong danh sách bị chiếm
    const availableTables = tables.filter(
      (table) => !occupiedTableIds.includes(table._id.toString()),
    );

    console.log(
      `[Check bàn] Giờ đặt: ${time} | Tổng số bàn trống tìm thấy: ${availableTables.length}`,
    );
    return availableTables;
  }

  async getTableTimeSlotsService(
    restaurantId: string,
    date: Date,
  ): Promise<ServiceResponse<ITableTimeSlot[]>> {
    // 1. Lấy TẤT CẢ các bàn thuộc nhà hàng (Sửa lại chính tả tableRepository)
    const tables = await tableRepository.findTables({ restaurant: restaurantId });
    if (!tables || tables.length === 0) {
      return {
        code: 404,
        message: 'Không tìm thấy bàn nào cho nhà hàng này',
      };
    }
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0); // Ép về 00:00:00 giờ UTC
    // startOfDay.toISOString() -> "2026-06-04T00:00:00.000Z"

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // 3. Query các đơn đặt bàn nằm trong khoảng ngày đó và trạng thái hợp lệ
    const reservations = await ReservationRepository.findReservations({
      restaurant: restaurantId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      status: { $in: ['pending', 'confirmed', 'checked_in'] },
    });

    // 4. Duyệt qua TẤT CẢ các bàn để map khung giờ bị chiếm
    const timeSlots = tables.map((table) => {
      const tableReservations = reservations.filter((r) => {
        const tableId = r.table as any;
        if (!tableId) return false;
        if (typeof tableId === 'string') return tableId === table._id.toString();
        if (tableId._id) return tableId._id.toString() === table._id.toString();
        return tableId.toString() === table._id.toString();
      });

      // Gom hết các mốc giờ đã bị đặt (Ví dụ: ["11:00", "11:30", "18:00"])
      const slots = tableReservations.reduce(
        (acc: Record<string, Partial<IReservationDocument>>, r) => {
          const reservation = r as IReservationDocument;
          const slotKey = reservation.reservationTime; // Ví dụ: "12:00" hoặc "12:30"

          acc[slotKey] = {
            _id: reservation._id,
            status: reservation.status, // 'pending' | 'confirmed' | 'checked-in'
            customerInfo: {
              name: reservation.customerInfo?.name || 'Khách vãng lai',
              phoneNumber: reservation.customerInfo?.phoneNumber || '',
              email: reservation.customerInfo?.email || '',
              note: reservation.customerInfo?.note || '',
              side: reservation.customerInfo?.side || '',
            },
            reservationTime: reservation.reservationTime,
            partySize: reservation.partySize,
            notes: reservation.notes || '',
          };

          return acc;
        },
        {},
      );
      return {
        _id: table._id.toString(), // Trả ra ID để Frontend làm key
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        reservedTimes: slots, // Mảng các giờ đã bị chiếm
      };
    });

    return {
      code: 200,
      message: 'Lấy khung giờ đặt bàn theo ngày thành công',
      data: timeSlots,
    };
  }

  async getRestaurantHaveTablesEmptyService(
    time: string,
    date: Date,
    capacity: number,
    restaurantId?: string,
  ): Promise<ServiceResponse<IRestaurantDocument[]>> {
    const tablesEmpty = await this.checkTableAvailable(time, date, capacity, restaurantId);

    if (tablesEmpty.length === 0) {
      return {
        code: 200,
        message: 'Không tìm thấy bàn phù hợp',
        data: [],
      };
    }

    const uniqueRestaurantIds = Array.from(
      new Set(tablesEmpty.map((t) => t.restaurant?.toString()).filter((id): id is string => !!id)),
    );

    const restaurants = await restaurantRepository.findRestaurants({
      _id: { $in: uniqueRestaurantIds },
    });

    return {
      code: 200,
      message: `Tìm thấy ${restaurants.length} nhà hàng còn bàn trống.`,
      data: restaurants,
    };
  }

  async makeReservationService(
    reservationData: Partial<IReservation>,
    userId: string | undefined,
    date: Date,
    time: string,
    restaurantId: string,
  ): Promise<ServiceResponse<IReservation>> {
    const partySize = reservationData?.partySize ?? 2;
    const availableTables = await this.checkTableAvailable(time, date, partySize, restaurantId);

    if (availableTables.length === 0) {
      return {
        code: 400,
        message:
          'Hết bàn trống trong khung giờ này, vui lòng chọn khung giờ khác hoặc liên hệ nhà hàng để được hỗ trợ',
      };
    }

    const assignedTableId = availableTables[0];
    // 1. Phân tách giờ và phút từ string "HH:mm" (Ví dụ: "19:00")
    const [hours, minutes] = time.split(':').map(Number);

    // 2. Tạo mốc thời gian chuẩn (Kết hợp giữa Ngày đặt và Giờ đặt)
    const reservationDateTime = new Date(date);
    reservationDateTime.setHours(hours || 0, minutes || 0, 0, 0);

    // 3. Tính toán safe_check_time bằng cách lấy Giờ đặt trừ đi 30 phút
    const safeCheckTime = new Date(reservationDateTime.getTime() - 30 * 60 * 1000);
    const newReservation = await ReservationRepository.createReservation({
      ...reservationData,
      customer: userId as any,
      restaurant: restaurantId as any,
      table: assignedTableId as any,
      date: reservationDateTime,
      reservationTime: time,
      safe_check_time: safeCheckTime,
      status: 'pending',
    });
    const tagetRoom = `restaurant_${restaurantId}`;
    const newNoti: Partial<INotification> = {
      restaurant: new Types.ObjectId(restaurantId),
      type: 'new_reservation',
      message: `Có đơn đặt bàn mới từ ${reservationData?.customerInfo?.name || 'khách hàng'}`,
      data: newReservation,
    };
    await notificationService.createNewNotification(newNoti, tagetRoom);
    return { code: 201, message: 'Đặt bàn thành công', data: newReservation };
  }

  async createReservationByStaffService(
    reservationData: Partial<IReservation>,
  ): Promise<ServiceResponse<IReservation>> {
    const TableId = reservationData.table;

    const existingTable = await tabaleRepository.findTableById(TableId ? TableId.toString() : '');

    if (!existingTable) {
      return {
        code: 404,
        message: 'Không tìm thấy bàn',
      };
    }

    const targetDate = new Date(reservationData.date as Date);

    targetDate.setHours(0, 0, 0, 0);

    const dateISO = targetDate.toISOString();

    const [hours, minutes] = (reservationData.reservationTime as string).split(':').map(Number);
    const reservationDateTime = new Date(dateISO);
    reservationDateTime.setHours(hours || 0, minutes || 0, 0, 0);

    const safeCheckTime = new Date(reservationDateTime.getTime() - 30 * 60 * 1000);

    const existingReservation = await ReservationRepository.findReservations({
      restaurant: existingTable.restaurant,
      table: reservationData.table,
      date: dateISO,
      reservationTime: reservationData.reservationTime,
      status: { $in: ['pending', 'confirmed', 'checked-in'] },
    });
    if (existingReservation.length > 0) {
      return {
        code: 400,
        message: 'Bàn đã được đặt trong khung giờ này',
      };
    }
    const newReservation = await ReservationRepository.createReservation({
      ...reservationData,
      restaurant: existingTable.restaurant,
      status: 'confirmed',
      safe_check_time: safeCheckTime,
    });
    console.log(newReservation);
    return { code: 201, message: 'Tạo đơn đặt bàn thành công', data: newReservation };
  }

  async getReservationByIdService(id: string): Promise<ServiceResponse<IPopulatedReservation>> {
    const reservation = await ReservationRepository.findDetailReservation(id);

    if (!reservation) {
      return { code: 404, message: 'Không tìm thấy đơn đặt trước' };
    }

    return { code: 200, message: 'Lấy thông tin thành công', data: reservation };
  }

  async getReservationByUserService(id: string): Promise<ServiceResponse<IReservation[]>> {
    const reservations = await ReservationRepository.findReservations({ customer: id });

    if (!reservations || reservations.length === 0) {
      return { code: 404, message: 'Không tìm thấy thông tin đơn đặt trước của khách hàng này' };
    }

    return { code: 200, message: 'Lấy thông tin thành công', data: reservations };
  }

  async getReservationByRestaurantService(
    id: string,
    date?: string | Date,
    status?: string,
  ): Promise<ServiceResponse<IReservation[]>> {
    let dateString: string;

    if (typeof date === 'string') {
      dateString = date.slice(0, 10);
    } else if (date instanceof Date) {
      dateString = date.toISOString().slice(0, 10);
    } else {
      const today = new Date();
      dateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    const startOfDay = new Date(`${dateString}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateString}T23:59:59.999Z`);

    const filterQuery: any = { restaurant: id, date: { $gte: startOfDay, $lte: endOfDay } };

    if (status) {
      filterQuery.status = status;
    }

    console.log(status);
    const reservations = await ReservationRepository.findReservations(filterQuery);
    return { code: 200, message: 'Lấy thông tin thành công', data: reservations };
  }

  async updateReservationService(
    id: string,
    reservationData: Partial<IReservation>,
  ): Promise<ServiceResponse<IReservation>> {
    const updatedReservation = await ReservationRepository.updateReservation(id, reservationData);

    if (!updatedReservation) {
      return { code: 404, message: 'Không tìm thấy đơn đặt trước để cập nhật' };
    }

    return { code: 200, message: 'Cập nhật thông tin thành công', data: updatedReservation };
  }

  async updateStatusService(id: string, status: string): Promise<ServiceResponse<IReservation>> {
    const updatedReservation = await ReservationRepository.updateReservation(id, {
      status: status as any,
    });

    if (!updatedReservation) {
      return { code: 404, message: 'Không tìm thấy đơn đặt trước để thay đổi trạng thái' };
    }

    return { code: 200, message: 'Cập nhật trạng thái thành công', data: updatedReservation };
  }
}

export default new ReservationService();
