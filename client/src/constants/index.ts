export const BASE_URL = import.meta.env.VITE_SERVER_BASE_URL;
// Đổi từ const sang export để các file khác (hoặc cấu hình axios) vẫn có thể dùng nếu cần
export const API_BASE_URL = `${BASE_URL}/api`;

export const API_ENDPOINTS = {
  // --- PHÂN HỆ AUTH & USER PROFILE ---
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    PROFILE_ME: `${API_BASE_URL}/auth/profile/me`,
    PROFILE_BY_ID: (id: string) => `${API_BASE_URL}/auth/profile/${id}`,
    ADMIN: {
      CUSTOMERS: `${API_BASE_URL}/auth/admin/customers`,
      STAFF: `${API_BASE_URL}/auth/`,
      DELETE: (id: string) => `${API_BASE_URL}/auth/admin/delete/${id}`,
      UPDATE: (id: string) => `${API_BASE_URL}/auth/admin/update/${id}`,
      UPDATE_ME: `${API_BASE_URL}/auth/admin/update/me`,
    },
  },

  // --- PHÂN HỆ THỰC ĐƠN (MENU SYSTEM) ---
  MENU: {
    // 1. Nhánh API dành riêng cho Danh mục món ăn (Category)
    CATEGORY: {
      CREATE: `${API_BASE_URL}/menu/category`,
      UPDATE: (id: string) => `${API_BASE_URL}/menu/category/${id}`,
      FIND_ALL: (restaurantId: string) => `${API_BASE_URL}/menu/category/${restaurantId}`,
    },

    // 2. Nhánh API dành riêng cho Món ăn chi tiết (Item)
    ITEM: {
      CREATE: `${API_BASE_URL}/menu/item`,
      UPDATE: (id: string) => `${API_BASE_URL}/menu/item/${id}`,
      UPDATE_AVAILABILITY: (id: string) => `${API_BASE_URL}/menu/item/${id}/availability`,
      GET_ALL: (restaurantId: string) => `${API_BASE_URL}/menu/items/${restaurantId}`,
      GET_BY_CATEGORY: (catId: string) => `${API_BASE_URL}/menu/item/category/${catId}`,
      GET_AVAILABLE: (restaurantId: string) =>
        `${API_BASE_URL}/menu/item/available/${restaurantId}`,
      GET_BESTSELLERS: (restaurantId: string) =>
        `${API_BASE_URL}/menu/items/bestsellers/${restaurantId}`,
      GET_BY_ID: (id: string) => `${API_BASE_URL}/menu/item/${id}`,
    },
  },

  // --- PHÂN HỆ THÔNG BÁO (NOTIFICATIONS) ---
  NOTIFICATIONS: {
    GET_MY: (restaurantId: string) => `${API_BASE_URL}/notifications/${restaurantId}`,
    MARK_READ: (id: string) => `${API_BASE_URL}/notifications/${id}/read`,
    MARK_READ_ALL: (restaurantId: string) =>
      `${API_BASE_URL}/notifications/read-all/${restaurantId}`,
  },

  // --- PHÂN HỆ ĐƠN HÀNG (ORDERS) ---
  ORDERS: {
    BASE: `${API_BASE_URL}/orders`,
    ADD_ITEM: `${API_BASE_URL}/orders/add-item`,
    UPDATE_ITEM: (itemId: string, status: string) =>
      `${API_BASE_URL}/orders/item/${itemId}/${status}`,
    GET_BY_ID: (id: string) => `${API_BASE_URL}/orders/${id}`,
    RESTAURANT_ALL: (restaurantId: string) => `${API_BASE_URL}/orders/restaurant/${restaurantId}`,
    RESTAURANT_STATUS: (restaurantId: string, status: string) =>
      `${API_BASE_URL}/orders/restaurant/${restaurantId}/${status}`,
    RESTAURANT_ACTIVE: (restaurantId: string) => `${API_BASE_URL}/orders/active/${restaurantId}`,
    UPDATE_STATUS: (id: string) => `${API_BASE_URL}/orders/${id}/status`,
    GET_BY_TABLE: (tableId: string) => `${API_BASE_URL}/orders/table/${tableId}`,
    MY_ORDERS: `${API_BASE_URL}/orders/my-orders`,
  },

  // --- PHÂN HỆ THANH TOÁN (PAYMENTS) ---
  PAYMENTS: {
    GET_BY_ID: (id: string) => `${API_BASE_URL}/payments/${id}`,
    INITIATE: `${API_BASE_URL}/payments/initiate`,
    UPDATE_METHOD: (id: string, method: string) =>
      `${API_BASE_URL}/payments/${id}/method/${method}`,
    UPDATE_STATUS: `${API_BASE_URL}/payments/status`,
    EWALLET: (orderId: string) => `${API_BASE_URL}/payments/ewallet/${orderId}`,
    RETURN_VNPAY: `${API_BASE_URL}/payments/return/vnpay`,
    CREATE_PAYOS: (orderId: string) => `${API_BASE_URL}/payments/banking/${orderId}`,
    CANCEL_PAYOS: (orderId: string) => `${API_BASE_URL}/payments/${orderId}/cancel`,
    CHECK_CONNECT: `${API_BASE_URL}/payments/check-connect`,
  },

  // --- PHÂN HỆ ĐẶT BÀN TRƯỚC (RESERVATIONS) ---
  RESERVATIONS: {
    CREATE: `${API_BASE_URL}/reservations/create`,
    CREATE_BY_STAFF: `${API_BASE_URL}/reservations/create-by-staff`,
    GET_RESTAURANTS_EMPTY: `${API_BASE_URL}/reservations/restaurants`,
    GET_TABLE_SLOTS: `${API_BASE_URL}/reservations/tables/slots`,
    RESTAURANT_ALL: (restaurantId: string) =>
      `${API_BASE_URL}/reservations/${restaurantId}/restaurant`,
    MY_RESERVATIONS: `${API_BASE_URL}/reservations/me`,
    GET_BY_ID: (id: string) => `${API_BASE_URL}/reservations/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/reservations/update/${id}`,
    UPDATE_STATUS: (id: string) => `${API_BASE_URL}/reservations/update-status/${id}`,
    CANCEL: (id: string) => `${API_BASE_URL}/reservations/cancel/${id}`,
  },

  // --- PHÂN HỆ NHÀ HÀNG (RESTAURANTS) ---
  RESTAURANTS: {
    BASE: `${API_BASE_URL}/restaurants`,
    GET_BY_ID: (id: string) => `${API_BASE_URL}/restaurants/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/restaurants/update/${id}`,
  },

  // --- PHÂN HỆ QUẢN LÝ BÀN (TABLES) ---
  TABLES: {
    CREATE: `${API_BASE_URL}/tables/create`,
    RESTAURANT_ALL: (restaurantId: string) => `${API_BASE_URL}/tables/restaurant/${restaurantId}`,
    GET_BY_ID: (id: string) => `${API_BASE_URL}/tables/${id}`,
    UPDATE_STATUS: (id: string) => `${API_BASE_URL}/tables/${id}/status`,
  },

  // --- PHÂN HỆ TẢI FILE (UPLOAD) ---
  UPLOAD: {
    SINGLE: `${API_BASE_URL}/upload`,
    MULTIPLE: `${API_BASE_URL}/upload/multiple`,
    DELETE: `${API_BASE_URL}/upload`,
  },

  ANALYTIC: {
    OVERVIEW: '/analytics/overview',
    REVENUE_HOURLY: '/analytics/revenue-hourly',
    ORDER_CHANNELS: '/analytics/order-channels',
    REVENUE_CHANNELS: '/analytics/revenue-channels',
  },
  SETTING: {
    CREATE: '/settings/create',
    GET_OR_CREATE: (scope: string, targetId: string) =>
      `/settings/get-or-create/${scope}/${targetId}`,
    BASE: (id: string) => `/settings/${id}`,
    UPDATE_PAYMENT: (id: string) => `/settings/${id}/payment-method`,
  },
};
