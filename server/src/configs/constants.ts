export const generateId = (): string => {
  const now = new Date();

  // 1. Format Ngày (DDMMYY)
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2); // Lấy 2 số cuối của năm (vd 2026 -> 26)

  // 2. Format Thời gian (HHMMSS)
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');

  // 3. ID phụ (Chống trùng lặp)
  // Lấy 2-3 số ngẫu nhiên (hoặc milliseconds) ghép vào cuối để
  // đảm bảo nếu có 2 nhân viên bấm "Tạo đơn" cùng 1 giây thì mã vẫn khác nhau
  const randomId = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, '0');
  // Nếu muốn dùng milliseconds thay vì random: const msId = String(now.getMilliseconds()).padStart(3, '0');

  // Ghép lại thành format hoàn chỉnh
  return `${dd}${mm}${yy}-${hh}${min}${ss}${randomId}`;
};

import * as crypto from 'crypto';

// Thuật toán mã hóa đối xứng
const ALGORITHM = 'aes-256-cbc';

// Secret Key dài đúng 32 ký tự (Lưu trong file .env, TUYỆT ĐỐI không được làm mất key này nếu không sẽ không giải mã được dữ liệu cũ)
const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET_KEY || 'abcdefghijklmnopqrstuvwxyz123456';

// Cụm vector khởi tạo dài 16 ký tự
const IV_LENGTH = 16;

/**
 * Hàm mã hóa chuỗi chữ thường thành chuỗi bảo mật để lưu Database
 */
export function encryptKey(text: string): string {
  if (!text || text.includes('••••')) return text; // Nếu là chuỗi ẩn cũ thì bỏ qua

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Trả về chuỗi dạng: iv_hex:encrypted_hex để lúc giải mã lấy lại được IV
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Hàm giải mã chuỗi từ Database ngược lại thành Key thật để sử dụng
 */
export function decryptKey(text: string): string {
  if (!text || !text.includes(':')) return text; // Nếu không đúng cấu trúc mã hóa thì trả về gốc

  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch (error) {
    console.error('Lỗi giải mã Key:', error);
    return '';
  }
}
