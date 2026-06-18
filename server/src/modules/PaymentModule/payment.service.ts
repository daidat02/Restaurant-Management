import mongoose from 'mongoose';
import type { IPayment, IPaymentDocument } from '../../models/Schema/PaymentSchema.js';
import type { ServiceResponse } from '../../shared/type.js';
import orderRepository from '../OrderModule/order.repository.js';
import paymentRepository from './payment.repository.js';
import vnpayService from './vnpay.service.js';
import tableRepository from '../TableModule/table.repository.js';

const ObjectId = mongoose.Types.ObjectId;
type Provider = 'vn_pay' | 'momo' | 'zalopay';

class PaymentService {
  async getPaymentDetailService(id: string): Promise<ServiceResponse<IPaymentDocument>> {
    try {
      // Gọi hàm từ tầng Repository mà bạn đã định nghĩa trước đó
      const payment = await paymentRepository.findPaymentDetail(id);

      // Xử lý trường hợp không tìm thấy (return code 404)
      if (!payment) {
        return {
          code: 404,
          message: 'Không tìm thấy thông tin thanh toán',
          // data: null (tuỳ thuộc vào interface ServiceResponse của bạn có bắt buộc không)
        };
      }

      // Trả về thành công
      return {
        code: 200,
        message: 'Lấy chi tiết thanh toán thành công',
        data: payment,
      };
    } catch (error: any) {
      console.error('Lỗi getPaymentDetailService:', error);
      return {
        code: 500,
        message: 'Lấy chi tiết thanh toán thất bại',
      };
    }
  }

  async initiatePaymentService(orderId: string): Promise<ServiceResponse<IPaymentDocument>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await orderRepository.findOrderById(orderId);
      if (!order) {
        await session.abortTransaction();
        return { code: 404, message: 'Không tìm thấy đơn hàng' };
      }
      if (order.status === 'paid') {
        await session.abortTransaction();
        return { code: 400, message: 'Đơn hàng đã được thanh toán' };
      }
      const existingPayment = await paymentRepository.findByOrderId(
        orderId,
        order.totalAmount,
        'initiated',
      );
      if (existingPayment) {
        await session.commitTransaction();
        return {
          code: 200,
          message: 'Lấy thông tin thanh toán thành công',
          data: existingPayment,
        };
      }

      const newPayment = await paymentRepository.createPayment(
        {
          order: new ObjectId(orderId),
          amount: order.totalAmount,
          status: 'initiated',
        },
        { session },
      );

