import type { IReceiptConfig } from '@/types/setting.type';
import { QRCodeSVG } from 'qrcode.react';

interface ReceiptTemplateProps {
  restaurantInfor?: any;
  receiptConfig: IReceiptConfig;
  currentPayment: any;
  paymentMethod: 'cash' | 'e-walet' | 'banking';
  totalAmount: number;
  serviceFeeAmount: number;
  serviceFeeRate: number;
  vatAmount: number;
  vatRate: number;
  finalTotal: number;
  tenderedAmount: number;
  changeAmount: number;
  qrCodeData?: string;
  fixedQrUrl?: string;
  bankingType?: string;
  staff?: string;
  resaurant?: any;
}

export default function ReceiptTemplate({
  currentPayment,
  paymentMethod,
  totalAmount,
  serviceFeeAmount,
  serviceFeeRate,
  vatAmount,
  vatRate,
  finalTotal,
  tenderedAmount,
  changeAmount,
  qrCodeData,
  fixedQrUrl,
  receiptConfig,
  bankingType,
  resaurant,
  staff,
}: ReceiptTemplateProps) {
  const order = currentPayment?.order;

  return (
    <div
      className={`w-[${receiptConfig?.paperSize || '80mm'}] p-4 bg-white text-black font-sans text-sm`}
    >
      {/* 1. Header: Thông tin quán */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold uppercase">Phiếu Tạm Tính</h2>
        <p className="text-xs mt-1">Đ/c: {resaurant?.address}</p>
        <p className="text-xs">SĐT: {resaurant?.phone}</p>
      </div>

      {/* 2. Thông tin đơn hàng */}
      <div className="border-t border-b border-dashed border-gray-400 py-2 my-2 text-xs">
        <p>Mã HĐ: {order?.orderId}</p>
        {order?.table && <p>Bàn: {order?.table?.tableNumber}</p>}
        <p>Thu ngân: {staff || 'Nhân viên'}</p>
        <p>Giờ in: {new Date().toLocaleString('vi-VN')}</p>
      </div>

      {/* 3. Danh sách món ăn */}
      <table className="w-full text-xs my-2">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="text-left pb-1 font-semibold">Tên Món</th>
            <th className="text-center pb-1 font-semibold">SL</th>
            <th className="text-right pb-1 font-semibold">T.Tiền</th>
          </tr>
        </thead>
        <tbody>
          {order?.items?.map((item: any) => (
            <tr key={item._id}>
              <td className="py-1 break-words pr-1">{item.nameSnapshot}</td>
              <td className="text-center align-top py-1">{item.quantity}</td>
              <td className="text-right align-top py-1">
                {(item.quantity * item.priceSnapshot).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 4. Tổng kết tiền (Đã tách rời hoàn toàn logic tính toán) */}
      <div className="space-y-2 mt-2">
        <div className="flex justify-between border-t text-xs text-gray-600">
          <span>Tạm tính</span>
          <span>{totalAmount.toLocaleString()}đ</span>
        </div>

        {serviceFeeRate > 0 && (
          <div className="flex justify-between text-xs text-gray-600">
            <span>Phí Phục Vụ ({serviceFeeRate}%)</span>
            <span>+{serviceFeeAmount.toLocaleString()}đ</span>
          </div>
        )}

        {vatRate > 0 && (
          <div className="flex justify-between text-xs text-gray-600">
            <span>VAT ({vatRate}%)</span>
            <span>+{vatAmount.toLocaleString()}đ</span>
          </div>
        )}

        <div className="border-t border-dashed border-gray-400 pt-2 flex justify-between font-bold text-sm mt-1">
          <span>TỔNG THANH TOÁN:</span>
          <span>{finalTotal.toLocaleString()}đ</span>
        </div>
      </div>

      <div className="mt-1 text-xs">
        <div className="flex justify-between text-gray-600 mb-1">
          <span>Phương thức:</span>
          <span>
            {paymentMethod === 'cash'
              ? 'Tiền mặt'
              : paymentMethod === 'banking'
                ? 'Chuyển khoản'
                : 'Quẹt thẻ'}
          </span>
        </div>

        {paymentMethod === 'cash' && (
          <>
            <div className="flex justify-between text-gray-600">
              <span>Tiền khách đưa:</span>
              <span>{tenderedAmount.toLocaleString()}đ</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tiền trả lại:</span>
              <span>{changeAmount < 0 ? '0đ' : `${changeAmount.toLocaleString()}đ`}</span>
            </div>
          </>
        )}

        {paymentMethod === 'banking' && (
          <div className="w-full flex flex-col items-center justify-center mt-4">
            <h4 className="font-semibold">Mã Thanh Toán</h4>
            <span className="text-center px-5">
              Mã QR chỉ tồn tại trong vài phút, Vui lòng scan tại đây
            </span>
            {bankingType == 'payos' && qrCodeData && (
              <div className="w-28 h-28 bg-white flex items-center justify-center my-4 overflow-hidden">
                <QRCodeSVG value={qrCodeData || ''} size={100} includeMargin={false} />
              </div>
            )}
            {bankingType == 'bank_transfer' && fixedQrUrl && (
              <div className="w-28 h-28 bg-white flex items-center justify-center my-4 overflow-hidden">
                <img src={fixedQrUrl} alt="VietQR" className="w-30 h-30 object-contain" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Footer */}
      <div className="text-center mt-2 text-xs italic">
        <p>
          Wifi: {receiptConfig?.wifiName} / Pass: {receiptConfig?.wifiPassword}
        </p>
        <p>{receiptConfig?.footerText}</p>
      </div>
    </div>
  );
}
