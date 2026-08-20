import { useAppDispatch, useAppSelector } from './redux-hook'; // Hook của Redux ta đã tạo ở bước trước
import {
  loginUser,
  changePassword as changePasswordApi,
  registerOwner,
  registerUser,
  updateProfileMe,
  forgotPassword as forgotPasswordApi,
  forgotPasswordReset as forgotPasswordResetApi,
  verifyOtp as verifyOtpApi,
  resendOtp as resendOtpApi,
} from '@/api/auth.api'; // Đường dẫn tới file chứa hàm loginUser bạn vừa viết
import { logout, updateUserInfo } from '@/redux/slices/authSlice';
import type { IUser, RegisterCredentials } from '@/types/user.type';
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
  const { user, isAuthenticated, token, currentRestaurantId } = useAppSelector((state) => state.auth);

  // Hàm bọc logic xử lý đăng nhập
  const handleLogin = async (credentials: UserCredentials) => {
    const result = await loginUser(credentials, dispatch);
    return result; // Trả về kết quả { success, message, error } để component hiển thị thông báo
  };

  const handleRegister = async (credentials: RegisterCredentials) => {
    const result = await registerUser(credentials);
    return result;
  };

  const handleRegisterOwner = async (credentials: RegisterCredentials & { phone?: string }) => {
    // KHÔNG auto-login — đăng ký owner tạo user chưa xác thực email, phải nhập OTP (verifyOtp) xong mới đăng nhập.
    return registerOwner(credentials);
  };

  // Yêu cầu đặt lại mật khẩu (quên mật khẩu) — trả thông báo chung, không rò email tồn tại.
  const handleForgotPassword = async (email: string) => {
    return forgotPasswordApi(email);
  };

  // Đặt mật khẩu mới bằng token từ email.
  const handleForgotPasswordReset = async (token: string, newPassword: string) => {
    return forgotPasswordResetApi(token, newPassword);
  };

  // Xác thực mã OTP để hoàn tất đăng ký — thành công thì tự đăng nhập (dispatch login).
  const handleVerifyOtp = async (email: string, otp: string) => {
    return verifyOtpApi(email, otp, dispatch);
  };

  // Gửi lại mã OTP (cooldown 60s phía server).
  const handleResendOtp = async (email: string) => {
    return resendOtpApi(email);
  };

  // Cập nhật thông tin cá nhân (Settings → Tài khoản) rồi đồng bộ vào Redux
  const handleUpdateProfile = async (updateData: Partial<IUser>) => {
    const result = await updateProfileMe(updateData);
    if (result.success) {
      dispatch(updateUserInfo(result.user));
    }
    return result;
  };

  // Đổi mật khẩu (Settings → Tài khoản)
  const handleChangePassword = async (currentPassword: string, newPassword: string) => {
    return changePasswordApi(currentPassword, newPassword);
  };

  // Hàm bọc logic xử lý đăng xuất
  const handleLogout = () => {
    dispatch(logout());
    // Nếu bạn có dùng cookie hoặc cần xóa gì thêm thì viết ở đây
    navigate('/');
  };

  // Trả ra những dữ liệu và hàm cần thiết để các Component khác dùng
  return {
    user,
    isAuthenticated,
    token,
    currentRestaurantId,
    login: handleLogin,
    logout: handleLogout,
    register: handleRegister,
    registerOwner: handleRegisterOwner,
    forgotPassword: handleForgotPassword,
    forgotPasswordReset: handleForgotPasswordReset,
    verifyOtp: handleVerifyOtp,
    resendOtp: handleResendOtp,
    updateProfile: handleUpdateProfile,
    changePassword: handleChangePassword,
  };
};
