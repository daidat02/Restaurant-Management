import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import LayoutAdmin from './layouts/LayoutAdmin';
import LayoutBlank from './layouts/LayoutBlank';
import LayoutSuperAdmin from './layouts/LayoutSuperAdmin';
import LayoutCustomer from './layouts/LayoutCustomer';
import Payment from './pages/Customer/payment';
import { useAuth } from './hooks/use-auth';
import { useEffect } from 'react';
import { socket } from './configs/socket.io';
import OrderManagerment from './pages/Admin/OrderPage/management-order';
import OrderDetail from './pages/Admin/OrderPage/order-detail';
import LandingPage from './pages/Landing';
import LandingLayout from './pages/Landing/LandingLayout';
import PricingPage from './pages/Landing/Pricing';
import GuidePage from './pages/Landing/Guide';
import FaqPage from './pages/Landing/Faq';
import ContactPage from './pages/Landing/Contact';
import MenuPage from './pages/Customer/menu';
import ProductDetailPage from './pages/Customer/product-detail';
import CartPage from './pages/Customer/cart';
import KitchenOrder from './pages/Admin/KdsPage/kitchen';
import { useSocket } from './hooks/use-socket';
import { useActiveRestaurantId } from './hooks/use-active-restaurant';
import { LoadingProvider, useGlobalLoading } from './components/LoadingOverlay';
import ReservationCustomerPage from './pages/Customer/reservation';
import AccountLayout from './pages/Customer/account/account-layout';
import AccountProfile from './pages/Customer/account/profile';
import AccountOrders from './pages/Customer/account/orders';
import AccountSettings from './pages/Customer/account/settings';
import AnalyticsPage from './pages/Admin/AnalyticsPage/analytics';
import Product from './pages/Admin/ProductPage/product';
import Order from './pages/Admin/OrderPage/order';
import ProductsPage from './pages/Admin/ProductPage/product';
import HomePage from './pages/Admin/AnalyticsPage/home';
import ReservationPage from './pages/Admin/ReservationPage/reservation';
import POS from './pages/Admin/PosPage/pos';
import RestaurantsPage from './pages/Admin/RestaurantPage/restaurants';
import CreateRestaurantPage from './pages/Admin/RestaurantPage/create-restaurant';
import RestaurantDetailPage from './pages/Admin/RestaurantPage/restaurant-detail';
import MessagePage from './pages/Admin/Message/MessagePage';
import OnboardingWizard from './pages/Admin/Onboarding/onboarding';
import Table from './pages/Admin/TablePage/table';
import Users from './pages/Admin/UserPage/users';
import UserFormPage from './pages/Admin/UserPage/user-form';
import FormMenuItem from './pages/Admin/ProductPage/components/FormCreateItem';
import SuperAdminDashboard from './pages/SuperAdmin/Dashboard';
import SuperAdminTenants from './pages/SuperAdmin/Tenants';
import SuperAdminPricing from './pages/SuperAdmin/Pricing';
import SuperAdminTransactions from './pages/SuperAdmin/Transactions';
import SuperAdminAudit from './pages/SuperAdmin/Audit';
import { Toaster } from '@/components/ui/sonner';
import { useDispatch } from 'react-redux';
import { login, logout } from './redux/slices/authSlice';
import BillingPage from './pages/Admin/BillingPage/billing';
import LogsPage from './pages/Admin/LogsPage/logs';
import SettingsPage from './pages/Admin/SettingPage/SettingsPage';
import RequireFeature from './components/RequireFeature';
import type { IUser } from '@/types/user.type';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import LoginPage from './pages/Auth/Login';
import RegisterPage from './pages/Auth/Register';
import VerifyOtpPage from './pages/Auth/VerifyOtp';
import AuthLayout from './layouts/AuthLayout';
import TermsPage from './pages/Landing/Terms';
import PrivacyPage from './pages/Landing/Privacy';

/**
 * Kiểm tra admin có nhà hàng chưa (theo restaurantIds — nguồn chính thức của scope).
 * Dùng chung cho cả ProtectedRoute (chặn /admin/*) và OnboardingRoute.
 */
const adminHasNoRestaurant = (user: IUser | null | undefined): boolean => {
  if (user?.role !== 'admin') return false;
  return Array.isArray(user.restaurantIds) && user.restaurantIds.length === 0;
};

