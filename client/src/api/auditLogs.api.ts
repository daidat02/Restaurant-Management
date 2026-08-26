import axiosClient from '@/utils/configClient';
import { type ApiResponse } from '@/types/api.type';
import { API_ENDPOINTS } from '@/constants/index';
import type { IAuditLog, ITransaction } from '@/types/superadmin.type';

const { AUDIT_LOG } = API_ENDPOINTS;

/** GET /api/audit-logs — audit hành động (admin/manager, server-side filter + phân trang). */
export const getAdminAuditLogs = async (params?: {
  /** Thu hẹp 1 chi nhánh thuộc chuỗi của chính user. */
  restaurantId?: string;
  action?: string;
  /** yyyy-MM-dd */
  startDate?: string;
  /** yyyy-MM-dd */
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const res = await axiosClient.get<IAuditLog[], ApiResponse<IAuditLog[]>>(AUDIT_LOG.LIST, {
    params,
  });
  return { data: res.data ?? [], total: res.total ?? 0 };
};

/** GET /api/audit-logs/payments — lịch sử thanh toán mọi chi nhánh của chủ (admin). */
export const getAdminPaymentLogs = async (params?: {
  /** Thu hẹp 1 chi nhánh thuộc chuỗi của chủ. */
  restaurantId?: string;
  /** yyyy-MM-dd */
  startDate?: string;
  /** yyyy-MM-dd */
  endDate?: string;
  page?: number;
  limit?: number;
}) => {
  const res = await axiosClient.get<ITransaction[], ApiResponse<ITransaction[]>>(
    AUDIT_LOG.PAYMENTS,
    { params },
  );
  return { data: res.data ?? [], total: res.total ?? 0 };
};
