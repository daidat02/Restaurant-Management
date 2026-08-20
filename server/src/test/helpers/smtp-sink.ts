import type { AddressInfo } from 'node:net';
import { SMTPServer } from 'smtp-server';
import { request, tokenFor } from '../utils.js';

/**
 * SMTP sink dùng chung cho test gửi email.
 * - Lắng nghe 127.0.0.1 port ngẫu nhiên; email.service đọc SMTP config từ
 *   Setting.gateway.smtp (super-admin PUT /settings/gateway) nên chỉ cần trỏ
 *   host=127.0.0.1 + port=sink là pipeline gửi email chạy nguyên vẹn.
 * - Khi NODE_ENV=test (không Redis) → sendEmailAsync chạy INLINE qua handler
 *   email.send → email tới sink ngay trong request/test.
 */

export interface SinkMessage {
  raw: string;
  from: string;
  to: string[];
}

export interface SmtpSink {
  port: number;
  received: SinkMessage[];
  /** Đổ cấu hình SMTP nền tảng trỏ tới sink này (super-admin PUT /settings/gateway). */
  configure: () => Promise<void>;
  close: () => Promise<void>;
}

/** Giải mã body quoted-printable của MIME (nodemailer mã hoá nội dung UTF-8). */
export function decodeQuotedPrintable(input: string): string {
  const qp = input
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_match, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
  // Chuỗi latin-1 → Buffer (mỗi ký tự = 1 byte) → giải mã UTF-8 cho tiếng Việt.
  return Buffer.from(qp, 'latin1').toString('utf8');
}

export async function startSMTPSink(fromEmail = 'no-reply@nhahangos.test'): Promise<SmtpSink> {
  const received: SinkMessage[] = [];
  let port = 0;

  const sink = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS'],
    onAuth(auth, _session, callback) {
      // Chấp nhận mọi credential — sink chỉ kiểm tra pipeline, không xác thực thật.
      callback(null, { user: auth.username });
    },
    onData(stream, session, callback) {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => {
        received.push({
          raw: Buffer.concat(chunks).toString('utf8'),
          from: (session.envelope.mailFrom as { address?: string } | null)?.address ?? '',
          to: session.envelope.rcptTo.map((r) => (r as { address?: string }).address ?? ''),
        });
        callback();
      });
    },
  });
  sink.on('error', (err) => console.error('[smtp-sink] error:', err));

  await new Promise<void>((resolve, reject) => {
    sink.listen(0, '127.0.0.1', () => {
      const addr = sink.server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Không lấy được port của SMTP sink'));
        return;
      }
      port = (addr as AddressInfo).port;
      resolve();
    });
    sink.once('error', reject);
  });

  const configure = async (): Promise<void> => {
    const res = await request
      .put('/api/settings/gateway')
      .set('Authorization', `Bearer ${tokenFor('super-admin')}`)
      .send({
        smtp: {
          host: '127.0.0.1',
          port,
          secure: false,
          user: 'test-smtp-user',
          pass: 'test-smtp-pass',
          fromName: 'NhaHang OS Test',
          fromEmail,
        },
      });
    if (res.status !== 200) {
      throw new Error(`Không cấu hình được SMTP sink: ${res.status} ${JSON.stringify(res.body)}`);
    }
  };

  const close = (): Promise<void> =>
    new Promise<void>((resolve) => sink.close(() => resolve()));

  return { port, received, configure, close };
}