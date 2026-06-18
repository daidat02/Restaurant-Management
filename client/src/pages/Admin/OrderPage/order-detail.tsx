import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrder } from '@/hooks/use-order';
import { Button } from '@/components/ui/button';
import {
  Printer,
  RotateCcw,
  ChevronDown,
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { StatusTag } from '@/components/StatusTag';
import type { IOrderItem, IOrder } from '@/types/order.type';
import { DataTable, type ColumnDef } from '@/components/TableData';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // --- THÊM changeOrderStatus VÀ updateOrder VÀO ĐÂY ---
  const { currentOrder, fetchOrderById, isLoading, changeOrderStatus } = useOrder();

  useEffect(() => {
    if (id) {
      fetchOrderById(id);
    }
  }, [id, fetchOrderById]);

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-full text-gray-500">
        Đang tải dữ liệu...
      </div>
    );
  }

  if (!currentOrder) {
    return <div className="p-6 text-center text-gray-500">Không tìm thấy đơn hàng!</div>;
  }

  const subtotal =
    currentOrder.items?.reduce((acc, item) => {
      const toppingTotal = item.toppings?.reduce((tAcc, top) => tAcc + top.price, 0) || 0;
      return acc + (item.priceSnapshot + toppingTotal) * item.quantity;
    }, 0) || 0;

  const itemColumns: ColumnDef<IOrderItem>[] = [
    {
      header: 'TÊN MÓN',
      render: (item: IOrderItem) => (
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">{item.nameSnapshot}</span>
        </div>
      ),
    },
    {
      header: 'SL',
      render: (item: IOrderItem) => (
        <span className="font-medium text-gray-900">{item.quantity}</span>
      ),
    },
    {
      header: 'ĐƠN GIÁ',
      render: (item: IOrderItem) => (
        <span className="text-gray-600 text-sm">
          {item.priceSnapshot.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      header: 'TỔNG',
      render: (item: IOrderItem) => {
        const itemToppingTotal = item.toppings?.reduce((acc, top) => acc + top.price, 0) || 0;
        const itemFinalPrice = (item.priceSnapshot + itemToppingTotal) * item.quantity;
        return (
          <span className="font-semibold text-gray-900">
            {itemFinalPrice.toLocaleString('vi-VN')} đ
          </span>
        );
      },
    },
    {
      header: 'TRẠNG THÁI',
      className: 'text-right',
      render: (item: IOrderItem) => {
        return <StatusTag status={item?.status || 'pending'} />;
      },
    },
  ];

  return (
    <div className="p-2 h-full flex flex-col min-h-0 bg-gray-50/50">
      {/* HEADER GIỮ NGUYÊN */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Đơn hàng #{currentOrder?.orderId}</h1>
          </div>
          <div className="text-sm text-gray-500 flex items-center gap-2 ml-10">
            <span>
              Ngày tạo:{' '}
              {currentOrder.createdAt
                ? new Date(currentOrder.createdAt).toLocaleString('vi-VN')
                : 'N/A'}
            </span>
            <span>•</span>
            <span className="text-cerulean-blue-600 font-medium">
              {currentOrder.orderType === 'dine-in'
                ? 'Tại bàn'
                : currentOrder.orderType === 'delivery'
                  ? 'Giao hàng'
                  : 'Mang đi'}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="text-gray-700 bg-white">
            <Printer className="mr-2 h-4 w-4" /> In Bill
          </Button>
          <Button
            variant="outline"
            className="text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100"
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Hoàn tiền
          </Button>
          <Button variant="outline" className="text-gray-700 bg-white">
            Thao tác khác <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 pb-6">
        <div className="col-span-2 flex flex-col gap-6">
          {/* BẢNG MÓN GIỮ NGUYÊN */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <DataTable
              columns={itemColumns}
              data={currentOrder.items || []}
              getRowKey={(item) => item._id as string}
              isLoading={isLoading}
            />
          </div>

          {/* THÔNG TIN GIAO HÀNG GIỮ NGUYÊN */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {currentOrder.orderType === 'delivery' ? (
              <>
                <div>
                  <h3 className="font-bold text-gray-900 mb-4 text-lg">Thông tin giao hàng</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex gap-3">
                      <User className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-gray-500 font-medium">Người nhận</p>
                        <p className="text-gray-900">{currentOrder.deliveryInfo?.name || '---'}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Phone className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-gray-500 font-medium">Số điện thoại</p>
                        <p className="text-blue-600 font-medium">
                          {currentOrder.deliveryInfo?.phone || '---'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <MapPin className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-gray-500 font-medium">Địa chỉ nhận hàng</p>
                        <p className="text-gray-900 leading-relaxed">
                          {currentOrder.deliveryInfo?.address || '---'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-4 text-lg">Chi tiết khác</h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-gray-500 font-medium mb-1">Ghi chú của khách</p>
                      <p className="text-gray-900 bg-amber-50 p-3 rounded-lg border border-amber-100 italic leading-relaxed">
                        {currentOrder.deliveryInfo?.note ||
                          currentOrder.notes ||
                          'Không có ghi chú của khách'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="font-bold text-gray-900 mb-4 text-lg">Chi tiết phục vụ</h3>
                  <div className="space-y-4 text-sm">
                    <div className="flex gap-3">
                      <MapPin className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-gray-500 font-medium">Khu vực / Bàn</p>
                        <p className="text-gray-900 font-semibold text-lg">
                          Bàn: {(currentOrder.table as any)?.tableNumber || 'Chưa xếp bàn'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Clock className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-gray-500 font-medium">Thời gian phục vụ</p>
                        <p className="text-gray-900">
                          {currentOrder.servedAt
                            ? new Date(currentOrder.servedAt).toLocaleTimeString('vi-VN')
                            : 'Đang chờ phục vụ'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-4 text-lg">Ghi chú</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100 italic">
                    {currentOrder.notes || 'Không có ghi chú nào cho đơn hàng này.'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* CỘT PHẢI (1/3): Summary & Status */}
        <div className="col-span-1 flex flex-col gap-6">
          {/* SUMMARY GIỮ NGUYÊN */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-4">Tổng quan thanh toán</h3>
            <div className="space-y-3 text-sm text-gray-600 mb-4 pb-4 border-b border-dashed border-gray-200">
              <div className="flex justify-between">
                <span>
                  Tạm tính ({currentOrder.itemsCount || currentOrder.items?.length || 0} món):
                </span>
                <span className="font-medium text-gray-900">
                  {subtotal.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Giảm giá:</span>
                <span>- 0 đ</span>
              </div>
              <div className="flex justify-between">
                <span>VAT (8%):</span>
                <span className="font-medium text-gray-900">0 đ</span>
              </div>
              {currentOrder.orderType === 'delivery' && (
                <div className="flex justify-between">
                  <span>Phí giao hàng:</span>
                  <span className="font-medium text-gray-900">0 đ</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center text-xl font-extrabold text-gray-900">
              <span>Tổng cộng:</span>
              <span className="text-cerulean-blue-600">
                {currentOrder.totalAmount?.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          {/* --- SỬA LẠI BLOCK STATUS NÀY --- */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-4">Trạng thái</h3>

            <div className="space-y-5">
              {/* Trạng thái Đơn hàng */}
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Trạng thái đơn hàng</p>
                <div className="relative border border-gray-200 rounded-lg bg-gray-50/50 hover:border-gray-300 transition-colors focus-within:ring-2 focus-within:ring-cerulean-blue-200">
                  <select
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    value={currentOrder.status}
                    onChange={(e) => {
                      if (currentOrder._id) {
                        // Gọi API update status
                        changeOrderStatus(currentOrder._id, e.target.value);
                      }
                    }}
                  >
                    <option value="pending">Chờ xác nhận</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="delivered">Đã giao hàng</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>

                  <div className="p-3.5 flex justify-between items-center pointer-events-none">
                    <StatusTag status={currentOrder.status || ''} />
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
