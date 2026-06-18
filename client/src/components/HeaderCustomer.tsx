import React, { useState } from 'react';
import {
  Search,
  ShoppingBag,
  Menu,
  X,
  User,
  LogOut,
  HomeIcon,
  Home,
  MapPin,
  Settings,
  History,
} from 'lucide-react'; // Thêm Settings, History
import logo from '@/assets/logo_nhamnhi.jpg';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { useAppSelector } from '@/hooks/redux-hook';
import { useDispatch } from 'react-redux';
import { logout } from '@/redux/slices/authSlice';
import { PopoverCustom } from '@/components/PopoverCusom'; // Import Popover vào Header

interface HeaderProps {
  openLoginModal: () => void;
  openSelectRestaurant: () => void;
}

export default function Header({ openLoginModal, openSelectRestaurant }: HeaderProps) {
  const { user, isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const { cartItems } = useAppSelector((state) => state.cart);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
    setIsMenuOpen(false);
  };

  return (
    <header className="w-full bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto h-20 flex items-center justify-between px-4 sm:px-8 md:px-16">
        {/* LEFT: LOGO */}
        <div
          onClick={() => navigate('/')}
          className="flex items-start select-none cursor-pointer flex-shrink-0 w-45 h-14 lg:w-auto lg:h-full overflow-hidden"
        >
          <img
            src={logo}
            alt="Logo"
            className="h-full w-full object-cover scale-110 lg:scale-120 lg:origin-center transition-transform"
          />
        </div>

        {/* NÚT ĐỔI CỬA HÀNG TRÊN DESKTOP */}
        <div>
          <button
            onClick={openSelectRestaurant}
            className="hidden md:flex items-center ml-4 gap-1.5 px-2 py-1 rounded-sm bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-100 transition-all text-[8px] font-bold max-w-[180px]"
          >
            <MapPin className="h-3 w-3 shrink-0 text-orange-500" />
            <span className="truncate">{'Chọn cơ sở'}</span>
          </button>
        </div>

        {/* CENTER & RIGHT: CHỨC NĂNG TRÊN DESKTOP */}
        <div className="hidden md:flex items-center gap-6 flex-1 justify-end">
          {/* Ô Tìm kiếm lớn trên Desktop */}
          <div className="relative w-72 lg:w-96">
            <input
              type="text"
              placeholder="Tìm món ăn hoặc danh mục bạn muốn..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-4 pr-10 text-sm text-gray-700 outline-none transition-all placeholder:text-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 bg-gray-50/50"
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Icon Giỏ hàng Desktop */}
          <button
            onClick={() => navigate('/cart')}
            className="relative p-2.5 text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all"
          >
            <ShoppingBag className="h-5 w-5 stroke-[2]" />
            {cartItems.length > 0 && (
              <span className="absolute top-1 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-in zoom-in duration-200">
                {cartItems.length}
              </span>
            )}
          </button>

          {/* KIỂM TRA USER TRÊN DESKTOP VỚI BOX ĐIỀU HƯỚNG */}
          {isAuthenticated && user ? (
            <PopoverCustom
              align="end"
              trigger={
                <div className="flex items-center gap-2 cursor-pointer border border-gray-100 rounded-xl p-1.5 pr-4 bg-gray-50 hover:bg-gray-100 transition-all select-none">
                  <div className="h-8 w-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold uppercase text-sm">
                    {user?.name ? user.name.charAt(0) : <User className="h-4 w-4" />}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-gray-700 max-w-[120px] truncate">
                      {user?.name || 'Tài khoản'}
                    </span>
                    <span className="text-[10px] text-gray-400">Thành viên</span>
                  </div>
                </div>
              }
            >
              {/* NỘI DUNG BOX ACTION KHI CLICK USER */}
              <div className="w-56 flex flex-col bg-white rounded-xl overflow-hidden">
                {/* Header nhỏ trong Box */}
                <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/30">
                  <p className="text-xs font-bold text-gray-800 truncate">{user?.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">
                    {user?.email || 'Thành viên thân thiết'}
                  </p>
                </div>

                {/* List Actions */}
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-500 rounded-lg transition-colors text-left"
                  >
                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                    Trang cá nhân
                  </button>
                  <button
                    onClick={() => navigate('/orders-history')} // Thay đổi route tương ứng của bạn
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-500 rounded-lg transition-colors text-left"
                  >
                    <History className="h-4 w-4 text-gray-400 shrink-0" />
                    Lịch sử đơn hàng
                  </button>
                  <button
                    onClick={() => navigate('/settings')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-500 rounded-lg transition-colors text-left"
                  >
                    <Settings className="h-4 w-4 text-gray-400 shrink-0" />
                    Cài đặt thông tin
                  </button>
                </div>

                {/* Nút đăng xuất ở dưới cùng */}
                <div className="p-1.5 border-t border-gray-50 bg-gray-50/20">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left"
                  >
                    <LogOut className="h-4 w-4 text-red-400 shrink-0" />
                    Đăng xuất
                  </button>
                </div>
              </div>
            </PopoverCustom>
          ) : (
            <button
              onClick={openLoginModal}
              className="rounded-xl bg-[#1a1a1a] px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-orange-500 shadow-sm active:scale-95"
            >
              Đăng Nhập
            </button>
          )}
        </div>

        {/* CỤM CHỨC NĂNG TRÊN MOBILE (ẨN TRÊN DESKTOP) */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`p-2.5 rounded-xl transition-all ${isSearchOpen ? 'bg-orange-50 text-orange-500' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            <Search className="h-5 w-5 stroke-[2]" />
          </button>

          <button
            onClick={() => navigate('/cart')}
            className="relative p-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
          >
            <ShoppingBag className="h-5 w-5 stroke-[2]" />
            {cartItems.length > 0 && (
              <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-in zoom-in duration-200">
                {cartItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
          >
            {isMenuOpen ? (
              <X className="h-5 w-5 stroke-[2]" />
            ) : (
              <Menu className="h-5 w-5 stroke-[2]" />
            )}
          </button>
        </div>
      </div>

      {/* DROPDOWN TÌM KIẾM NHANH TRÊN MOBILE */}
      {isSearchOpen && (
        <div className="md:hidden w-full px-4 pb-4 bg-white border-b border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="relative w-full">
            <input
              type="text"
              autoFocus
              placeholder="Tìm món ngon nhâm nhi..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-4 pr-10 text-sm text-gray-700 outline-none bg-gray-50"
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      )}

      {/* MOBILE MENU PANEL */}
      {isMenuOpen && (
        <div className="md:hidden w-full bg-white border-b border-gray-100 px-4 py-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-1">
            <a
              onClick={() => openSelectRestaurant()}
              className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-colors cursor-pointer"
            >
              Chọn Cơ Sở
            </a>
            <a
              href="#"
              className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-colors"
            >
              Trang chủ
            </a>
            <a
              href="#"
              className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-colors"
            >
              Thực đơn
            </a>
            <a
              href="#"
              className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-colors"
            >
              Liên hệ đặt bàn
            </a>
            {isAuthenticated && (
              <div
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/profile');
                }}
                className="block px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-orange-50 hover:text-orange-500 rounded-xl transition-colors cursor-pointer"
              >
                Trang cá nhân ({user?.name})
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 px-4">
            {isAuthenticated && user ? (
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-50 border border-red-200 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100"
              >
                <LogOut className="w-4 h-4" />
                <span>Đăng Xuất</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  openLoginModal();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] py-3 text-sm font-bold text-white transition-colors hover:bg-orange-500"
              >
                <User className="w-4 h-4" />
                <span>Đăng Nhập Tài Khoản</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
