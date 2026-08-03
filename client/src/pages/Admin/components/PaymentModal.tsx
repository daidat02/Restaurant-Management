import { DialogCustom } from '@/components/DialogCustom';
import PaymentForm from './FormPayment';
import { usePayment } from '@/hooks/use-payment';
import { useEffect, useState } from 'react';
import { extractId } from '@/utils/helpers';
import { Loader2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  orderId: string | null;
  onClose: () => void;
  onOpen: () => void;
  onPaymentSucess: () => void;
}

export const PaymentModal = ({
  isOpen,
  orderId,
  onPaymentSucess,
  onOpen,
  onClose,
}: PaymentModalProps) => {
  const { startPayment, cancelPaymentPayOsUrl, updatePaymentStatus } = usePayment();

  const [paymentId, setPaymentId] = useState<string | null>(null);

  const handleOpenPayment = async (orderId: string) => {
    const newPayment = await startPayment(orderId, 'cash');
    setPaymentId(extractId(newPayment?._id, '_id'));
  };

  useEffect(() => {
    if (orderId) {
      handleOpenPayment(orderId);
      onOpen();
    }
  }, [orderId]);
  return (
    <DialogCustom
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose(); // Khi bấm ra ngoài modal hoặc bấm nút X, gọi onClose
      }}
      contentClass="!max-w-screen max-h-screen w-[95vw] md:w-[800px] lg:w-[1200px] p-0"
      content={
        // Chỉ render FormPayment khi đã có paymentId thật — tránh:
        //  1) fetch GET /api/payments/ (id rỗng) ngay khi modal mở, initiate còn đang chạy async → 404 "Cannot GET /api/payments/".
        //  2) modal hiện data rỗng (0đ) trong lúc chờ initiate.
        paymentId ? (
          <PaymentForm
            paymentId={paymentId}
            onCancel={async (id, method) => {
              if (method === 'banking') {
                await cancelPaymentPayOsUrl(id);
              }
              onClose(); // Đóng modal
            }}
            onConfirm={async (payload) => {
              await updatePaymentStatus(payload.paymentId, 'captured');
              onClose();
              onPaymentSucess();
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-[90vh] bg-white rounded-2xl">
            <Loader2 className="h-8 w-8 animate-spin text-cerulean-blue-600" />
            <span className="ml-3 text-sm text-gray-500 font-medium">
              Đang khởi tạo thanh toán...
            </span>
          </div>
        )
      }
    />
  );
};
