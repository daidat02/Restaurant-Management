import type { ApiResponse } from '@/types/api.type';
import type { IRestaurant } from '@/types/restaurant.type';
// Giả định bạn có file type dành riêng cho Reservation, nếu chưa có bạn có thể thay 'any' bằng interface cụ thể
import type { IReservation, ITableTimeSlot } from '@/types/reservation.type';
import axiosClient from '@/utils/configClient';

import { API_ENDPOINTS } from '@/constants/index';

// Destruct nhánh API Đặt bàn (Reservations) để code gọn gàng hơn
const { RESERVATIONS } = API_ENDPOINTS;

export const createReservation = async (reservationData: Partial<IReservation>) => {
  const res = await axiosClient.post<any, ApiResponse<IReservation>>(
    RESERVATIONS.CREATE,
    reservationData,
  );
  return res.data;
};

export const createReservationByStaff = async (reservationData: Partial<IReservation>) => {
  const res = await axiosClient.post<any, ApiResponse<IReservation>>(
    RESERVATIONS.CREATE_BY_STAFF,
    reservationData,
  );
  return res.data;
};

export const getRestaurantHaveTableEmpty = async (
  time: string,
  date: Date,
  capacity: number,
  restaurantId?: string,
) => {
  const res = await axiosClient.get<any, ApiResponse<IRestaurant[]>>(
    RESERVATIONS.GET_RESTAURANTS_EMPTY,
    {
      params: {
        time,
        date: date.toISOString(),
        capacity,
        restaurantId,
      },
    },
  );
  return res.data;
};

export const getTableTimeSlots = async (restaurantId: string, date: string) => {
  const res = await axiosClient.get<any, ApiResponse<ITableTimeSlot[]>>(
    RESERVATIONS.GET_TABLE_SLOTS,
    {
      params: {
        restaurantId,
        date: date,
      },
    },
  );
  return res.data;
};

export const getReservationByRestaurant = async (
  restaurantId: string,
  date?: string,
  status?: string,
) => {
  const res = await axiosClient.get<any, ApiResponse<IReservation[]>>(
    RESERVATIONS.RESTAURANT_ALL(restaurantId),
    {
      params: { date, status },
    },
  );
  return res.data;
};

export const getMyReservations = async () => {
  const res = await axiosClient.get<any, ApiResponse<IReservation[]>>(RESERVATIONS.MY_RESERVATIONS);
  return res.data;
};

export const getReservationById = async (reservationId: string) => {
  const res = await axiosClient.get<any, ApiResponse<IReservation>>(
    RESERVATIONS.GET_BY_ID(reservationId),
  );
  return res.data;
};

export const updateReservation = async (
  reservationId: string,
  updateData: Partial<IReservation>,
) => {
  const res = await axiosClient.put<any, ApiResponse<IReservation>>(
    RESERVATIONS.UPDATE(reservationId),
    updateData,
  );
  return res.data;
};

export const updateReservationStatus = async (reservationId: string, status: string) => {
  const res = await axiosClient.put<any, ApiResponse<IReservation>>(
    RESERVATIONS.UPDATE_STATUS(reservationId),
    { status },
  );
  return res.data;
};

export const cancelReservation = async (reservationId: string) => {
  const res = await axiosClient.put<any, ApiResponse<IReservation>>(
    RESERVATIONS.CANCEL(reservationId),
    { status: 'CANCELLED' },
  );
  return res.data;
};
