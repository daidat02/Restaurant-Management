import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { decryptKey } from '../configs/constants.js';
import { EMAIL_TEMPLATES, type EmailTemplateKey } from './email-templates.js';
import settingRepository from '../modules/SettingModule/setting.repository.js';
import { QUEUE_NAMES } from '../queues/queue.js';
import { addJob } from '../jobs/handlers.js';

// Client Resend tạo LAZY — ESM hoist các import lên trước dotenv.config() trong
// server bootstrap, nên constructor tại module-load sẽ thấy env rỗng và crash app
// khi RESEND_API_KEY chưa có (dev/E2E không cần email thật).
let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

/**
 * ==========================================
 * EMAIL SERVICE (GỬI EMAIL QUA SMTP)
 * ==========================================
 * - Đọc cấu hình SMTP từ Setting.gateway.smtp (scope='platform', super-admin cấu hình).
 * - Render Handlebars (layout chung + template theo registry) rồi gửi qua nodemailer.
 * - sendEmailAsync → enqueue BullMQ queue 'email' (job 'email.send'); Redis không ready
 *   → addJob chạy INLINE cùng handler (jobs/email.job.ts) — luồng chính không bao giờ bị đợi.
 * - SMTP chưa cấu hình → log + bỏ qua (không crash, không retry vô nghĩa).
 */

const TEMPLATE_DIR = fileURLToPath(new URL('../templates/email/', import.meta.url));
const templateCache = new Map<string, Handlebars.TemplateDelegate>();

function loadTemplate(file: string): Handlebars.TemplateDelegate {
  let fn = templateCache.get(file);
  if (!fn) {
    const source = fs.readFileSync(path.join(TEMPLATE_DIR, file), 'utf8');
    fn = Handlebars.compile(source);
    templateCache.set(file, fn);
  }
  return fn;
}

/** Cấu hình SMTP đã giải mã pass (chỉ dùng nội bộ server, KHÔNG trả về client). */
export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

/** Đọc cấu hình SMTP từ DB. Chưa cấu hình host/fromEmail → null. */
export async function getSMTPConfig(): Promise<SMTPConfig | null> {
  // const setting = await settingRepository.findGatewaySetting();
  // const smtp = setting?.gateway?.smtp;
  // if (!smtp?.host || !smtp?.fromEmail) return null;
  // return {
  //   host: smtp.host || 'smtp.gmail.com',
  //   port: smtp.port || 587,
  //   secure: smtp.secure === true,
  //   user: smtp.user || '',
  //   pass: decryptKey(smtp.pass || ''),
  //   fromName: smtp.fromName || 'NhaHangOS',
  //   fromEmail: smtp.fromEmail || 'daidat1202@gmail.com',
  // };

  return {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '') || 587,
    secure: (parseInt(process.env.EMAIL_PORT || '') || 587) === 465,
    user: process.env.EMAIL_USER || 'nhahangos.suport@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'kjef mccv edpt fvev',
    fromName: process.env.EMAIL_FROM_NAME || 'NhaHang OS',
    fromEmail: process.env.EMAIL_FROM_ADDRESS || 'nhahangos.suport@gmail.com',
  };
}

export interface RenderResult {
  subject: string;
  html: string;
}

/** Render email: subject (Handlebars, override qua payload) + layout chung chứa body template. */
export function renderEmail(
  template: EmailTemplateKey,
  data: Record<string, unknown>,
  subjectOverride?: string,
): RenderResult {
  const def = EMAIL_TEMPLATES[template];
  if (!def) {
    throw new Error(`Template email không tồn tại: ${template}`);
  }
  const subjectText = Handlebars.compile(subjectOverride ?? def.subject)(data);
  const layout = loadTemplate('layout.hbs');
  const body = loadTemplate(def.file)(data);
  const html = layout({ subject: subjectText, body });
  return { subject: subjectText, html };
}

export interface SendEmailPayload {
  template: EmailTemplateKey;
  to: string | string[];
  data: Record<string, unknown>;
  subject?: string;
}

/** Gửi email NGAY (đồng bộ) qua SMTP đã cấu hình. Lỗi SMTP → throw (caller tự xử lý). */
// export async function sendEmailNow(payload: SendEmailPayload): Promise<void> {
//   const config = await getSMTPConfig();
//   const recipients = Array.isArray(payload.to) ? payload.to.join(', ') : payload.to;
//   if (!config) {
//     console.warn(
//       `[Email] SMTP chưa cấu hình — bỏ qua gửi "${payload.template}" tới ${recipients}.`,
//     );
//     return;
//   }

//   const { subject, html } = renderEmail(payload.template, payload.data, payload.subject);

//   const transport = nodemailer.createTransport({
//     host: config.host,
//     port: config.port,
//     secure: config.secure,
//     ...(config.user ? { auth: { user: config.user, pass: config.pass } } : {}),
//     connectionTimeout: 10000,
//   });

//   try {
//     const info = await transport.sendMail({
//       from: `"${config.fromName}" <${config.fromEmail}>`,
//       to: recipients,
//       subject,
//       html,
//     });
//     console.log(
//       `[Email] Đã gửi "${payload.template}" → ${info.envelope?.to?.join(', ') ?? recipients} (${info.messageId})`,
//     );
//   } catch (error) {
//     console.error(`[Email] Lỗi khi gửi "${payload.template}" → ${recipients}:`, error);
//     throw error;
//   } finally {
//     transport.close();
//   }
// }

export async function sendEmailNow(payload: SendEmailPayload): Promise<void> {
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const { subject, html } = renderEmail(payload.template, payload.data, payload.subject);

  try {
    const { data, error } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || 'NhaHangOS <onboarding@resend.dev>', // Email gửi
      to: recipients,
      subject,
      html,
    });

    if (error) {
      throw new Error(`Resend API Error: ${error.message}`);
    }

    console.log(`[Email] Đã gửi "${payload.template}" → ${recipients.join(', ')} (${data?.id})`);
  } catch (error) {
    console.error(`[Email] Lỗi khi gửi "${payload.template}" → ${recipients.join(', ')}:`, error);
    throw error; // Ném lỗi cho BullMQ retry
  }
}

/** Gửi email qua queue 'email' (retry độc lập, không chặn luồng chính). */
export async function sendEmailAsync(payload: SendEmailPayload): Promise<void> {
  await addJob(QUEUE_NAMES.email, 'email.send', payload);
}
