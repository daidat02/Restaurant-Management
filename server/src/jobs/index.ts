/**
 * ==========================================
 * JOB REGISTRATION (barrel)
 * ==========================================
 * Import side-effect để các job đăng ký handler vào registry (`registerJobHandler`)
 * trước khi:
 *   - worker (queues/workers.ts) chọn handler theo job.name;
 *   - producer fallback inline (jobs/handlers.ts) tìm handler khi Redis down.
 *
 * App import barrel này một lần (VD: trong index.ts cạnh startWorkers()).
 */

import './payment.job.js';
import './notification.job.js';
import './order.job.js';