/**
 * ==========================================
 * EMAIL TEMPLATE REGISTRY
 * ==========================================
 * Mỗi template email khai báo TÊN (key) + subject (Handlebars, override được qua payload)
 * + file .hbs tương ứng trong `src/templates/email/`.
 *
 * Thêm template mới = thêm 1 file .hbs + 1 dòng ở đây (việc của dev, theo version control).
 * Subject là Handlebars nhỏ (vd: "Gia hạn gói {{planName}}").
 */

export type EmailTemplateKey =
  | 'test'
  | 'subscription-receipt'
  | 'subscription-expiring'
  | 'subscription-downgraded'
  | 'account-created'
  | 'reset-password'
  | 'otp-verification';

export interface EmailTemplateDef {
  key: EmailTemplateKey;
  /** Subject mặc định — có thể là Handlebars với data truyền vào. */
  subject: string;
  /** Tên file .hbs trong thư mục templates/email. */
  file: string;
}

export const EMAIL_TEMPLATES: Record<EmailTemplateKey, EmailTemplateDef> = {
  test: {
    key: 'test',
    subject: 'Kiểm tra cấu hình email SMTP — NhaHang OS',
    file: 'test.hbs',
  },
  'subscription-receipt': {
    key: 'subscription-receipt',
    subject: 'Biên lai thanh toán gói {{planName}} — NhaHang OS',
    file: 'subscription-receipt.hbs',
  },
  'subscription-expiring': {
    key: 'subscription-expiring',
    subject: 'Gói dịch vụ sắp hết hạn — NhaHang OS',
    file: 'subscription-expiring.hbs',
  },
  'subscription-downgraded': {
    key: 'subscription-downgraded',
    subject: 'Gói dịch vụ đã được hạ cấp — NhaHang OS',
    file: 'subscription-downgraded.hbs',
  },
  'account-created': {
    key: 'account-created',
    subject: 'Tài khoản của bạn đã được tạo — NhaHang OS',
    file: 'account-created.hbs',
  },
  'reset-password': {
    key: 'reset-password',
    subject: 'Đặt lại mật khẩu — NhaHang OS',
    file: 'reset-password.hbs',
  },
  'otp-verification': {
    key: 'otp-verification',
    subject: 'Mã xác thực đăng ký — NhaHang OS',
    file: 'otp-verification.hbs',
  },
};

export const EMAIL_TEMPLATE_KEYS = Object.keys(EMAIL_TEMPLATES) as EmailTemplateKey[];