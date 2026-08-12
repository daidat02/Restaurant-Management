import DB_Connection from '../models/DB_Connection.js';

/**
 * Sinh mã giao dịch dãy số duy nhất (yyyyMMdd + số tăng dần 6 chữ số).
 * Dùng chung cho mọi nơi tạo Transaction (mock, PayOS, VNPay, tạo nhà hàng).
 */
export async function generateTransactionId(): Promise<string> {
  const prefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const last = await DB_Connection.Transaction.findOne({
    transactionId: new RegExp(`^${prefix}`),
  })
    .select('transactionId')
    .sort({ transactionId: -1 })
    .lean<{ transactionId?: string }>();
  const seq = last?.transactionId ? Number(last.transactionId.slice(8)) + 1 : 1;
  return `${prefix}${String(seq).padStart(6, '0')}`;
}
