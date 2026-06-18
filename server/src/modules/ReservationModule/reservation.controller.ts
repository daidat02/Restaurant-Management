import type { Request, Response } from 'express';
import reservationService from './reservation.service.js';
import type { AuthRequest } from '../../middlewares/auth.middleware.js';
import type { IReservation } from '../../models/Schema/ReservationSchema.js';
import { generateId } from '../../configs/constants.js';

class ReservationControler {
  async createReservation(req: AuthRequest, res: Response) {
    const { date, restaurant, customerInfo, partySize, notes, reservationTime } = req.body;
    const reservationId = generateId();

    const reservationData = {
      reservationId,
      customerInfo: {
        name: customerInfo.name,
        email: customerInfo.email,
        phoneNumber: customerInfo.phoneNumber,
        note: customerInfo.note,
        side: customerInfo.side,
      },
      reservationTime: reservationTime,
      partySize: partySize,
      notes: notes,
    };
    const user = req.user?.userId;
    console.log(date, reservationTime, restaurant);
    try {
      const result = await reservationService.makeReservationService(
        reservationData,
        user || undefined,
        date ? new Date(date as string) : new Date(),
        (reservationTime as string) || '',
        (restaurant as string) || '',
      );
      res.status(result.code).json(result);
    } catch (error) {
      console.log(error);

      res.status(500).json({ message: 'Lỗi server khi đặt bàn' });
    }
  }

  async createReservationByStaff(req: Request, res: Response) {
    const { date, table, customerInfo, partySize, notes, reservationTime } = req.body;
    const reservationId = generateId();

    const reservationData: Partial<IReservation> = {
      reservationId,
      table,
      customerInfo: {
        name: customerInfo.name,
        phoneNumber: customerInfo.phoneNumber,
      },
      reservationTime: reservationTime,
      partySize: partySize,
      notes: notes,
      date: date,
    };
    try {
      const result = await reservationService.createReservationByStaffService(reservationData);
      res.status(result.code).json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Lỗi server khi tạo đặt bàn' });
    }
  }

  async getRestaurantHaveTablesEmpty(req: Request, res: Response) {
    const { date, time, capacity, restaurantId } = req.query || {};
    try {
      const result = await reservationService.getRestaurantHaveTablesEmptyService(
        time as string,
        new Date(date as string),
        Number(capacity as string),
        restaurantId ? (restaurantId as string) : undefined,
      );
      res.status(result.code).json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Lỗi server khi đặt bàn' });
    }
  }

  async getTableTimeSlots(req: Request, res: Response) {
    const { date, restaurantId } = req.query || {};
    try {
      const result = await reservationService.getTableTimeSlotsService(
        restaurantId as string,
        new Date(date as string),
      );
      res.status(result.code).json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Lỗi server khi đặt bàn' });
    }
  }

  async getReservationById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const result = await reservationService.getReservationByIdService(id || '');
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server ...' });
    }
  }

  async getReservationByUser(req: AuthRequest, res: Response) {
    const { id } = req.user?._id;
    try {
      const result = await reservationService.getReservationByUserService(id || '');
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server ...' });
    }
  }

  async getReservationByRestaurant(req: Request, res: Response) {
    const { id } = req.params;
    const { date, status } = req.query;
    console.log(status);
    try {
      const result = await reservationService.getReservationByRestaurantService(
        id || '',
        date as string,
        status as string,
      );
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server ...' });
    }
  }

  async updateReservation(req: Request, res: Response) {
    const { id } = req.params;
    const reservationData = req.body;
    try {
      const result = await reservationService.updateReservationService(id || '', reservationData);
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server ...' });
    }
  }

  async updateStatusReservation(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.query;
    try {
      const result = await reservationService.updateStatusService(id || '', status as string);
      res.status(result.code).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Lỗi server ...' });
    }
  }
}

export default new ReservationControler();
