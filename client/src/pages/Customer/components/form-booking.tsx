import { DialogCustom } from '@/components/DialogCustom';
import { useReservation } from '@/hooks/use-reservation';
import type { IReservation } from '@/types/reservation.type';
import type { IRestaurant } from '@/types/restaurant.type';
import { extractId } from '@/utils/helpers';
import { Calendar, Clock, MapPin, Users, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

interface FormBookingProps {
  openModalBooking: boolean;
  onChangeOpenModalBooking: (open: boolean) => void;
  restaurant: IRestaurant;
  user?: string; // Thông tin user đăng nhập, để sau khi tích hợp auth sẽ gán vào
  bookingInfo: {
    date: string;
    time: string;
    partySize: string;
  };
}

const FormBooking = ({
  restaurant,
  bookingInfo,
  openModalBooking,
  onChangeOpenModalBooking,
  user,
}: FormBookingProps) => {
  const { addReservation } = useReservation();
  const navigate = useNavigate();

  // States quản lý Form chi tiết trong Modal
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [notifySms, setNotifySms] = useState<boolean>(true);

  // States tùy chọn nâng cao (Đề xuất nhà hàng)
  const [elderlyCount, setElderlyCount] = useState<string>('0');
  const [toddlerCount, setToddlerCount] = useState<string>('0');
  const [seatingArea, setSeatingArea] = useState<string>('Bên Ngoài'); // Mặc định 'Bên Ngoài' như ảnh
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  const [timeLeft, setTimeLeft] = useState<number>(240);

  // Xử lý đếm ngược khi Modal mở ra
  useEffect(() => {
    if (!openModalBooking) return;

    setTimeLeft(240); // Reset thời gian mỗi khi mở modal
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          alert('Hết thời gian giữ bàn! Vui lòng thực hiện lại thao tác tìm kiếm.');
          onChangeOpenModalBooking(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [openModalBooking]);

  const formatTimeCounter = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}s`;
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPayload: Partial<IReservation> = {
      restaurant: extractId(restaurant),
      date: new Date(bookingInfo.date),
      reservationTime: bookingInfo.time,
      partySize: Number(bookingInfo.partySize),
      customer: user || undefined,
      customerInfo: {
        name: `${lastName} ${firstName}`,
        email: email,
        phoneNumber: phone,
        note: notifySms
          ? 'Khách hàng muốn nhận thông báo qua SMS'
          : 'Khách hàng không muốn nhận thông báo qua SMS',
        side: seatingArea,
      },

      notes: additionalNotes,
    };

    console.log('Final Payload Booking:', fullPayload);
    await addReservation(fullPayload);
    navigate('/'); // Điều hướng về trang danh sách đặt bàn của khách hàng sau khi đặt thành công
    onChangeOpenModalBooking(false);
  };

  return (
    <DialogCustom
      open={openModalBooking}
      onOpenChange={() => onChangeOpenModalBooking(openModalBooking)}
      content={
        <div className="w-full max-w-4xl mx-auto overflow-y-auto max-h-[90vh] text-left p-1 text-gray-800 no-scrollbar">
          <div className="bg-orange-50/40 border border-orange-100 p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-orange-600 font-bold">
                <MapPin size={18} className="text-orange-500 shrink-0" />
                <span className="text-base">{restaurant?.name || 'NhamNhi Restaurant'}</span>
              </div>
              <p className="text-xs text-gray-500 pl-6">
                {restaurant?.address || 'Chưa cập nhật địa chỉ chi nhánh'}
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-semibold text-gray-600 pl-6 pt-1">
                <span className="flex items-center gap-1">
                  <Users size={14} className="text-orange-500" /> {bookingInfo.partySize} Người
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} className="text-orange-500" />{' '}
                  {bookingInfo.date.split('-').reverse().join('/')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} className="text-orange-500" /> {bookingInfo.time}
                </span>
              </div>
            </div>

            {/* Bộ đếm ngược đỏ rực giữ nguyên để tạo cảm giác hối thúc */}
            <div className="text-right self-end md:self-center">
              <p className="text-[11px] font-bold text-red-500 uppercase tracking-wide">
                Thời gian còn lại
              </p>
              <p className="text-2xl font-black text-red-500 tracking-tight mt-0.5">
                {formatTimeCounter(timeLeft)}
              </p>
            </div>
          </div>

          <h3 className="text-sm font-bold text-gray-700 mb-4">
            Xin vui lòng cung cấp thông tin liên lạc được dùng cho việc đặt bàn của quý khách:
          </h3>

          {/* FORM CHÍNH */}
          <form onSubmit={handleFinalSubmit} className="space-y-6">
            {/* THÀNH PHẦN 2: THÔNG TIN CÁ NHÂN */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-gray-700">
                  Tên <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 focus:bg-white pr-10 font-medium transition-all"
                  />
                  {firstName && (
                    <X
                      size={16}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      onClick={() => setFirstName('')}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-gray-700">
                  Họ <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 focus:bg-white pr-10 font-medium transition-all"
                  />
                  {lastName && (
                    <X
                      size={16}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      onClick={() => setLastName('')}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2 relative">
                <label className="text-xs font-bold text-gray-700">
                  Email <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 focus:bg-white pr-10 font-medium transition-all"
                  />
                  {email && (
                    <X
                      size={16}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      onClick={() => setEmail('')}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold text-gray-700">
                  Số điện thoại <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-3.5 text-xs font-bold border-r pr-2 border-gray-300 flex items-center gap-1 text-gray-600 select-none">
                    <span>🇻🇳</span> <span>+84</span>
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-16 pr-10 py-3 text-sm focus:outline-none focus:border-orange-500 focus:bg-white font-medium transition-all"
                    placeholder="Nhập số điện thoại"
                  />
                  {phone && (
                    <X
                      size={16}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      onClick={() => setPhone('')}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-6 md:pl-4">
                <input
                  type="checkbox"
                  id="smsNotify"
                  checked={notifySms}
                  onChange={(e) => setNotifySms(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded border-gray-300 cursor-pointer"
                />
                <label
                  htmlFor="smsNotify"
                  className="text-sm font-bold text-gray-700 cursor-pointer select-none hover:text-orange-600 transition-colors"
                >
                  Thông báo tôi qua tin nhắn?
                </label>
              </div>
            </div>

            {/* THÀNH PHẦN 3: ĐỀ XUẤT VỚI NHÀ HÀNG (YÊU CẦU NÂNG CAO) */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 space-y-5">
              {/* Chọn khu vực ngồi dạng Tab bám sát viền liền mạch */}
              <div className="space-x-3 ">
                <label className="text-xs font-semibold text-gray-600">
                  Khu vực ngồi (Không bắt buộc)
                </label>

                <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
                  {['Khu Vực Khác', 'Bên Trong', 'Bên Ngoài'].map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setSeatingArea(area)}
                      className={`px-5 py-2 text-xs font-bold border-r last:border-none border-gray-200 transition-all ${
                        seatingArea === area
                          ? 'bg-orange-500 text-white shadow-inner'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ghi chú thêm text-area */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">Ghi chú thêm</label>
                <textarea
                  rows={3}
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 resize-none font-medium transition-all"
                  placeholder="ví dụ như: tiệc tùng, kỷ niệm, sinh nhật, v.v"
                />
              </div>
            </div>

            {/* ĐIỀU KHOẢN VÀ NÚT ĐẶT BÀN FINAL CHỐT ĐƠN */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 text-center space-y-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500">
                Bằng việc bấm nút, tôi đồng ý với những{' '}
                <a
                  href="#"
                  className="text-orange-500 font-bold underline hover:text-orange-600 transition-colors"
                >
                  Điều kiện và điều khoản
                </a>
              </p>

              <button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm py-4 rounded-lg shadow-md shadow-orange-100 transition-all active:scale-[0.99] active:shadow-sm"
              >
                Đặt bàn ({formatTimeCounter(timeLeft)})
              </button>

              <button
                type="button"
                onClick={() => onChangeOpenModalBooking(false)}
                className="text-xs font-bold text-orange-500 underline block mx-auto hover:text-orange-600 transition-colors"
              >
                Chọn bàn khác
              </button>
            </div>
          </form>
        </div>
      }
      contentClass="!max-w-4xl max-h-screen w-[95vw] md:w-[800px] lg:w-[1200px] p-6"
    />
  );
};

export default FormBooking;
