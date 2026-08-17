import axios from 'axios';
import { API_BASE_URL } from '@/constants';
// Import store và action từ Redux để lấy và cập nhật token
import { store } from '@/redux/store/store';
import { logout, refreshToken } from '@/redux/slices/authSlice';
import { openUpsell } from '@/redux/slices/upsellSlice';

const axiosClient = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
  withCredentials: true, // Cho phép gửi cookie (chứa refresh token) cùng với request
});

// ==========================================
// BIẾN TOÀN CỤC CHO REFRESH TOKEN
// ==========================================
let isRefreshing = false;
let failedQueue: any[] = []; // Hàng đợi chứa các request bị lỗi 401

// Hàm xử lý hàng đợi
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ==========================================
// 1. REQUEST INTERCEPTOR
// ==========================================
axiosClient.interceptors.request.use(
  (config) => {
    // LẤY TOKEN TỪ REDUX (Không dùng useAuth ở đây)
    const state = store.getState();
    const token = state.auth.token;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ==========================================
// 2. RESPONSE INTERCEPTOR
// ==========================================
axiosClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Xử lý riêng khi lỗi là 401 (Hết hạn Access Token)
    if (error.response?.status === 403 && !originalRequest._retry) {
      // Nếu API đang gọi chính là API refresh mà bị 401 -> Tránh lặp vô hạn
      if (originalRequest.url.includes('/auth/refresh')) {
        store.dispatch(logout());
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Nếu ĐANG trong quá trình refresh token, đưa request này vào hàng đợi chờ
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Đánh dấu request này đã được thử lại (tránh lặp vô hạn)
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        console.log('Refresh token thành công');

        // Lấy Access Token mới từ kết quả trả về
        const newAccessToken = res.data.data.accessToken;
        // Cập nhật token mới vào Redux
        // (Giả sử action login của bạn có thể dùng để update lại token, hoặc bạn viết 1 action setToken riêng)
        store.dispatch(refreshToken(newAccessToken));

        // Cho các request trong hàng đợi chạy tiếp với token mới
        processQueue(null, newAccessToken);

        // Cập nhật header cho request hiện tại và chạy lại nó
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        // Nếu refresh token cũng thất bại (hết hạn hoặc bị thu hồi)
        console.log('Refresh token thất bại', refreshError);
        processQueue(refreshError, null);
        store.dispatch(logout());
        window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        // Mở khoá cờ refresh
        isRefreshing = false;
      }
    }

    // ==========================================
    // XỬ LÝ CÁC LỖI KHÁC (403, 404, 500...)
    // ==========================================
    let errorMessage = 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      errorMessage = data?.message || error.message;

      // Admin chưa có nhà hàng gọi API admin → server trả NEEDS_ONBOARDING → đưa về /onboarding
      // (lớp phòng vệ; guard client ở route đã chặn trước đó).
      if (
        data?.errorCode === 'NEEDS_ONBOARDING' &&
        store.getState().auth.user?.role === 'admin' &&
        window.location.pathname !== '/onboarding'
      ) {
        window.location.href = '/onboarding';
      }

      // Nhà hàng bị khoá do hết hạn thanh toán → mở modal upsell (chỉ chủ admin) để trả phí mở lại
      if (
        (data?.errorCode === 'RESTAURANT_LOCKED' || data?.code === 'RESTAURANT_LOCKED') &&
        store.getState().auth.user?.role === 'admin'
      ) {
        store.dispatch(
          openUpsell({
            type: 'locked',
            restaurantId: data?.restaurantId || null,
            message: errorMessage,
          }),
        );
      }

      // Vượt giới hạn gói (bàn/món/NV hoặc tính năng) → mở upsell gói đề xuất (lưới cuối).
      // CHỈ cho request thao tác (POST/PUT/PATCH/DELETE); GET đọc dữ liệu (dashboard/analytics)
      // không được bật modal chặn trang.
      if (
        (data?.errorCode === 'PLAN_LIMIT_REACHED' || data?.code === 'PLAN_LIMIT_REACHED') &&
        store.getState().auth.user?.role === 'admin' &&
        (originalRequest.method || 'get').toLowerCase() !== 'get'
      ) {
        store.dispatch(
          openUpsell({
            type: 'plan-limit',
            restaurantId: data?.restaurantId || null,
            message: errorMessage,
            meta: data?.meta,
          }),
        );
      }

      return Promise.reject({
        success: false,
        message: errorMessage,
        status: error.response?.status,
        error: data,
      });
    }

    return Promise.reject({ success: false, message: errorMessage, error });
  },
);

export default axiosClient;
