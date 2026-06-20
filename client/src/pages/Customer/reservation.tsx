import { DialogCustom } from '@/components/DialogCustom';
import { useRestaurant } from '@/hooks/use-restaurant';
import RestaurantCard from '@/layouts/RestaurantCard';
import { Search, MapPin, Users, Calendar, Clock, X } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import FormBooking from './components/form-booking';
import { generateTimeSlots } from '@/utils/helpers';

const MOCK_LOCATIONS = ['Hồ Chí Minh', 'Hà Nội', 'Nha Trang', 'Đà Nẵng', 'Hải Phòng', 'Bình Dương'];

export default function ReservationPage() {
  const { resHaveTableEmpty, restaurants, fetchRestaurantsHaveTableEmpty, fetchRestaurants } =
    useRestaurant();

  // States quản lý bộ lọc
  const [activeCity, setActiveCity] = useState<string>('Hồ Chí Minh');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [guestCount, setGuestCount] = useState<string>('2');
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState<string>('20:00');

  const [showResults, setShowResults] = useState<boolean>(false);
  const [openModalBooking, setOpenModalBooking] = useState<boolean>(false);
  const [selectedResData, setSelectedResData] = useState<any>(null);

  const restaurantConfig = {
    openHours: '15:00',
    closeHours: '22:00',
  };

  const TIME_SLOTS = useMemo(() => {
    return generateTimeSlots(restaurantConfig.openHours, restaurantConfig.closeHours);
  }, [restaurantConfig.openHours, restaurantConfig.closeHours]);

  useEffect(() => {
    fetchRestaurants();
  }, [activeCity]);

  const triggerSearchAPI = () => {
    const restaurantParam = selectedBranch === 'all' ? undefined : selectedBranch;
    fetchRestaurantsHaveTableEmpty(
      bookingTime,
      new Date(bookingDate),
      Number(guestCount),
      restaurantParam,
    );
    setShowResults(true);
  };

  const handleCityChange = (city: string) => {
    setActiveCity(city);
    setSelectedBranch('all');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSearchAPI();
  };

  // Mở modal đặt bàn và lưu thông tin chi nhánh được chọn
  const handleOpenBookingForm = (restaurant: any) => {
    setSelectedResData(restaurant);
    setOpenModalBooking(true);
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-24 pt-8">
      <FormBooking
        openModalBooking={openModalBooking}
        onChangeOpenModalBooking={(open) => setOpenModalBooking(open)}
        restaurant={selectedResData}
        bookingInfo={{ date: bookingDate, time: bookingTime, partySize: guestCount }}
      />

      {/* TOÀN BỘ GIAO DIỆN CHÍNH CỦA TRANG RESERVATION PAGE GIỮ NGUYÊN */}
      <div className="max-w-7xl mx-auto px-6 md:px-16">
        <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
            Đặt bàn trực tuyến
          </h1>
          <p className="text-sm text-gray-400">
            Đặt bàn tại các nhà hàng của chúng tôi tại thành phố{' '}
            <span className="underline decoration-2 underline-offset-4 font-bold text-orange-500">
              {activeCity}
            </span>
          </p>
        </div>

        {/* FORM PANEL TÌM KIẾM */}
        <form
          onSubmit={handleSearch}
          className="max-w-5xl mx-auto bg-white rounded-2xl md:rounded-lg border border-gray-200 shadow-sm overflow-hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-gray-100 gap-1 md:gap-0 mb-8"
        >
          <div className="flex flex-col justify-center items-start px-5 py-2 m-1 text-left">
            <span className="text-[11px] text-gray-600 uppercase tracking-wide">
              Chi nhánh {activeCity}
            </span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full text-xs font-bold text-orange-500 bg-transparent border-none focus:outline-none cursor-pointer mt-1"
            >
              <option value="all">Tất cả nhà hàng</option>
              {restaurants.map((res) => (
                <option key={res._id} value={res._id}>
                  {res.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-center items-start px-5 py-2 text-left">
            <span className="text-[11px] text-gray-600 uppercase tracking-wide">Người</span>
            <select
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              className="w-full text-xs font-bold text-orange-500 bg-transparent border-none focus:outline-none cursor-pointer mt-1"
            >
              <option value="1">1 Người</option>
              <option value="2">2 Người</option>
              <option value="3">3 Người</option>
              <option value="4">4 Người</option>
              <option value="5">5-6 Người</option>
              <option value="10">Tiệc lớn (10+)</option>
            </select>
          </div>

          <div className="flex flex-col justify-center items-start px-5 py-2 text-left">
            <span className="text-[11px] text-gray-600 uppercase tracking-wide">Ngày</span>
            <input
              type="date"
              value={bookingDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setBookingDate(e.target.value)}
              className="w-full text-xs font-bold text-orange-500 bg-transparent border-none focus:outline-none cursor-pointer mt-1"
            />
          </div>

          <div className="flex flex-col justify-center items-start px-5 py-2 text-left">
            <span className="text-[11px] text-gray-600 uppercase tracking-wide">Giờ</span>
            <select
              value={bookingTime}
              onChange={(e) => setBookingTime(e.target.value)}
              className="w-full text-xs font-bold text-orange-500 bg-transparent border-none focus:outline-none cursor-pointer mt-1"
            >
              {TIME_SLOTS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full h-full bg-orange-400 hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 py-3.5 md:py-0 transition-all duration-200 active:scale-95 shadow-sm"
          >
            <Search size={16} />
            Tìm bàn
          </button>
        </form>

        {/* BỘ LỌC ĐỊA ĐIỂM */}
        <div className="flex justify-center items-center gap-2 overflow-x-auto pb-4 mb-14 no-scrollbar">
          <span className="text-xs font-bold text-gray-600 mr-2 uppercase tracking-wide whitespace-nowrap">
            Chọn địa điểm:
          </span>
          {MOCK_LOCATIONS.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => handleCityChange(city)}
              className={`whitespace-nowrap px-5 py-2 rounded-lg text-xs font-bold tracking-wide border transition-all duration-200 active:scale-95 ${
                activeCity === city
                  ? 'bg-orange-50 border-orange-500 text-orange-500 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* KẾT QUẢ TÌM KIẾM */}
        {showResults && (
          <div className="max-w-4xl mx-auto animate-fade-in">
            <div className="text-center mb-10 space-y-1.5">
              <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight">
                Đã tìm thấy {resHaveTableEmpty.length} chi nhánh phù hợp còn bàn trống.
              </h2>
              <p className="text-xs text-gray-400 font-medium">
                Khung giờ đặt: <span className="font-bold text-gray-700">{bookingTime}</span>, ngày{' '}
                <span className="font-bold text-gray-700">
                  {bookingDate.split('-').reverse().join('/')}
                </span>
                , cho <span className="font-bold text-gray-700">{guestCount} khách</span>.
              </p>
              <p className="text-[11px] text-red-500 font-black uppercase tracking-wider pt-1 block">
                • Thời gian giữ bàn tối đa 15 phút •
              </p>
            </div>

            {resHaveTableEmpty.length > 0 ? (
              <div className="space-y-4">
                {resHaveTableEmpty.map((res: any) => (
                  <RestaurantCard
                    key={res._id}
                    restaurant={res}
                    onSelectRestaurant={() => handleOpenBookingForm(res)} // 👉 Bấm vào card sẽ kích hoạt Modal Form
                    rightAction={
                      <span className="text-xs md:text-sm font-black tracking-wider uppercase underline underline-offset-4 text-orange-400 group-hover:text-orange-600 transition-colors">
                        Đặt bàn ngay!
                      </span>
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
                <p className="text-gray-400 text-sm font-medium">
                  Rất tiếc, các chi nhánh tại khu vực này đã hết bàn trống vào khung giờ bạn chọn!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