const ProtectedRoute = ({
  isAuthenticated,
  userRole,
  allowedRoles,
  user,
  requireRestaurant = false,
}: {
  isAuthenticated: boolean;
  userRole: string;
  allowedRoles: string[];
  user: IUser | null;
  /** Với admin: chặn vào trang admin khi chưa có nhà hàng → buộc về /onboarding. */
  requireRestaurant?: boolean;
}) => {
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requireRestaurant && adminHasNoRestaurant(user)) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    if (userRole === 'admin') return <Navigate to="/admin" replace />;
    if (userRole === 'manager') return <Navigate to="/manager" replace />;
    if (userRole === 'staff') return <Navigate to="/staff" replace />;
    if (userRole === 'super-admin') return <Navigate to="/super-admin" replace />;
    return <Navigate to="/" replace />;
  }

  // Không còn màn hình chọn nhà hàng: admin vào thẳng /admin (quản toàn chuỗi),
  // manager/staff tự ưu tiên restaurantIds[0] ngay sau login.
  return <Outlet />;
};

/** Route /onboarding: chỉ admin CHƯA có nhà hàng được vào; đã có → đưa về /admin. */
const OnboardingRoute = ({
  isAuthenticated,
  user,
  userRole,
}: {
  isAuthenticated: boolean;
  user: IUser | null;
  userRole: string;
}) => {
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  if (userRole !== 'admin') {
    if (userRole === 'manager') return <Navigate to="/manager" replace />;
    if (userRole === 'staff') return <Navigate to="/staff" replace />;
    if (userRole === 'super-admin') return <Navigate to="/super-admin" replace />;
    return <Navigate to="/" replace />;
  }
  if (!adminHasNoRestaurant(user)) {
    return <Navigate to="/admin" replace />;
  }
  return <Outlet />;
};

const CustomerRoute = ({
  isAuthenticated,
  userRole,
}: {
  isAuthenticated: boolean;
  userRole: string;
}) => {
  const dispatch = useDispatch();
  if (isAuthenticated && userRole !== 'customer') {
    dispatch(logout());
    return <></>;
  }

  return <Outlet />;
};

/** Thời gian hiển thị màn chuyển cảnh trước khi điều hướng về trang chủ theo role (ms). */
const GUEST_REDIRECT_DELAY_MS = 800;

const guestRedirectPath = (userRole: string) => {
  switch (userRole) {
    case 'super-admin':
      return '/super-admin';
    case 'admin':
      return '/admin';
    case 'manager':
      return '/manager';
    case 'staff':
      return '/staff';
    default:
      return '/';
  }
};

/**
 * Màn chuyển cảnh khi đã đăng nhập mà vào lại trang auth (vd: bấm "Đăng nhập" từ landing):
 * phủ LoadingOverlay lên trang auth trong một nhịp rồi hẳn điều hướng về trang chủ theo role,
 * tránh cảm giác "nhảy" thẳng vào app.
 * (admin chưa có nhà hàng vẫn được chuỗi ProtectedRoute đưa sang /onboarding)
 */
const GuestRedirectScreen = ({ userRole }: { userRole: string }) => {
  const { showLoading } = useGlobalLoading();
  const navigate = useNavigate();

  useEffect(() => {
    // Hiện overlay qua timeout (không gọi setState đồng bộ trong effect body).
    const showTimer = setTimeout(
      () => showLoading('Phiên đăng nhập còn hiệu lực, đang đưa bạn vào hệ thống...'),
      0,
    );
    const navTimer = setTimeout(() => {
      navigate(guestRedirectPath(userRole), { replace: true });
    }, GUEST_REDIRECT_DELAY_MS);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(navTimer);
    };
  }, [userRole, navigate, showLoading]);

  return null;
};

/**
 * Guard trang auth (login/register) — chỉ dành cho khách CHƯA đăng nhập.
 * Đã đăng nhập mà vào lại trang này thì giữ nguyên trang auth bên dưới, phủ overlay chuyển cảnh
 * một nhịp rồi mới điều hướng về trang chủ theo role (tránh cảm giác "nhảy" thẳng vào app
 * khi bấm Đăng nhập từ landing trong khi phiên đăng nhập vẫn còn hiệu lực).
 */
const GuestRoute = ({
  children,
  isAuthenticated,
  userRole,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
  userRole: string;
}) => {
  if (!isAuthenticated) return <>{children}</>;

  // Đã có phiên (user + refresh token còn hiệu lực) → chờ một nhịp cho tự nhiên rồi hẳn điều hướng.
  return (
    <LoadingProvider spinnerColor="text-cerulean-blue-600">
      <GuestRedirectScreen userRole={userRole} />
      {children}
    </LoadingProvider>
  );
};

