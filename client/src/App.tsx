import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LayoutAdmin from './layouts/LayoutAdmin';
import LayoutCustomer from './layouts/LayoutCustomer';
import Payment from './pages/Customer/payment';
import Auth from './pages/Auth/Auth';
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
import { extractId } from './utils/helpers';
import { LoadingProvider } from './components/LoadingOverlay';
import ReservationCustomerPage from './pages/Customer/reservation';
import AnalyticsPage from './pages/Admin/AnalyticsPage/analytics';
import Product from './pages/Admin/ProductPage/product';
import Order from './pages/Admin/OrderPage/order';
import ProductsPage from './pages/Admin/ProductPage/product';
import HomePage from './pages/Admin/AnalyticsPage/home';
import ReservationPage from './pages/Admin/ReservationPage/reservation';
import POS from './pages/Admin/PosPage/pos';
import RestaurantsPage from './pages/Admin/RestaurantPage/restaurants';
import Table from './pages/Admin/TablePage/table';
import Users from './pages/Admin/UserPage/users';
import FormMenuItem from './pages/Admin/ProductPage/components/FormCreateItem';
import { useDispatch } from 'react-redux';
import { login, logout } from './redux/slices/authSlice';
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
    return <Navigate to="/" replace />;
  }

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
  const { startListeningSocket } = useSocket(socket);
  useEffect(() => {
    const resId = isAuthenticated ? extractId(user?.restaurant) : '69fccba996a14809070b9ef2';

    if (resId) {
      startListeningSocket(resId);
    }
  }, [user]);

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
        </Route>
      </Route>

      {/* ---------------- GUEST ROUTES ---------------- */}
      {/* Nên bọc PublicRoute để người đã đăng nhập không vào được trang Login */}
      <Route element={<PublicRoute isAuthenticated={isAuthenticated} />}>
        <Route path="/auth" element={<Auth />} />
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
          <Route path="kds" element={<KitchenOrder />} />
          <Route path="orders/management" element={<OrderManagerment />} />
          <Route path="orders/edit/:id" element={<OrderDetail />} />
          <Route path="reservations" element={<ReservationPage />} />
        </Route>
      </Route>

      <Route
        element={
          <ProtectedRoute
            isAuthenticated={isAuthenticated}
            userRole={userRole}
            allowedRoles={['staff', 'manager', 'admin']}
          />
        }
      >
        {/* Đường dẫn sẽ là phẳng hoàn toàn: http://localhost:3000/kds */}
        {/* Do KHÔNG CÓ thuộc tính element="Layout..." bọc ngoài, trang này sẽ trắng tinh khôi */}
        <Route
          path="/kds"
          element={
            <LoadingProvider>
              <KitchenOrder />
            </LoadingProvider>
          }
        />
      </Route>
    </Routes>
  );
}
