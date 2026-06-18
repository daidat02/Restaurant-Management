import type { IOrder } from "./order.type";


export interface IPayment{
  _id:string;
  order: IOrder;
  amount: number;
  method: 'cash' | 'card' | 'ewallet';
  provider?: string;
  status: 'initiated' | 'authorized' | 'captured' | 'failed' | 'refunded';
  transactionId?: string;
  raw?: any;
  refundReason?: string; // Thêm để ghi lý do hoàn tiền
  paymentDate?: Date; // Thêm để theo dõi thời gian thanh toán
  createdAt: Date;
  updatedAt: Date;
}