export default function App() {
  const { isAuthenticated, user, token } = useAuth();
  const userRole = user?.role || '';
  const activeRestaurantId = useActiveRestaurantId();
  const { startListeningSocket } = useSocket(socket);
  useEffect(() => {
    // Khách chưa đăng nhập lấy nhà hàng từ URL (?restaurantId=...) — QR scan-to-order
    const resId = isAuthenticated
      ? activeRestaurantId
      : new URLSearchParams(window.location.search).get('restaurantId') || '';

    if (resId) {
      startListeningSocket(resId);
    }
  }, [user, activeRestaurantId]);

  return (
    <Routes>
      {/* ---------------- PUBLIC ROUTES (Landing nền tảng) ---------------- */}
      <Route element={<LandingLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/faq" element={<FaqPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      <Route element={<CustomerRoute isAuthenticated={isAuthenticated} userRole={userRole} />}>
        <Route element={<LayoutCustomer />}>
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/reservation" element={<ReservationCustomerPage />} />
          <Route path="/scan-to-order" element={<CartPage />} />

          {/* KHU VỰC TÀI KHOẢN KHÁCH HÀNG */}
          <Route path="/account" element={<AccountLayout />}>
            <Route index element={<Navigate to="/account/profile" replace />} />
            <Route path="profile" element={<AccountProfile />} />
            <Route path="orders" element={<AccountOrders />} />
            <Route path="settings" element={<AccountSettings />} />
          </Route>
          {/* Redirect các path cũ từ HeaderCustomer sang cấu trúc mới */}
          <Route path="/profile" element={<Navigate to="/account/profile" replace />} />
          <Route path="/orders-history" element={<Navigate to="/account/orders" replace />} />

          <Route path="/settings" element={<Navigate to="/account/settings" replace />} />
        </Route>
      </Route>

      {/* ---------------- PROTECTED ROUTES: SUPER-ADMIN (Nền tảng) ---------------- */}
      <Route
        element={
          <ProtectedRoute
            isAuthenticated={isAuthenticated}
            userRole={userRole}
            allowedRoles={['super-admin']}
            user={user}
          />
        }
      >
        <Route path="/super-admin" element={<LayoutSuperAdmin />}>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="tenants" element={<SuperAdminTenants />} />
          <Route path="pricing" element={<SuperAdminPricing />} />
          <Route path="transactions" element={<SuperAdminTransactions />} />
          <Route path="audit" element={<SuperAdminAudit />} />
          <Route path="messages" element={<MessagePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* ---------------- PROTECTED ROUTES: ADMIN ---------------- */}
      {/* Admin chưa có nhà hàng (restaurantIds rỗng) → không vào được /admin/*, buộc /onboarding */}
      <Route
        element={
          <ProtectedRoute
            isAuthenticated={isAuthenticated}
            userRole={userRole}
            allowedRoles={['admin']}
            user={user}
            requireRestaurant
          />
        }
      >
        <Route path="/admin" element={<LayoutAdmin />}>
          <Route index element={<HomePage />} />
          <Route path="restaurants" element={<RestaurantsPage />} />
          <Route path="restaurants/new" element={<CreateRestaurantPage />} />
          <Route path="restaurants/:id" element={<RestaurantDetailPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="customers" element={<Users />} />
          <Route path="customers/new" element={<UserFormPage />} />
          <Route path="customers/edit/:id" element={<UserFormPage />} />
          <Route path="products" element={<Product />} />
          <Route path="orders" element={<Order />} />
          <Route
            path="reports"
            element={
              <RequireFeature feature="advanced_report">
                <AnalyticsPage />
              </RequireFeature>
            }
          />
          <Route path="logs" element={<LogsPage />} />
          <Route
            path="messages"
            element={
              <RequireFeature feature="messaging_group">
                <MessagePage />
              </RequireFeature>
            }
          />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* ---------------- ONBOARDING (BLANK LAYOUT, dùng chung với landing tương lai) ---------------- */}
      <Route
        element={
          <OnboardingRoute isAuthenticated={isAuthenticated} user={user} userRole={userRole} />
        }
      >
        <Route path="/onboarding" element={<LayoutBlank />}>
          <Route index element={<OnboardingWizard />} />
        </Route>
      </Route>

      {/* ---------------- PROTECTED ROUTES: MANAGER (Quản lý cấp cao) ---------------- */}
      <Route
        element={
          <ProtectedRoute
            isAuthenticated={isAuthenticated}
            userRole={userRole}
            allowedRoles={['manager']}
            user={user}
          />
        }
      >
        <Route path="/manager" element={<LayoutAdmin />}>
          <Route index element={<HomePage />} />

          {/* KHU VỰC CHỈ DÀNH CHO MANAGER */}
          <Route path="menu/items" element={<ProductsPage />} />
          <Route path="menu/items/create" element={<FormMenuItem />} />
          <Route path="menu/items/edit/:id" element={<FormMenuItem />} />
          <Route path="reservations" element={<ReservationPage />} />
          <Route path="staff" element={<Users />} />
          <Route path="staff/new" element={<UserFormPage />} />
          <Route path="staff/edit/:id" element={<UserFormPage />} />

          {/* KHU VỰC DÙNG CHUNG VỚI STAFF (Manager vẫn có quyền thao tác) */}
          <Route path="tables" element={<Table />} />
          <Route path="orders" element={<Order />} />
          <Route path="orders/management" element={<OrderManagerment />} />
          <Route path="orders/edit/:id" element={<OrderDetail />} />
          <Route
            path="messages"
            element={
              <RequireFeature feature="messaging_group">
                <MessagePage />
              </RequireFeature>
            }
          />
          <Route path="logs" element={<LogsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* POS toàn màn hình (không sidebar/header admin) */}
        <Route element={<LayoutBlank />}>
          <Route path="/manager/orders/pos" element={<POS />} />
        </Route>
      </Route>

      <Route
        element={
          <ProtectedRoute
            isAuthenticated={isAuthenticated}
            userRole={userRole}
            allowedRoles={['staff']}
            user={user}
          />
        }
      >
        <Route path="/staff" element={<LayoutAdmin />}>
          {/* Staff vào thẳng trang Đơn, POS mở khi tạo đơn mới / chọn bàn */}
          <Route index element={<Navigate to="/staff/orders" replace />} />

          {/* KHU VỰC DÙNG CHUNG (Tái sử dụng component) */}
          <Route path="tables" element={<Table />} />
          <Route path="orders" element={<Order />} />
          <Route path="orders/management" element={<OrderManagerment />} />
          <Route path="orders/edit/:id" element={<OrderDetail />} />
          <Route path="reservations" element={<ReservationPage />} />
          <Route
            path="messages"
            element={
              <RequireFeature feature="messaging_group">
                <MessagePage />
              </RequireFeature>
            }
          />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* POS toàn màn hình (không sidebar/header admin) */}
        <Route element={<LayoutBlank />}>
          <Route path="/staff/orders/pos" element={<POS />} />
        </Route>
      </Route>

      {/* ---------------- TRANG AUTH (PUBLIC, LAYOUT CHIA ĐÔI THƯƠNG HIỆU) ---------------- */}
      <Route
        path="/login"
        element={
          <GuestRoute isAuthenticated={isAuthenticated} userRole={userRole}>
            <AuthLayout />
          </GuestRoute>
        }
      >
        <Route index element={<LoginPage />} />
      </Route>
      <Route
        path="/register"
        element={
          <GuestRoute isAuthenticated={isAuthenticated} userRole={userRole}>
            <AuthLayout />
          </GuestRoute>
        }
      >
        <Route index element={<RegisterPage />} />
      </Route>
      <Route path="/forgot-password" element={<AuthLayout />}>
        <Route index element={<ForgotPassword />} />
      </Route>
      <Route path="/verify-otp" element={<AuthLayout />}>
        <Route index element={<VerifyOtpPage />} />
      </Route>
      <Route path="/reset-password/:token" element={<AuthLayout />}>
        <Route index element={<ResetPassword />} />
      </Route>

      {/* ---------------- ĐIỀU KHOẢN / CHÍNH SÁCH (PUBLIC) ---------------- */}
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      {/* ---------------- KDS (MÀN HÌNH BẾP): STANDALONE, VÀO BẰNG MÃ NHÀ BẾP ---------------- */}
      {/* Không bọc ProtectedRoute vì không cần đăng nhập staff - bảo mật bằng mã nhà bếp */}
      <Route
        path="/kds"
        element={
          <LoadingProvider>
            <>
              <KitchenOrder />
              <Toaster />
            </>
          </LoadingProvider>
        }
      />
    </Routes>
  );
}
