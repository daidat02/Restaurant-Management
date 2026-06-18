import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  ArrowLeft, 
  QrCode, 
  CircleDollarSign, 
  ShieldCheck, 
  ChevronRight,
  CheckCircle2,
  Receipt,
  Truck,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/hooks/redux-hook';
import type { IOrder } from '@/types/order.type';
import { clearCart } from '@/redux/slices/cartSlice';
import { useAuth } from '@/hooks/use-auth';
import { useOrder } from '@/hooks/use-order';
import { usePayment } from '@/hooks/use-payment';
import { extractId } from '@/utils/helpers';
import { DeliveryForm } from './components/delivery-form';
import { MethodSelector, PaymentMethodDetails } from './components/method-payment';
import ScrollToTop from '@/components/ScrollTop';

const CONSTANT_FEES = {
  shippingFee: 25000,
  tax: 12800,
}


type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'E_WALLET';
type OrderType = 'dine-in' | 'delivery';

export default function PaymentPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()

  const { user } = useAuth();
  const { currentOrder, addOrder } = useOrder();
  const { paymentSocketResult, startPayment, createPaymentPayOsUrl, startListeningSocket } = usePayment();

  const { cartItems } = useAppSelector((state) => state.cart)
  const subtotal = (cartItems || []).reduce((acc, item) => acc + (item.food?.price * item.quantity), 0)
    
  const orderType = (searchParams.get('type') as OrderType) || 'delivery'

  // States
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  
  // State lưu trữ dữ liệu sạch từ Backend
  const [payosData, setPayosData] = useState<any | null>(null) 
  
  const [deliveryInfo, setDeliveryInfo] = useState({
    name: '', 
    phone: '',
    address: ''
  })

  const currentShippingFee = orderType === 'delivery' ? CONSTANT_FEES.shippingFee : 0
  const totalAmount = subtotal + CONSTANT_FEES.tax + currentShippingFee

  const handleProcessPayment = async () => {
    if (orderType === 'delivery' && (!deliveryInfo.name || !deliveryInfo.phone || !deliveryInfo.address)) {
      alert("Vui lòng điền đầy đủ thông tin giao hàng!");
      return
    }
    setIsProcessing(true);

    const formattedItems: IOrder['items'] = cartItems.map(item => ({
      menuItem: item.food._id,
      nameSnapshot: item.food.name,
      priceSnapshot: item.food.price,
      quantity: item.quantity,
    }));

    try {
      const createPayload: IOrder = {
        restaurant: '69fccba996a14809070b9ef2',
        items: formattedItems,
        totalAmount: totalAmount,
        orderType: 'delivery',
        paymentStatus:paymentMethod == 'BANK_TRANSFER' ? 'waiting-paid' : 'unpaid' ,
        deliveryInfo: {
          name: user?.name || deliveryInfo.name || 'Chưa có',
          phone: user?.phone || deliveryInfo.phone || 'Chưa có',
          address: deliveryInfo.address || 'Chưa có',
        }
      }
      const result = await addOrder(createPayload, false);

      if (paymentMethod === 'BANK_TRANSFER' && result) {
        const paymentResult = await startPayment(extractId(result._id), 'banking');
        if (paymentResult) {
          const payOsUrl = await createPaymentPayOsUrl(extractId(result._id));
          
          if (payOsUrl) {
            setPayosData(payOsUrl); // Lưu layer dữ liệu bao gồm qrCodeData và infoPayment
          } 
          startListeningSocket(extractId(paymentResult._id));
        }
      } else {
        setIsSuccess(true);
      }
    } catch (error) {
      console.error("Lỗi khi xử lý đặt hàng:", error);
      alert("Có lỗi xảy ra, vui lòng thử lại!");
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    console.log("Result: ",paymentSocketResult);
    if (paymentSocketResult) {
      setIsProcessing(false);
      setIsSuccess(true);
    }
  }, [paymentSocketResult])

  useEffect(() => {
    if (isSuccess) {
      dispatch(clearCart());
    }
  }, [isSuccess, dispatch]);

  if (isSuccess) {
    return (
      <PaymentSuccessScreen 
        orderId={currentOrder?.orderId || 'ORD-2026-9951'} 
        total={currentOrder?.totalAmount || totalAmount} 
        orderType={orderType}
        onBack={() => navigate('/')} 
      />
    )
  }

  return (
    <div className="w-full min-h-screen bg-white pb-24 pt-4 text-gray-800 antialiased font-sans relative">
      <ScrollToTop/>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-16">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-white/95 backdrop-blur-md z-40 py-2 border-b border-gray-100 lg:border-none lg:static lg:bg-transparent lg:py-0">
          <button 
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" />
            <span>Quay lại</span>
          </button>
          <div className="text-xs font-black text-gray-900">
            {orderType === 'dine-in' ? (
              <>Thanh toán bàn: <span className="text-orange-500 font-mono text-sm">12</span></>
            ) : (
              <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded font-bold text-[10px] uppercase tracking-wide flex items-center gap-1">
                <Truck className="w-3 h-3" /> Đơn hàng giao tận nơi
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
          
          {/* CỘT TRÁI */}
          <main className="space-y-6">
            {orderType === 'delivery' && (
              <DeliveryForm info={deliveryInfo} setInfo={setDeliveryInfo} />
            )}

            <div className="space-y-4">
              <div>
                <h2 className="text-sm lg:text-base font-black text-gray-950 tracking-tight uppercase">
                  Phương thức thanh toán
                </h2>
                <p className="text-xs text-gray-400 font-medium">Vui lòng chọn cổng thanh toán phù hợp</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <MethodSelector 
                  id="CASH"
                  title={orderType === 'delivery' ? "Tiền mặt khi nhận hàng (COD)" : "Tiền mặt tại quầy"}
                  desc={orderType === 'delivery' ? "Thanh toán trực tiếp cho shipper" : "Nhân viên hỗ trợ tại bàn"}
                  icon={<CircleDollarSign className="w-5 h-5" />}
                  activeMethod={paymentMethod}
                  setMethod={id => {
                    setPaymentMethod(id);
                    if (id !== 'BANK_TRANSFER') setPayosData(null);
                  }}
                />
                <MethodSelector 
                  id="BANK_TRANSFER"
                  title="Chuyển khoản Ngân hàng"
                  desc="Quét mã QR VietQR nhận diện tức thì"
                  icon={<QrCode className="w-5 h-5" />}
                  activeMethod={paymentMethod}
                  setMethod={id => setPaymentMethod(id)}
                />
              </div>
            </div>

            {/* TRUYỀN LAYER DATA ĐÃ ĐỊNH DẠNG XUỐNG COMPONENT CON */}
            <PaymentMethodDetails 
              paymentMethod={paymentMethod} 
              orderType={orderType} 
              bankInfo={payosData}
            />
          </main>

          {/* CỘT PHẢI */}
          <OrderSummarySide 
            items={cartItems}
            subtotal={subtotal}
            tax={CONSTANT_FEES.tax}
            shippingFee={currentShippingFee}
            totalAmount={totalAmount}
            isProcessing={isProcessing}
            paymentMethod={paymentMethod}
            isQrGenerated={!!payosData}
            onProcessPayment={handleProcessPayment}
          />

        </div>
      </div>
    </div>
  )
}


interface SummarySideProps {
  items: any[]
  subtotal: number
  tax: number
  shippingFee: number
  totalAmount: number
  isProcessing: boolean
  paymentMethod: PaymentMethod
  isQrGenerated: boolean
  onProcessPayment: () => void
}

function OrderSummarySide({
  items,
  subtotal,
  tax,
  shippingFee,
  totalAmount,
  isProcessing,
  paymentMethod,
  isQrGenerated,
  onProcessPayment
}: SummarySideProps) {
  return (
    <aside className="bg-white flex flex-col p-5 border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-2xl sticky top-24">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm font-black tracking-tight text-gray-900">
          <Receipt className="w-4 h-4 text-gray-900" />
          <span>Chi tiết đơn hàng</span>
        </div>
      </div>

      <div className="space-y-3 max-h-[200px] overflow-y-auto no-scrollbar pr-1 mb-4">
        {items?.map((item) => (
          <div key={item?.food?._id} className="flex justify-between items-start gap-4 text-xs">
            <div className="min-w-0 flex-1 space-y-0.5">
              <h4 className="font-bold text-gray-900 truncate leading-snug">{item?.food?.name}</h4>
              <p className="text-[10px] text-gray-400 font-medium">
                Số lượng: <span className="font-mono font-bold text-gray-800">{item?.quantity}</span> × {item?.food?.price?.toLocaleString('vi-VN')} đ
              </p>
            </div>
            <span className="font-black text-gray-950 text-right flex-shrink-0">
              {(item?.food?.price * item?.quantity).toLocaleString('vi-VN')} đ
            </span>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-100 space-y-2 bg-white text-xs">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 font-medium">Tạm tính ăn uống</span>
          <span className="font-bold text-gray-900">{subtotal.toLocaleString('vi-VN')} đ</span>
        </div>
        
        {shippingFee > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400 font-medium">Phí giao hàng</span>
            <span className="font-bold text-gray-900">{shippingFee.toLocaleString('vi-VN')} đ</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-gray-400 font-medium">Thuế VAT (8%)</span>
          <span className="font-bold text-gray-900">{tax.toLocaleString('vi-VN')} đ</span>
        </div>
        
        <div className="pt-3 mt-1 border-t border-dashed border-gray-200 flex justify-between items-baseline">
          <span className="text-[10px] font-black text-gray-900 uppercase tracking-wide">Tổng thanh toán</span>
          <p className="text-xl font-black text-orange-600 tracking-tighter font-mono">
            {totalAmount.toLocaleString('vi-VN')} đ
          </p>
        </div>

        <button 
          type="button"
          onClick={onProcessPayment}
          disabled={isProcessing}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:cursor-not-allowed text-white font-black text-xs py-3.5 tracking-wider uppercase transition-all shadow-md active:scale-[0.99] mt-2"
        >
          {isProcessing ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          <span>
            {isProcessing 
              ? "Đang xử lý..." 
              : paymentMethod === 'BANK_TRANSFER' 
                ? (isQrGenerated ? 'Tôi đã hoàn tất chuyển khoản' : 'Xác nhận tạo thông tin')
                : 'Xác nhận đặt hàng'
            }
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </aside>
  )
}

/* ==========================================================================
   COMPONENT 5: MÀN HÌNH THÀNH CÔNG
   ========================================================================== */
interface SuccessScreenProps {
  orderId: string
  total: number
  orderType: OrderType
  onBack: () => void
}

function PaymentSuccessScreen({ orderId, total, orderType, onBack }: SuccessScreenProps) {
  return (
    <div className="w-full min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center text-gray-800 antialiased font-sans">
      <ScrollToTop/>
      <div className="max-w-sm space-y-6">
        <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-500 shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-black text-gray-950 tracking-tight uppercase">
            {orderType === 'delivery' ? 'Đặt hàng thành công!' : 'Thanh toán hoàn tất!'}
          </h2>
          <p className="text-xs text-gray-400 px-4">
            {orderType === 'delivery' 
              ? 'Đơn hàng của bạn đã được tiếp nhận tại quầy bếp và đang chuẩn bị giao.' 
              : 'Hóa đơn của bạn đã được đối soát tự động thành công. Cảm ơn bạn đã dùng bữa!'}
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs space-y-2.5 font-medium text-left">
          <div className="flex justify-between border-b border-gray-200/50 pb-2">
            <span className="text-gray-400">Mã đơn hàng:</span>
            <span className="font-mono font-bold text-gray-900">{orderId}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200/50 pb-2">
            <span className="text-gray-400">Hình thức:</span>
            <span className="font-bold text-gray-900">{orderType === 'delivery' ? 'Giao hàng tận nơi' : 'Ăn tại bàn'}</span>
          </div>
          <div className="flex justify-between pt-1 items-baseline">
            <span className="text-gray-400 font-black uppercase text-[10px]">Tổng số tiền</span>
            <span className="font-mono font-black text-orange-600 text-base">{total.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        <button 
          type="button"
          onClick={onBack}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-950 hover:bg-gray-900 text-white font-black text-xs py-3.5 tracking-wider uppercase transition-all shadow-md active:scale-[0.99]"
        >
          <span>Quay về trang chủ</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}