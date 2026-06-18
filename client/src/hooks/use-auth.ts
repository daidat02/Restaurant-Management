import { useAppDispatch, useAppSelector } from './redux-hook'; // Hook của Redux ta đã tạo ở bước trước
import { loginUser, registerUser } from '@/api/auth.api'; // Đường dẫn tới file chứa hàm loginUser bạn vừa viết
import { logout } from '@/redux/slices/authSlice';
import type { RegisterCredentials } from '@/types/user.type';
import { useNavigate } from 'react-router-dom';

// Khai báo lại type nội bộ cho params (hoặc bạn có thể import UserCredentials từ file api sang)
type UserCredentials = {
  email: string;
  password: string;
};

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  // Lấy state từ Redux Store
  const { user, isAuthenticated, token } = useAppSelector((state) => state.auth);

  // Hàm bọc logic xử lý đăng nhập
  const handleLogin = async (credentials: UserCredentials) => {
    const result = await loginUser(credentials, dispatch);
    return result; // Trả về kết quả { success, message, error } để component hiển thị thông báo
  };

  const handleRegister = async (credentials: RegisterCredentials) => {
    const result = await registerUser(credentials);
    return result;
  };

  // Hàm bọc logic xử lý đăng xuất
  const handleLogout = () => {
    dispatch(logout());
    // Nếu bạn có dùng cookie hoặc cần xóa gì thêm thì viết ở đây
    navigate('/auth');
  };

  // Trả ra những dữ liệu và hàm cần thiết để các Component khác dùng
  return {
    user,
    isAuthenticated,
    token,
    login: handleLogin,
    logout: handleLogout,
    register: handleRegister,
  };
};
