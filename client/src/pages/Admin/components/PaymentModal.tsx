import { DialogCustom } from '@/components/DialogCustom';
import PaymentForm from './FormPayment';
import { usePayment } from '@/hooks/use-payment';
import { useEffect, useState } from 'react';
import { extractId } from '@/utils/helpers';

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
    console.log(newPayment);
    setPaymentId(extractId(newPayment?._id, '_id'));
  };

  useEffect(() => {
    if (orderId) {
      console.log();
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
        <PaymentForm
          paymentId={paymentId || ''}
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
      }
    />
  );
};
