import axios from 'axios';
import { API_BASE_URL } from '@/constants';
import { getKdsSession } from '@/utils/kds-session';

// Axios instance riêng cho màn hình nhà bếp (KDS): gắn token bếp từ phiên cục bộ,
// tách biệt hoàn toàn khỏi axiosClient thường dùng token đăng nhập admin
const kdsClient = axios.create({
  baseURL: API_BASE_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// 1. REQUEST INTERCEPTOR: gắn token nhà bếp
kdsClient.interceptors.request.use(
  (config) => {
    const session = getKdsSession();
    if (session?.token && config.headers) {
      config.headers.Authorization = `Bearer ${session.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 2. RESPONSE INTERCEPTOR: unwrap response và format lỗi (KDS tự xử lý 401 để quay lại màn hình nhập mã)
kdsClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let errorMessage = 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      errorMessage = data?.message || error.message;
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

export default kdsClient;
