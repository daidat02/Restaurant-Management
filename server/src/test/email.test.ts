import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request, tokenFor } from './utils.js';
import {
  startSMTPSink,
  decodeQuotedPrintable,
  type SmtpSink,
} from './helpers/smtp-sink.js';
import { renderEmail, sendEmailAsync } from '../services/email.service.js';
import '../jobs/index.js';

/**
 * Test gửi email thật qua SMTP sink (smtp-server) — không cần provider ngoài.
 */

let sink: SmtpSink;

const superAdmin = () => tokenFor('super-admin');

beforeAll(async () => {
  sink = await startSMTPSink();
  await sink.configure();
});

afterAll(async () => {
  await sink.close();
});

describe('Email — render template (unit)', () => {
  it('renderEmail: subject từ registry + layout chứa body', () => {
    const { subject, html } = renderEmail('test', {
      host: 'smtp.example.com',
      port: 587,
      user: 'u',
      fromEmail: 'no-reply@nhamnhi.vn',
    });
    expect(subject).toContain('Kiểm tra cấu hình email');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('smtp.example.com');
    expect(html).toContain('NhamNhi');
  });

  it('renderEmail: subject override qua payload', () => {
    const { subject } = renderEmail(
      'reset-password',
      { name: 'Test', resetUrl: 'https://x/reset/token' },
      'Mật khẩu của bạn đã được đặt lại',
    );
    expect(subject).toBe('Mật khẩu của bạn đã được đặt lại');
  });

  it('renderEmail: dữ liệu được escape (chống HTML injection)', () => {
    const { html } = renderEmail('reset-password', {
      name: '<script>alert(1)</script>',
      resetUrl: 'https://x',
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });
});

describe('Email — gửi qua SMTP sink', () => {
  it('POST /settings/gateway/test-email — super-admin gửi email thử → sink nhận đúng', async () => {
    const res = await request
      .post('/api/settings/gateway/test-email')
      .set('Authorization', `Bearer ${superAdmin()}`)
      .send({ to: 'recipient@example.com' });
    expect(res.status).toBe(200);

    expect(sink.received.length).toBe(1);
    const msg = sink.received[0]!;
    expect(msg.from).toBe('no-reply@nhamnhi.test');
    expect(msg.to).toContain('recipient@example.com');
    const decoded = decodeQuotedPrintable(msg.raw);
    expect(decoded).toContain('Email thử nghiệm SMTP');
    expect(decoded).toContain('127.0.0.1');
  });

  it('POST /settings/gateway/test-email — thiếu email → 400', async () => {
    const res = await request
      .post('/api/settings/gateway/test-email')
      .set('Authorization', `Bearer ${superAdmin()}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('sendEmailAsync qua queue inline (Redis không ready) — sink nhận email', async () => {
    await sendEmailAsync({
      template: 'reset-password',
      to: 'staff@example.com',
      data: { name: 'Nhân viên', resetUrl: 'https://app/reset-password/abc123' },
    });
    expect(sink.received.length).toBe(2);
    const msg = sink.received[1]!;
    expect(msg.to).toContain('staff@example.com');
    const decoded = decodeQuotedPrintable(msg.raw);
    expect(decoded).toContain('Đặt lại mật khẩu');
    expect(decoded).toContain('https://app/reset-password/abc123');
  });

  it('admin không gọi được /settings/gateway/test-email → 403', async () => {
    const adminToken = tokenFor('admin', '69fccba996a14809070b9ef2');
    const res = await request
      .post('/api/settings/gateway/test-email')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ to: 'a@example.com' });
    expect(res.status).toBe(403);
  });
});