import bcrypt from 'bcrypt';
import { User } from '../models/Schema/UserSchema.js';
import settingRepository, {
  PLATFORM_GATEWAY_TARGET_ID,
} from '../modules/SettingModule/setting.repository.js';

export async function seedSuperAdmin() {
  try {
    const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@nhahangos.me';
    const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdminSecret123!';

    // Kiểm tra xem đã có Super Admin nào chưa (idempotent)
    const existingAdmin = await User.findOne({ role: 'super-admin' });
    if (existingAdmin) {
      console.log('[Seed] Super Admin đã tồn tại. Bỏ qua khởi tạo.');
      return;
    }

    // Hash mật khẩu
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Tạo tài khoản Super Admin mặc định — khớp UserSchema:
    // name (không phải fullName), role 'super-admin' (kebab-case),
    // emailVerified=true để không bị chặn bởi login-gate EMAIL_NOT_VERIFIED.
    await User.create({
      email: adminEmail,
      password: hashedPassword,
      name: 'System Admin',
      role: 'super-admin',
      isActive: true,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    console.log(`[Seed] 🎉 Đã tạo thành công Super Admin: ${adminEmail}`);
  } catch (error) {
    console.error('[Seed] Lỗi khởi tạo Super Admin:', error);
  }
}

/**
 * Đảm bảo bản ghi cấu hình cổng thanh toán nền tảng luôn tồn tại.
 * scope='platform' + targetId cố định (PLATFORM_GATEWAY_TARGET_ID) — đúng cơ chế
 * upsert mà SettingService dùng khi super-admin lưu PayOS/VNPay/SMTP qua UI.
 * Key nhạy cảm để trống, được mã hoá (encryptKey) khi super-admin nhập sau.
 */
export async function seedPlatformSetting() {
  try {
    const setting = await settingRepository.getOrCreateSetting(
      'platform',
      'User',
      PLATFORM_GATEWAY_TARGET_ID,
    );
    console.log(`[Seed] 🧩 Platform gateway setting sẵn sàng (_id=${setting._id}).`);
  } catch (error) {
    console.error('[Seed] Lỗi khởi tạo platform setting:', error);
  }
}
