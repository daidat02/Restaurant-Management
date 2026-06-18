import { formatVND } from '@/utils/helpers';
import { ArrowUpRight, Clock, DollarSign, Layers, TrendingUp, Users, Utensils } from 'lucide-react';

interface KpiCardProps {
  title: string; // Tiêu đề của từng card
  stat: number; // Số liệu hiển thị
  growth: number; // Tỷ lệ phần trăm tăng trưởng
  mainIcon: React.ReactNode;
  iconColor: string; // Màu chữ/icon (ví dụ: text-indigo-600)
  bgIconColor: string; // Màu nền bọc icon (ví dụ: bg-indigo-50)
  subIcon: React.ReactNode;
  isCurrency?: boolean; // Đánh dấu nếu số liệu là tiền tệ (để formatVND)
}

function KpiCard({
  title,
  stat,
  growth,
  mainIcon,
  iconColor,
  bgIconColor,
  subIcon,
  isCurrency = false,
}: KpiCardProps) {
  // Tự động chuyển màu chữ thông báo tăng trưởng dựa trên chỉ số âm hay dương
  const isPositive = (growth || 0) >= 0;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
      <div>
        {/* Đổi chữ text động theo prop title */}
        <span className="text-slate-400 font-medium text-xs uppercase tracking-wider block">
          {title}
        </span>
        <span className="text-2xl font-bold text-slate-900 block mt-1">
          {isCurrency ? formatVND(stat || 0) : `${stat || 0}`}
        </span>
        <span
          className={`text-xs font-semibold flex items-center gap-1 mt-2 ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}
        >
          {subIcon}
          {isPositive ? '+' : ''}
          {growth || 0}% <span className="text-slate-400 font-normal">so với kỳ trước</span>
        </span>
      </div>
      {/* Đổi màu background và màu icon linh hoạt */}
      <div className={`p-3.5 ${bgIconColor} ${iconColor} rounded-2xl`}>{mainIcon}</div>
    </div>
  );
}

// ====================================================================================
// COMPONENT 2: CÁC KHỐI SỐ LIỆU TỔNG QUAN (4 METRICS) -> CẤU HÌNH ĐỘNG TEXT VÀ MÀU SẮC
// ====================================================================================
interface IOverviewCardsProps {
  overviewStats: any;
}

export function OverviewCards({ overviewStats }: IOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Khối 1: Doanh thu tổng (Màu Indigo) */}
      <KpiCard
        title="Doanh Thu Tổng Kỳ Này"
        stat={overviewStats?.totalRevenue}
        growth={overviewStats?.growth?.revenue}
        isCurrency={true}
        mainIcon={<DollarSign size={24} />}
        iconColor="text-indigo-600"
        bgIconColor="bg-indigo-50"
        subIcon={
          <TrendingUp
            size={14}
            className={(overviewStats?.growth?.revenue || 0) < 0 ? 'rotate-180' : ''}
          />
        }
      />

      {/* Khối 2: Tổng số đơn hàng (Màu Emerald/Xanh lá) */}
      <KpiCard
        title="Tổng Số Đơn Hàng"
        stat={overviewStats?.totalOrders}
        growth={overviewStats?.growth?.orders}
        mainIcon={<Layers size={24} />}
        iconColor="text-emerald-600"
        bgIconColor="bg-emerald-50"
        subIcon={
          <ArrowUpRight
            size={14}
            className={(overviewStats?.growth?.orders || 0) < 0 ? 'rotate-180' : ''}
          />
        }
      />

      {/* Khối 3: Giá trị đơn trung bình (Màu Amber/Vàng cam) */}
      <KpiCard
        title="Trung Bình / Hóa Đơn"
        stat={overviewStats?.averagePerOrder}
        growth={overviewStats?.growth?.averagePerOrder}
        isCurrency={true}
        mainIcon={<Clock size={24} />}
        iconColor="text-amber-600"
        bgIconColor="bg-amber-50"
        subIcon={
          <ArrowUpRight
            size={14}
            className={(overviewStats?.growth?.averagePerOrder || 0) < 0 ? 'rotate-180' : ''}
          />
        }
      />

      {/* Khối 4: Tổng lượt đặt bàn (Màu Purple/Tím) */}
      <KpiCard
        title="Tổng Lượt Đặt Bàn"
        stat={overviewStats?.totalReservations}
        growth={overviewStats?.growth?.totalReservations} // Giả định trường dữ liệu từ API
        mainIcon={<Users size={24} />}
        iconColor="text-purple-600"
        bgIconColor="bg-purple-50"
        subIcon={
          <ArrowUpRight
            size={14}
            className={(overviewStats?.growth?.totalReservations || 0) < 0 ? 'rotate-180' : ''}
          />
        }
      />
    </div>
  );
}

export function TopDishesTable() {
  const MOCK_TOP_DISHES = [
    { name: 'Lẩu Thái Hải Sản VIP', category: 'Lẩu', quantity: 48, revenue: 18720000, trend: 'up' },
    {
      name: 'Bò Tơ Nướng Ống Tre',
      category: 'Món nướng',
      quantity: 36,
      revenue: 8280000,
      trend: 'up',
    },
    {
      name: 'Gỏi Củ Hủ Dừa Tôm Thịt',
      category: 'Khai vị',
      quantity: 29,
      revenue: 4350000,
      trend: 'down',
    },
    {
      name: 'Cá Chẽm Sốt Chanh Dây',
      category: 'Hải sản',
      quantity: 22,
      revenue: 7480000,
      trend: 'up',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Xếp hạng món ăn thịnh hành</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Dựa trên khối lượng bán ra và doanh thu tổng lẻ trong ngày
          </p>
        </div>
        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl flex items-center gap-1">
          <Utensils size={14} /> Cập nhật 5 phút trước
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200/60 text-slate-400 font-semibold text-xs uppercase tracking-wider">
              <th className="px-6 py-4">Tên Món Ăn</th>
              <th className="px-6 py-4">Danh Mục</th>
              <th className="px-6 py-4 text-center">Số lượng bán</th>
              <th className="px-6 py-4 text-right">Tổng Doanh Thu</th>
              <th className="px-6 py-4 text-center">Xu Hướng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {MOCK_TOP_DISHES.map((dish, i) => (
              <tr key={i} className="hover:bg-slate-50/40 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{dish.name}</td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-md">
                    {dish.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-center font-semibold text-slate-700">
                  {dish.quantity} suất
                </td>
                <td className="px-6 py-4 text-right font-bold text-indigo-600">
                  {formatVND(dish.revenue)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    {dish.trend === 'up' ? (
                      <span className="text-emerald-600 bg-emerald-50 text-xs px-2 py-0.5 rounded font-bold">
                        Tăng trưởng ▲
                      </span>
                    ) : (
                      <span className="text-rose-600 bg-rose-50 text-xs px-2 py-0.5 rounded font-bold">
                        Giảm nhiệt ▼
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
