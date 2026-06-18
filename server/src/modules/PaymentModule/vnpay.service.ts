import qs from "qs";
import crypto from "crypto";
import type { IOrderDocument } from "../../models/Schema/OrderSchema.js";
import dotenv from "dotenv";
import moment from "moment";
import type { ServiceResponse } from "../../shared/type.js";
import type { IPayment } from "../../models/Schema/PaymentSchema.js";
import mongoose from "mongoose";
dotenv.config();

const CONFIG = {
  vnp_TmnCode: process.env.VNP_TMNCODE || "",
  vnp_HashSecret: process.env.VNP_HASHSECRET_KEY || "",
  vnp_Url: process.env.VNP_URL || "",
  vnp_ReturnUrl: process.env.VNP_RETURN_URL || "",
};

/**
 * Tạo số ngẫu nhiên với độ dài xác định
 */
function generateRandomNumber(length: number): number {
  return Math.floor(Math.random() * Math.pow(10, length));
}

/**
 * Format ngày giờ theo định dạng yyyyMMddHHmmss
 */
function formatDateTime(): string {
  const now = new Date();
  const date = moment(now).format('YYYYMMDDHHmmss')
  return date;
}

/**
 * Sắp xếp object theo key
 */
function sortObject(obj: VnpParams): Record<string, string> {
  const sorted: Record<string, string> = {};
  const str = Object.keys(obj).filter(key => obj[key as keyof VnpParams] !== undefined);
  str.sort();
  for (const key of str) {
    const value = obj[key as keyof VnpParams];
    sorted[key] = encodeURIComponent(value as string | number).replace(/%20/g, "+");
  }
  return sorted;
}

interface VnpParams {
  vnp_Version: string;
  vnp_Command: string;
  vnp_TmnCode: string;
  vnp_Locale: string;
  vnp_CurrCode: string;
  vnp_TxnRef: string;
  vnp_OrderInfo: string;
  vnp_OrderType: string;
  vnp_Amount: number;
  vnp_IpAddr: string;
  vnp_CreateDate: string;
  vnp_ReturnUrl?: string;
  vnp_SecureHash?:string
}

interface VnpResponse{
  responseCode:string,
  txnRef:string,
  bankCode:string
  vnp_TransactionNo:string
  
}
class VNPayService {

  async createPaymentUrl(
    order: IOrderDocument,
    ipAddr = "127.0.0.1",
    bankCode?: string
  ): Promise<string> {
    if (!CONFIG.vnp_TmnCode || !CONFIG.vnp_HashSecret || !CONFIG.vnp_Url || !CONFIG.vnp_ReturnUrl) {
      throw new Error("Thiếu cấu hình VNPay trong biến môi trường");
    }

    if (!order || !order._id || !order.totalAmount || order.totalAmount <= 0) {
      throw new Error("Thông tin đơn hàng không hợp lệ");
    }

    const dateFormat = formatDateTime();
    const tmnCode = CONFIG.vnp_TmnCode;
    const secretKey = CONFIG.vnp_HashSecret;
    const amount = Math.round(order.totalAmount * 100);
    const orderInfo = `Thanh toan don hang ${order._id}`;
    const returnUrl = CONFIG.vnp_ReturnUrl;
    const orderType = "other";
    const txnRef = `${dateFormat}-${generateRandomNumber(4)}-${order._id}`;

    const vnpParams: VnpParams = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: orderType,
      vnp_Amount: amount,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: dateFormat,
      vnp_ReturnUrl: returnUrl,
    };

    // Sắp xếp các tham số theo thứ tự a-z
    const sortedVnpParams = sortObject(vnpParams);

    // Tạo chuỗi ký tự cần ký
    const signData = qs.stringify(sortedVnpParams, { encode: false });

    // Tạo chữ ký
    const hmac = crypto.createHmac("sha512", secretKey);
    const secureHash = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    // Thêm chữ ký vào URL
    let paymentUrl = `${CONFIG.vnp_Url}?${qs.stringify(sortedVnpParams, { encode: false })}`;
    paymentUrl += `&vnp_SecureHash=${secureHash}`;

    return paymentUrl;
  }

  async returnUrl(vnpParams: any): Promise<VnpResponse> {

    const secureHash = vnpParams['vnp_SecureHash'];
    delete vnpParams['vnp_SecureHash'];

    // Sắp xếp các tham số theo thứ tự a-z
    const sortedVnpParams = sortObject(vnpParams);
    const signData = qs.stringify(sortedVnpParams, { encode: false });

    // Tạo chữ ký
    const hmac = crypto.createHmac("sha512", CONFIG.vnp_HashSecret);
    const checksum = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

    if (checksum === secureHash) {
      const responseCode = vnpParams.vnp_ResponseCode;
      const txnRef = vnpParams.vnp_TxnRef;
      const bankCode = vnpParams.vnp_BankCode || "UNKNOWN";
      const vnp_TransactionNo = vnpParams.vnp_TransactionNo // Xử lý trường hợp bankCode không có

      return {
        responseCode,
        txnRef,
        bankCode,
        vnp_TransactionNo
      };
    } else {
      throw new Error("Checksum không khớp");
    }
  }

}

export default new VNPayService();