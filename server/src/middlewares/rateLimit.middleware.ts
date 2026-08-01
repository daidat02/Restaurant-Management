import { rateLimit, type Options } from 'express-rate-limit';

/** Có bật rate limiting không? Tắt khi NODE_ENV=test hoặc RATE_LIMIT_ENABLED='false'. */
const rateLimitEnabled = (): boolean => {
  if (process.env.NODE_ENV === 'test') return false;
  if (process.env.RATE_LIMIT_ENABLED === 'false') return false;
  return true;
};

const handler: Options['handler'] = (req, res) => {
  res.status(429).json({ message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' });
};

/**
 * Rate limit chung cho endpoint public.
 * Khi test (NODE_ENV=test) hoặc RATE_LIMIT_ENABLED='false' → no-op (skip).
 */
export const publicRateLimit = (max = 100, windowMs = 60 * 1000) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    handler,
    skip: () => !rateLimitEnabled(),
  });

/** Rate limit mạnh cho login/register/refresh — chống brute-force tài khoản. */
export const authRateLimit = publicRateLimit(20, 15 * 60 * 1000);

/** Rate limit mạnh cho xác thực mã nhà bếp (KDS) — chống brute mã. */
export const kdsVerifyRateLimit = publicRateLimit(10, 5 * 60 * 1000);

/** Rate limit cho payment webhook/return — cần linh hoạt vì provider gọi nhiều. */
export const paymentWebhookRateLimit = publicRateLimit(50, 60 * 1000);

/** Rate limit cho tạo đơn public (khách tại bàn / delivery). */
export const orderCreateRateLimit = publicRateLimit(60, 60 * 1000);

/** Rate limit cho menu public (đọc nhiều, nhưng chống scan). */
export const menuReadRateLimit = publicRateLimit(300, 60 * 1000);
