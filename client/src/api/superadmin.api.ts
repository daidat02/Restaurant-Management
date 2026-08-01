import axiosClient from '@/utils/configClient';
import { type ApiResponse } from '@/types/api.type';
import { API_ENDPOINTS } from '@/constants/index';
import type {
  IAdminDashboard,
  IOwnerSummary,
  ITenantDetail,
  ITransaction,
  IPricingConfig,
  IAuditLog,
} from '@/types/superadmin.type';

const { SUPER_ADMIN, SUBSCRIPTION, AUDIT_LOG } = API_ENDPOINTS;

/** GET /api/admin/dashboard — KPI nền tảng + biểu đồ 6 tháng + sắp hết hạn. */
export const getAdminDashboard = async () => {
  const res = await axiosClient.get<any, ApiResponse<IAdminDashboard>>(SUPER_ADMIN.DASHBOARD);
  return res.data;
};

/** GET /api/admin/tenants — danh sách chủ (kèm tóm tắt). */
export const getAdminTenants = async () => {
  const res = await axiosClient.get<any, ApiResponse<IOwnerSummary[]>>(SUPER_ADMIN.TENANTS);
  return res.data;
};

/** GET /api/admin/tenants?id= — chi tiết 1 chủ (nhà hàng + giao dịch). */
export const getAdminTenantDetail = async (id: string) => {
  const res = await axiosClient.get<any, ApiResponse<ITenantDetail>>(SUPER_ADMIN.TENANTS, {
    params: { id },
  });
  return res.data;
};

/** GET /api/admin/transactions — lịch sử giao dịch + filter. */
export const getAdminTransactions = async (params?: {
  ownerId?: string;
  restaurantId?: string;
  from?: string;
  to?: string;
}) => {
  const res = await axiosClient.get<any, ApiResponse<ITransaction[]>>(SUPER_ADMIN.TRANSACTIONS, {
    params,
  });
  return res.data;
};

/** PATCH /api/admin/users/:id/block — khoá/mở chủ. */
export const blockAdminUser = async (id: string, blocked: boolean) => {
  const res = await axiosClient.patch<any, ApiResponse<{ ownerId: string; blocked: boolean }>>(
    SUPER_ADMIN.BLOCK(id),
    { blocked },
  );
  return res.data;
};

/** GET /api/pricing — đọc cấu hình giá chu kỳ. */
export const getPricingConfig = async () => {
  const res = await axiosClient.get<any, ApiResponse<IPricingConfig>>(SUBSCRIPTION.PRICING);
  return res.data;
};

/** PUT /api/admin/pricing — super-admin chỉnh giá chu kỳ. */
export const updatePricingConfig = async (cycles: Record<string, number>) => {
  const res = await axiosClient.put<any, ApiResponse<IPricingConfig>>(SUBSCRIPTION.PRICING_ADMIN, {
    cycles,
  });
  return res.data;
};

/** GET /api/audit-logs — danh sách audit log + phân trang. */
export const getAuditLogs = async (params?: {
  restaurantId?: string;
  page?: number;
  limit?: number;
}) => {
  const res = await axiosClient.get<any, ApiResponse<IAuditLog[]>>(AUDIT_LOG.LIST, { params });
  return { data: res.data, total: res.total ?? res.data?.length ?? 0 };
};
