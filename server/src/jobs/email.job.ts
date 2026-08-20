import { registerJobHandler } from './handlers.js';
import { sendEmailNow, type SendEmailPayload } from '../services/email.service.js';

/**
 * ==========================================
 * JOB: email.send (queue email)
 * ==========================================
 * Handler DUY NHẤT cho mọi email giao dịch:
 *   - payload: { template, to, data, subject? }.
 *   - Được enqueue từ email.service.sendEmailAsync (subscription/auth triggers).
 *   - Redis down → addJob chạy inline CÙNG handler này (giống các job khác).
 */

const emailSend = async (payload: SendEmailPayload): Promise<void> => {
  await sendEmailNow(payload);
};

registerJobHandler('email.send', emailSend);

export default emailSend;