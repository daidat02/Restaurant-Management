import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LayoutAdmin from './layouts/LayoutAdmin';
import LayoutSuperAdmin from './layouts/LayoutSuperAdmin';
import LayoutCustomer from './layouts/LayoutCustomer';
import Payment from './pages/Customer/payment';
import Auth from './pages/Auth/Auth';
import OwnerRegister from './pages/Auth/OwnerRegister';
import { useAuth } from './hooks/use-auth';
import { useEffect } from 'react';
import { socket } from './configs/socket.io';
import OrderManagerment from './pages/Admin/OrderPage/management-order';
import OrderDetail from './pages/Admin/OrderPage/order-detail';
import CustomerHomePage from './pages/Customer/home';
import MenuPage from './pages/Customer/menu';
import ProductDetailPage from './pages/Customer/product-detail';
import CartPage from './pages/Customer/cart';
import KitchenOrder from './pages/Admin/KdsPage/kitchen';
import { useSocket } from './hooks/use-socket';
import { useActiveRestaurantId } from './hooks/use-active-restaurant';
import { LoadingProvider } from './components/LoadingOverlay';
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
import OnboardingWizard from './pages/Admin/Onboarding/onboarding';
import Table from './pages/Admin/TablePage/table';
import Users from './pages/Admin/UserPage/users';
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
const ProtectedRoute = ({
  isAuthenticated,
  userRole,
  allowedRoles,
}: {
  isAuthenticated: boolean;
  userRole: string;
  allowedRoles: string[];
}) => {
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
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

const PublicRoute = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
  if (isAuthenticated) {
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
      {/* ---------------- PUBLIC ROUTES ---------------- */}

      <Route element={<CustomerRoute isAuthenticated={isAuthenticated} userRole={userRole} />}>
        <Route path="/" element={<LayoutCustomer />}>
          <Route index element={<CustomerHomePage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="product/:id" element={<ProductDetailPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="payment" element={<Payment />} />
          <Route path="reservation" element={<ReservationCustomerPage />} />
          <Route path="/scan-to-order" element={<CartPage />} />

          {/* KHU VỰC TÀI KHOẢN KHÁCH HÀNG */}
          <Route path="account" element={<AccountLayout />}>
            <Route index element={<Navigate to="profile" replace />} />
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

      {/* ---------------- GUEST ROUTES ---------------- */}
      {/* Nên bọc PublicRoute để người đã đăng nhập không vào được trang Login */}
      <Route element={<PublicRoute isAuthenticated={isAuthenticated} />}>
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/owner" element={<OwnerRegister />} />
      </Route>

      {/* ---------------- PROTECTED ROUTES: SUPER-ADMIN (Nền tảng) ---------------- */}
      <Route
        element={
          <ProtectedRoute
            isAuthenticated={isAuthenticated}
            userRole={userRole}
            allowedRoles={['super-admin']}
          />
        }
      >
        <Route path="/super-admin" element={<LayoutSuperAdmin />}>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="tenants" element={<SuperAdminTenants />} />
          <Route path="pricing" element={<SuperAdminPricing />} />
          <Route path="transactions" element={<SuperAdminTransactions />} />
          <Route path="audit" element={<SuperAdminAudit />} />
        </Route>
      </Route>

      {/* ---------------- PROTECTED ROUTES: ADMIN ---------------- */}
      <Route
        element={
          <ProtectedRoute
            isAuthenticated={isAuthenticated}
            userRole={userRole}
            allowedRoles={['admin']}
          />
        }
      >
        <Route path="/admin" element={<LayoutAdmin />}>
          <Route index element={<HomePage />} />
          <Route path="restaurants" element={<RestaurantsPage />} />
          <Route path="onboarding" element={<OnboardingWizard />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="customers" element={<Users />} />
          <Route path="products" element={<Product />} />
          <Route path="orders" element={<Order />} />
          <Route path="reports" element={<AnalyticsPage />} />
        </Route>
      </Route>

      {/* ---------------- PROTECTED ROUTES: MANAGER (Quản lý cấp cao) ---------------- */}
      <Route
        element={
          <ProtectedRoute
            isAuthenticated={isAuthenticated}
            userRole={userRole}
            allowedRoles={['manager']}
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

          {/* KHU VỰC DÙNG CHUNG VỚI STAFF (Manager vẫn có quyền thao tác) */}
          <Route path="tables" element={<Table />} />
          <Route path="orders" element={<Order />} />
          <Route path="orders/pos" element={<POS />} />
          <Route path="orders/management" element={<OrderManagerment />} />
          <Route path="orders/edit/:id" element={<OrderDetail />} />
        </Route>
      </Route>

      <Route
        element={
          <ProtectedRoute
            isAuthenticated={isAuthenticated}
            userRole={userRole}
            allowedRoles={['staff']}
          />
        }
      >
        <Route path="/staff" element={<LayoutAdmin />}>
          {/* Mẹo: Staff thường làm việc trực tiếp, nên cho trang chủ của Staff là trang POS hoặc Table luôn */}
          <Route index element={<Navigate to="orders/pos" replace />} />

          {/* KHU VỰC DÙNG CHUNG (Tái sử dụng component) */}
          <Route path="tables" element={<Table />} />
          <Route path="orders" element={<Order />} />
          <Route path="orders/pos" element={<POS />} />
          <Route path="orders/management" element={<OrderManagerment />} />
          <Route path="orders/edit/:id" element={<OrderDetail />} />
          <Route path="reservations" element={<ReservationPage />} />
        </Route>
      </Route>

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
