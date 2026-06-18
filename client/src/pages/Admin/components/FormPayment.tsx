import { useSidebar } from '@/components/ui/sidebar';
import { useEffect, useState, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { usePayment } from '@/hooks/use-payment';
import { Banknote, Check, CreditCard, Printer, QrCode, X } from 'lucide-react';
import { toast } from 'sonner';
import { extractId } from '@/utils/helpers';
import { CustomTabs } from '@/components/tabsCustom';
import { useReactToPrint } from 'react-to-print';

// IMPORT COMPONENT IN HÓA ĐƠN
import ReceiptTemplate from './ReceiptTemplate';
import { DialogCustom } from '@/components/DialogCustom';
import { useAuth } from '@/hooks/use-auth';
import { useSetting } from '@/hooks/use-setting';
import type { IReceiptConfig } from '@/types/setting.type';

export interface IPaymentItem {
  id: string | number;
  name: string;
  quantity: number;
  price: number;
}

interface PaymentFormProps {
  paymentId: string;
  onCancel?: (orderId: string, method?: string) => void;
  onConfirm?: (payload: {
    paymentId: string;
    method: string;
    tenderedAmount?: number;
    changeAmount?: number;
    isPrint: boolean;
  }) => void;
}

export default function PaymentForm({ paymentId, onCancel, onConfirm }: PaymentFormProps) {
  const { user } = useAuth();
  const { currentSetting, fetchSettingById } = useSetting();
  const {
    currentPayment,
    fetchPaymentById,
    updatePaymentMethod,
    createPaymentPayOsUrl,
    startListeningSocket,
    stopListeningSocket,
    paymentSocketResult,
  } = usePayment();

  const [paymentPayosResponse, setPaymentPayosResponse] = useState<any>(null);
  const totalAmount = currentPayment?.amount || 0; // Đây là số tiền gốc (Tạm tính)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'e-walet' | 'banking'>('cash');
  const [tenderedInput, setTenderedInput] = useState<string>('');
  const [isPrint, setIsPrint] = useState<boolean>(true);

  const { isMobile } = useSidebar();

  // ========================== TRUNG TÂM TÍNH TOÁN LOGIC THUẾ PHÍ ==========================
  const vatRate = currentSetting?.receiptConfig?.vat || 0;
  const serviceFeeRate = currentSetting?.receiptConfig?.serviceFee || 0;

  // Phí phục vụ tính trên tiền gốc hàng hóa
  const serviceFeeAmount = (totalAmount * serviceFeeRate) / 100;
  // Thuế VAT tính trên tiền gốc cộng thêm phí phục vụ (Chuẩn nghiệp vụ F&B)
  const amountBeforeVat = totalAmount + serviceFeeAmount;
  const vatAmount = (amountBeforeVat * vatRate) / 100;

  // Tổng thanh toán cuối cùng khách phải trả
  const finalTotal = amountBeforeVat + vatAmount;

  // Tiền mặt xử lý tính dựa trên finalTotal (Tổng thanh toán cuối cùng) chứ không phải tiền gốc
  const tenderedAmount = parseInt(tenderedInput.replace(/\D/g, '') || '0', 10);
  const changeAmount = tenderedAmount - finalTotal;

  const suggestedAmounts = useMemo(() => {
    if (finalTotal === 0) return [];
    let vals = [
      Math.ceil(finalTotal / 10000) * 10000,
      Math.ceil(finalTotal / 50000) * 50000,
      Math.ceil(finalTotal / 100000) * 100000,
      Math.ceil(finalTotal / 500000) * 500000,
    ];
    vals = Array.from(new Set(vals))
      .filter((v) => v >= finalTotal)
      .sort((a, b) => a - b);
    if (vals.length < 4) vals.push(vals[vals.length - 1] + 100000);
    return vals.slice(0, 4);
  }, [finalTotal]);

  // ========================== CẤU HÌNH IN ẤN ==========================
  const receiptRef = useRef<HTMLDivElement>(null);

  const triggerPrint = useReactToPrint({
    contentRef: receiptRef,
    documentTitle: `Hoa_Don_${currentPayment?.order?.orderId || 'Moi'}`,
  });

  const handlePrintFlow = async (isFinalPayment: boolean) => {
    try {
      await triggerPrint();
      if (isFinalPayment && onConfirm) {
        onConfirm({
          paymentId: extractId(currentPayment?._id, '_id'),
          method: paymentMethod,
          tenderedAmount,
          changeAmount,
          isPrint: true,
        });
      }
    } catch (error) {
      console.error('Lỗi tiến trình in ấn:', error);
      if (isFinalPayment && onConfirm) {
        onConfirm({
          paymentId: extractId(currentPayment?._id, '_id'),
          method: paymentMethod,
          isPrint: false,
        });
      }
    }
  };

  // KỊCH BẢN 1: XÁC NHẬN THANH TOÁN TIỀN MẶT THỦ CÔNG
  const handleSubmit = async () => {
    if (paymentMethod === 'cash' && tenderedAmount < finalTotal) {
      toast.warning('Tiền khách đưa chưa đủ!', { position: 'top-right' });
      return;
    }

    if (isPrint) {
      await handlePrintFlow(true);
    } else {
      if (onConfirm) {
        onConfirm({
          paymentId: extractId(currentPayment?._id, '_id'),
          method: paymentMethod,
          tenderedAmount,
          changeAmount,
          isPrint: false,
        });
      }
    }
  };

  // KỊCH BẢN 2: HOÀN TẤT SAU KHI QUÉT QR BANKING THÀNH CÔNG (SOCKET)
  const handleCloseSuccessModal = async () => {
    stopListeningSocket();

    if (isPrint) {
      await handlePrintFlow(true);
    } else {
      if (currentPayment?._id && onConfirm) {
        await fetchPaymentById(currentPayment._id);
        onConfirm({
          paymentId: extractId(currentPayment?._id, '_id'),
          method: paymentMethod,
          isPrint: false,
        });
      }
    }
  };

  useEffect(() => {
    if (paymentId) fetchPaymentById(paymentId);
    fetchSettingById(extractId(user?.restaurant));
  }, [fetchPaymentById, paymentId]);

  return (
    <div className="flex flex-col md:flex-row h-[90vh] w-full overflow-hidden bg-white rounded-2xl border border-gray-100 shadow-sm relative">
      {/* DIALOG THÔNG BÁO THANH TOÁN THÀNH CÔNG REALTIME */}
      {paymentSocketResult?.data?.code === '00' && (
        <DialogCustom
          open={true}
          content={
            <div className="flex flex-col items-center justify-center p-2 sm:p-4 max-w-full">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 border-4 border-green-50 shadow-sm">
                <Check color="#16c52a" className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1 text-center">
                Thanh toán thành công!
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:text-center">
                Đơn hàng của bạn đã được xác nhận qua hệ thống tài khoản.
              </p>

              <div className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Số tiền:</span>
                  <span className="font-bold text-[#16c52a] text-base sm:text-lg">
                    {paymentSocketResult.data.amount.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Người chuyển:</span>
                  <span className="font-medium text-gray-800 uppercase truncate max-w-[180px]">
                    {paymentSocketResult.data.counterAccountName || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Mã đơn (OrderCode):</span>
                  <span className="font-medium text-gray-800">
                    {paymentSocketResult.data.orderCode}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Thời gian:</span>
                  <span className="font-medium text-gray-800 text-right">
                    {paymentSocketResult.data.transactionDateTime}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCloseSuccessModal}
                className="w-full bg-blue-600 text-white font-semibold py-2.5 sm:py-3 px-4 rounded-lg shadow hover:bg-blue-700 transition-colors duration-200 text-sm"
              >
                Hoàn tất & Xuất hóa đơn
              </button>
            </div>
          }
        />
      )}

      {/* CỘT TRÁI: CHI TIẾT HÓA ĐƠN */}
      <div className="w-full md:w-[38%] lg:w-[35%] border-b md:border-b-0 md:border-r border-gray-100 flex flex-col bg-gray-50/50 max-h-[160px] md:max-h-none shrink-0">
        <div className="flex justify-between p-3 sm:p-4 border-b border-gray-100 font-semibold text-xs sm:text-sm text-cerulean-blue-600 bg-white md:bg-transparent sticky top-0 z-10">
          <span>Mã Đơn - {currentPayment?.order?.orderId}</span>
          {currentPayment?.order?.table?._id && (
            <span>Bàn Số - {currentPayment?.order?.table?.tableNumber}</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col gap-2">
          {currentPayment?.order?.items?.map((item: any) => (
            <div
              key={item._id}
              className="flex justify-between pt-2 items-start text-xs sm:text-sm border-t border-gray-100 first:border-0 first:pt-0"
            >
              <div className="flex-1 pr-2">
                <span className="font-medium text-gray-800 line-clamp-2">{item.nameSnapshot}</span>
                <div className="text-gray-500 text-[11px] mt-0.5">
                  SL: {item.quantity} x {item.priceSnapshot.toLocaleString()}đ
                </div>
              </div>
              <div className="font-semibold text-gray-800 whitespace-nowrap">
                {(item.quantity * item.priceSnapshot).toLocaleString()}đ
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CỘT PHẢI: THAO TÁC THANH TOÁN */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 h-full overflow-y-auto min-w-0">
        <div className="overflow-x-auto pb-1 hide-scrollbar shrink-0">
          <CustomTabs
            showChevron={false}
            activeTab={paymentMethod}
            tabs={[
              { id: 'cash', label: 'Tiền Mặt', icon: <Banknote size={16} /> },
              { id: 'banking', label: 'Chuyển Khoản', icon: <QrCode size={16} /> },
              { id: 'e-walet', label: 'Quẹt thẻ', icon: <CreditCard size={16} /> },
            ]}
            onTabChange={async (id) => {
              setPaymentMethod(id as 'cash' | 'e-walet' | 'banking');
              const pId = extractId(currentPayment, '_id');
              if (id === 'cash') {
                await updatePaymentMethod(pId, id);
              } else if (id === 'banking') {
                if (!paymentPayosResponse?.qrCodeData) {
                  try {
                    if (currentSetting?.paymentMethodType == 'payos') {
                      const orderId = currentPayment?.order._id || '';
                      if (!orderId) return;
                      const result = await createPaymentPayOsUrl(orderId);
                      setPaymentPayosResponse(result);
                      const paymentId = currentPayment?._id;
                      startListeningSocket(paymentId as string);
                    }
                  } catch (error) {
                    console.error('Lỗi khi tạo link thanh toán:', error);
                  }
                }
                await updatePaymentMethod(pId, id);
              }
            }}
            tabClassName="text-xs sm:text-sm py-2 px-3 sm:py-2.5 gap-1.5 whitespace-nowrap"
          />
        </div>

        {/* Khu vực nội dung Tab */}
        <div className="flex-1 mt-4 min-h-0">
          {paymentMethod === 'cash' && (
            <div className="flex flex-col gap-3 sm:gap-4 animate-in fade-in duration-300">
              <div>
                <label className="text-[12px] sm:text-[13px] font-semibold text-gray-500 mb-1.5 block">
                  Tiền khách đưa
                </label>
                <input
                  type="text"
                  value={tenderedAmount > 0 ? tenderedAmount.toLocaleString() : ''}
                  onChange={(e) => {
                    const rawVal = e.target.value.replace(/\D/g, '');
                    setTenderedInput(rawVal);
                  }}
                  placeholder={finalTotal.toLocaleString()}
                  className="w-full border border-gray-200 rounded-xl p-2.5 sm:p-3 text-right text-base sm:text-lg font-bold text-gray-800 outline-none focus:border-cerulean-blue-500 focus:ring-1 focus:ring-cerulean-blue-500"
                />
              </div>

              <div>
                <label className="text-[12px] sm:text-[13px] font-semibold text-gray-500 mb-1.5 block">
                  Gợi ý tiền nhanh
                </label>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                  {suggestedAmounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTenderedInput(amount.toString())}
                      className="border border-gray-200 rounded-xl py-2 text-xs sm:text-sm font-semibold text-gray-800 hover:bg-cerulean-blue-50 hover:border-cerulean-blue-300 transition-colors text-center truncate"
                    >
                      {amount / 1000}k
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#f4f6fa] p-3 sm:p-4 rounded-xl flex justify-between items-center mt-1">
                <span className="text-gray-500 font-semibold text-xs sm:text-sm">
                  Tiền thừa trả khách
                </span>
                <span
                  className={`text-base sm:text-xl font-bold ${changeAmount < 0 && tenderedAmount > 0 ? 'text-red-500' : 'text-gray-900'}`}
                >
                  {tenderedAmount === 0
                    ? '0đ'
                    : changeAmount < 0
                      ? 'Khách đưa thiếu'
                      : `${changeAmount.toLocaleString()}đ`}
                </span>
              </div>
            </div>
          )}

          {paymentMethod === 'banking' && (
            <div className="flex flex-col items-center justify-center py-4 animate-in fade-in duration-300">
              {paymentPayosResponse?.qrCodeData && currentSetting?.paymentMethodType == 'payos' && (
                <div className="p-2 sm:p-2 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm border border-gray-100 shrink-0">
                  <QRCodeSVG
                    value={paymentPayosResponse?.qrCodeData || ''}
                    size={isMobile ? 80 : 140}
                    style={{ borderRadius: '6px' }}
                    includeMargin={false}
                  />
                </div>
              )}
              {currentSetting?.paymentMethodType == 'bank_transfer' && (
                <div className="p-1 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm border border-gray-100 shrink-0">
                  <img
                    src={currentSetting.bankAccount?.fixedQrUrl}
                    alt="VietQR"
                    className="w-50 h-50 object-contain"
                  />
                </div>
              )}
              <p className="text-gray-500 text-xs sm:text-sm text-center px-2 leading-relaxed">
                Vui lòng khách hàng quét mã QR để thanh toán <br />
                số tiền{' '}
                <strong className="text-gray-900 font-bold text-sm sm:text-base">
                  {finalTotal.toLocaleString()}đ
                </strong>
              </p>
            </div>
          )}
        </div>

        {/* KHỐI TỔNG HỢP VÀ HÀNH ĐỘNG Ở ĐÁY FORM */}
        <div className="mt-6 pt-4 border-t border-gray-100 bg-white shrink-0">
          <div className="space-y-2 border-b border-dashed border-gray-200 pb-3 mb-3">
            <div className="flex justify-between items-center text-xs sm:text-sm">
              <span className="text-gray-500 font-medium">Tạm tính</span>
              <span className="font-bold text-gray-800">{totalAmount.toLocaleString()}đ</span>
            </div>

            {serviceFeeRate > 0 && (
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-gray-500 font-medium">Phí phục vụ ({serviceFeeRate}%)</span>
                <span className="font-bold text-gray-800">
                  +{serviceFeeAmount.toLocaleString()}đ
                </span>
              </div>
            )}

            {vatRate > 0 && (
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-gray-500 font-medium">VAT ({vatRate}%)</span>
                <span className="font-bold text-gray-800">+{vatAmount.toLocaleString()}đ</span>
              </div>
            )}
          </div>

          <div className="bg-[#eef5ff] p-3 sm:p-4 rounded-xl sm:rounded-2xl flex justify-between items-center mb-4">
            <span className="text-cerulean-blue-600 font-bold text-xs sm:text-[15px]">
              Tổng thanh toán
            </span>
            <span className="text-2xl sm:text-3xl font-black text-cerulean-blue-600 tracking-tight">
              {finalTotal.toLocaleString()}đ
            </span>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-row items-center justify-between gap-2 border-b border-gray-100 pb-3 sm:border-b-0 sm:pb-0">
              <label className="flex items-center gap-2 cursor-pointer text-gray-800 hover:text-cerulean-blue-600 group text-xs sm:text-sm font-bold select-none">
                <input
                  type="checkbox"
                  checked={currentSetting?.receiptConfig?.autoPrintOnCheckout}
                  onChange={(e) => setIsPrint(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-cerulean-blue-600 rounded"
                />
                <Printer
                  size={16}
                  className="text-gray-600 group-hover:text-cerulean-blue-600 transition-colors"
                />
                <span>In khi chốt đơn</span>
              </label>

              <button
                type="button"
                onClick={() => handlePrintFlow(false)}
                className="flex items-center gap-1.5 px-3 h-9 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors bg-white shadow-sm"
              >
                <Printer size={15} /> In Bill tạm tính
              </button>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:justify-end sm:items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const orderId = extractId(currentPayment?.order, '_id');
                  if (onCancel && orderId) onCancel(orderId, paymentMethod);
                }}
                className="flex items-center justify-center gap-1.5 px-4 h-10 sm:h-11 border border-gray-300 rounded-xl text-xs sm:text-sm font-bold text-gray-800 hover:bg-gray-50 transition-colors bg-white shadow-sm"
              >
                <X size={15} /> Hủy bỏ
              </button>

              {paymentMethod === 'cash' ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex items-center justify-center gap-1.5 px-4 h-10 sm:h-11 bg-cerulean-blue-600 hover:bg-cerulean-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-md"
                >
                  <Check size={16} /> Chốt tiền mặt
                </button>
              ) : (
                <div className="bg-gray-100 text-gray-400 rounded-xl text-xs flex items-center justify-center font-bold h-10 sm:h-11 border border-gray-200 select-none leading-tight px-3 text-center">
                  Chờ quét mã...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* COMPONENT IN ẨN VỚI PROPS MỚI SẠCH SẼ */}
      <div className="hidden">
        <div ref={receiptRef}>
          <ReceiptTemplate
            resaurant={currentSetting?.targetId}
            staff={user?.name}
            currentPayment={currentPayment}
            paymentMethod={paymentMethod}
            bankingType={currentSetting?.paymentMethodType}
            totalAmount={totalAmount}
            serviceFeeAmount={serviceFeeAmount}
            serviceFeeRate={serviceFeeRate}
            vatAmount={vatAmount}
            vatRate={vatRate}
            finalTotal={finalTotal}
            tenderedAmount={tenderedAmount}
            changeAmount={changeAmount}
            qrCodeData={paymentPayosResponse?.qrCodeData}
            fixedQrUrl={currentSetting?.bankAccount?.fixedQrUrl}
            receiptConfig={currentSetting?.receiptConfig as IReceiptConfig}
          />
        </div>
      </div>
    </div>
  );
}