      await session.commitTransaction();
      return {
        code: 201,
        message: 'Khởi tạo thanh toán thành công',
        data: newPayment,
      };
    } catch (error) {
      await session.abortTransaction();
      console.log(error);
      return { code: 500, message: 'Khởi tạo thanh toán thất bại' };
    } finally {
      await session.endSession();
    }
  }

  async changePaymentStatusAuthorized(
    paymentId: string,
    status: string,
  ): Promise<ServiceResponse<IPaymentDocument>> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const existingPayment = await paymentRepository.changePaymentStatus(paymentId, status, {
        session,
      });
      const existingOrder = await orderRepository.findOrderById(existingPayment.order.toString());
      if (!existingPayment) {
        await session.abortTransaction();
        return { code: 404, message: 'Không tìm thấy thông tin thanh toán' };
      }

      if (status === 'captured') {
        if (
          existingOrder?.orderType == 'delivery' &&
          existingOrder.paymentStatus == 'waiting_paid'
        ) {
          await orderRepository.updateOrder(
            existingPayment.order.toString(),
            {
              status: 'confirmed',
              paymentStatus: 'paid',
            },
            { session },
          );
        } else {
          await orderRepository.updateOrder(
            existingPayment.order.toString(),
            {
              status: 'paid',
              paymentStatus: 'paid',
            },
            { session },
          );
        }

        if (existingOrder && existingOrder.table) {
          await tableRepository.updateTable(
            existingOrder.table.toString(),
            { status: 'available', currentOrder: null },
            { session },
          );
        }
      }

      await session.commitTransaction();
      return {
        code: 200,
        message: 'Cập nhật thanh toán thành công',
        data: existingPayment,
      };
    } catch (error) {
      await session.abortTransaction();
      console.error('Lỗi khi xử lý thanh toán:', error);
      return { code: 500, message: 'Cập nhật trạng thái thất bại' };
    } finally {
      await session.endSession();
    }
  }

  async createPaymentUrl(
    method: string,
    provider: Provider,
    orderId: string,
  ): Promise<ServiceResponse<string>> {
    if (method !== 'ewallet') {
      return { code: 400, message: 'Chỉ áp dụng thanh toán qua ví điện tử/ngân hàng' };
    }

    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      return { code: 404, message: 'Không tìm thấy đơn hàng' };
    }
    if (order.status === 'paid') {
      return { code: 400, message: 'Đơn hàng đã được thanh toán' };
    }

    switch (provider) {
      case 'vn_pay':
        const result = await vnpayService.createPaymentUrl(order);
        return { code: 200, message: 'Tạo link thanh toán thành công', data: result };

      default:
        return { code: 400, message: 'Nhà cung cấp dịch vụ không hợp lệ' };
    }
  }

  async processReturnUrl(vnpParams: any): Promise<ServiceResponse<IPaymentDocument>> {
    if (!vnpParams.vnp_SecureHash || !vnpParams.vnp_ResponseCode || !vnpParams.vnp_TxnRef) {
      return { code: 400, message: 'Thiếu các trường bắt buộc từ VNPay' };
    }

    const { responseCode, txnRef, bankCode, vnp_TransactionNo } =
      await vnpayService.returnUrl(vnpParams);
    const orderId = txnRef.split('-')[2];

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await orderRepository.findOrderById(orderId!);
      if (!order) {
        await session.abortTransaction();
        return { code: 404, message: 'Không tìm thấy đơn hàng' };
      }

      const existingPayment = await paymentRepository.findByOrderId(
        orderId!,
        order.totalAmount,
        'initiated',
      );

      if (!existingPayment) {
        await session.abortTransaction();
        return { code: 404, message: 'Không tìm thấy giao dịch khởi tạo hợp lệ' };
      }

      const updatePayload = {
        transactionId: vnp_TransactionNo,
        provider: 'vn_pay' as Provider,
        raw: { responseCode, bankCode },
      };

      if (responseCode !== '00') {
        const updatedPayment = await paymentRepository.updatePayment(existingPayment.toString(), {
          status: 'failed',
          ...updatePayload,
        });
        await updatedPayment.save({ session });
        await session.commitTransaction();
        return { code: 400, message: 'Thanh toán thất bại hoặc đã bị hủy', data: updatedPayment };
      }

      const updatedPayment = await paymentRepository.updatePayment(existingPayment.toString(), {
        status: 'captured',
        ...updatePayload,
      });

      await updatedPayment.save({ session });

      await orderRepository.updateOrder(orderId!, { status: 'paid' }, { session });

      if (order.table) {
        await tableRepository.updateTable(
          order.table.toString(),
          { status: 'available', currentOrder: null },
          { session },
        );
      }

      await session.commitTransaction();
      return { code: 200, message: 'Thanh toán thành công', data: existingPayment };
    } catch (error) {
      console.error('Lỗi xử lý callback VNPay:', error);
      await session.abortTransaction();
      return { code: 500, message: 'Lỗi hệ thống khi xử lý callback' };
    } finally {
      await session.endSession();
    }
  }

  async updateMethodPaymentService(
    paymentId: string,
    method: IPayment['method'],
  ): Promise<ServiceResponse<IPaymentDocument>> {
    try {
      const existingPayment = await paymentRepository.updatePayment(paymentId, { method: method });
      if (!existingPayment) {
        return { code: 404, message: 'Không tìm thấy thông tin thanh toán' };
      }
      return { code: 200, message: 'Cập nhật thông tin thành công', data: existingPayment };
    } catch (error) {
      return { code: 500, message: 'Cập nhật trạng thái thất bại' };
    }
  }
}

export default new PaymentService();
