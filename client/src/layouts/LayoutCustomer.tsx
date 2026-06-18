import Header from '@/components/HeaderCustomer';
import Footer from '@/components/Footer';
import { LoadingProvider } from '@/components/LoadingOverlay';
import ScrollToTop from '@/components/ScrollTop';
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useSearchParams } from 'react-router-dom'; // Khai báo thêm useSearchParams
import { DialogCustom } from '@/components/DialogCustom';
import { LoginForm } from '@/pages/Auth/Components/SignInForm';
import { SignUpForm } from '@/pages/Auth/Components/SignUpForm';
import { useRestaurant } from '@/hooks/use-restaurant';
import { useAppDispatch, useAppSelector } from '@/hooks/redux-hook';
import { ChevronRight, MapPin, Store } from 'lucide-react';
import { selectRestaurant } from '@/redux/slices/restaurantSlice';
import RestaurantCard from './RestaurantCard';

// 1. TẠO MỘT COMPONENT NỘI BỘ CHỨA LOGIC CHÍNH
function LayoutCustomerContent() {
  const dispatch = useAppDispatch();
  const { restaurants, fetchRestaurants } = useRestaurant();
  const { restaurantSelected } = useAppSelector((state) => state.restaurant);

  const [openRestaurantsModal, setOpenRestaurantsModal] = useState<boolean>(false);
  const navigate = useNavigate();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any | null>();

  // --- 🛠️ KIỂM TRA XEM ĐANG LÀ LUỒNG QUÉT MÃ TẠI BÀN HAY KHÔNG ---
  const [searchParams] = useSearchParams();
  const isAtTable = !!searchParams.get('tableId'); // Trả về true nếu có tableId trên URL

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Chờ nhà hàng xác nhận...';
      case 'confirmed':
        return 'Nhà hàng đã nhận đơn';
      case 'cooking':
        return 'Món ăn đang được chế biến';
      case 'shipping':
        return 'Shipper đang giao hàng đến bạn';
      default:
        return 'Đang xử lý';
    }
  };

  // Bật lại useEffect chạy mượt mà không lo crash app
  useEffect(() => {
    fetchRestaurants();
    // CHỈ tự động hiện modal chọn cơ sở khi KHÔNG ở trạng thái quét mã tại bàn
    if (!restaurantSelected && !isAtTable) {
      setOpenRestaurantsModal(true);
    }
  }, [restaurantSelected, openRestaurantsModal, isAtTable]);

  return (
    <div className="flex min-h-screen flex-col w-full bg-gray-50/50 relative">
      <ScrollToTop />

      <DialogCustom
        open={openRestaurantsModal}
        onOpenChange={setOpenRestaurantsModal}
        closeOnInteractOutside={restaurantSelected ? true : false}
        contentClass="max-w-xl w-[95%] rounded-2xl p-0 overflow-hidden bg-white shadow-2xl animate-in fade-in-50 zoom-in-95 duration-200"
        content={
          <div className="flex flex-col max-h-[85vh]">
            {/* Header của Modal */}
            <div className="p-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white relative">
              <div className="flex items-center gap-3 mb-2">
                <Store className="w-6 h-6 animate-bounce" />
                <h3 className="text-xl font-bold tracking-tight">
                  Chào mừng bạn đến với hệ thống!
                </h3>
              </div>
              <p className="text-orange-100 text-sm">
                Vui lòng chọn cửa hàng gần bạn nhất để chúng tôi chuẩn bị thực đơn chính xác và giao
                hàng nhanh chóng.
              </p>
            </div>

            {/* Danh sách nhà hàng (Có scrollbar khi quá dài) */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3 max-h-[50vh] scrollbar-thin scrollbar-thumb-gray-200">
              {restaurants && restaurants.length > 0 ? (
                restaurants.map((res: any) => {
                  const isSelected = restaurantSelected === res._id;

                  return (
                    <RestaurantCard
                      key={res._id}
                      restaurant={res}
                      isSelected={isSelected}
                      onSelectRestaurant={(id) => {
                        dispatch(selectRestaurant(id));
                        setOpenRestaurantsModal(false);
                      }}
                    />
                  );
                })
              ) : (
                /* Trạng thái Loading hoặc Trống */
                <div className="py-12 text-center text-gray-400 space-y-2">
                  <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm font-medium">Đang tìm kiếm cửa hàng xung quanh...</p>
                </div>
              )}
            </div>

            {/* Footer của Modal */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-400 font-medium">
                Hotline hỗ trợ tổng đài chuỗi:{' '}
                <span className="text-orange-500 font-bold">1900 xxxx</span>
              </p>
            </div>
          </div>
        }
      />

      <DialogCustom
        open={isLoginModalOpen}
        onOpenChange={setIsLoginModalOpen}
        closeOnInteractOutside={true}
        content={
          <div>
            {isSignUp ? (
              <SignUpForm
                onSwitchToSignIn={() => setIsSignUp(false)}
                isLogoVisible={false}
                color="orange-500"
              />
            ) : (
              <LoginForm
                onSwitchToSignUp={() => setIsSignUp(true)}
                isLogoVisible={false}
                color="orange-500"
              />
            )}
          </div>
        }
        contentClass="max-w-md w-[95%] rounded-lg p-6 "
      />

      {/* 🛠️ CHỈ HIỂN THỊ HEADER KHI KHÔNG PHẢI LÀ GỌI MÓN TẠI BÀN */}
      {!isAtTable && (
        <Header
          openLoginModal={() => setIsLoginModalOpen(true)}
          openSelectRestaurant={() => setOpenRestaurantsModal(true)}
        />
      )}

      {/* Nếu không có header thì bỏ bớt khoảng trống trên để menu sát lề đẹp hơn */}
      <main className={`flex-1 w-full ${isAtTable ? 'pb-6' : 'pb-24'}`}>
        <Outlet context={{ openLoginModal: () => setIsLoginModalOpen(true), setActiveOrder }} />
      </main>

      {/* 🛠️ CHỈ HIỂN THỊ FOOTER KHI KHÔNG PHẢI LÀ GỌI MÓN TẠI BÀN */}
      {!isAtTable && <Footer />}

      {activeOrder && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-lg w-[90%] bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4 rounded-xl flex justify-between items-center shadow-2xl z-50 border border-orange-400/20 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div>
              <p className="font-bold text-sm tracking-wide">Bạn có đơn hàng đang xử lý!</p>
              <p className="text-xs text-orange-100 font-medium">
                {getStatusText(activeOrder.status)}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/order-detail/${activeOrder._id}`)}
            className="bg-white text-orange-600 px-4 py-2 rounded-lg text-xs font-bold shadow-lg hover:bg-orange-50 active:scale-95 transition-all duration-200"
          >
            Chi tiết đơn
          </button>
        </div>
      )}
    </div>
  );
}

// 2. COMPONENT CHÍNH CHỈ LÀM NHIỆM VỤ CUNG CẤP CONTEXT
export default function LayoutCustomer() {
  return (
    <LoadingProvider spinnerColor="text-orange-500">
      <LayoutCustomerContent />
    </LoadingProvider>
  );
}
