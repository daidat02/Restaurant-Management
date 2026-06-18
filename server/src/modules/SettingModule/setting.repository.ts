import DB_Connection from '../../models/DB_Connection.js'; // Giả định import kết nối chung của bạn
import type { ISetting, ISettingDocument } from '../../models/Schema/SettingSchema.js'; // Import interface hoặc loại document của bạn
import type { ClientSession, FilterQuery } from 'mongoose';

class SettingRepository {
  // ==========================================
  // I. CORE CRUD (Cơ bản cho Setting)
  // ==========================================

  /**
   * Tạo mới một bản ghi cấu hình cài đặt cho hệ thống hoặc nhà hàng
   */
  async createSetting(
    settingData: Partial<ISetting>,
    options?: { session?: ClientSession },
  ): Promise<ISetting> {
    const setting = new DB_Connection.Setting({ ...settingData });
    return await setting.save({ session: options?.session });
  }

  /**
   * Tìm nhanh cấu hình cài đặt bằng Cấu hình ID
   */
  async findSettingById(id: string): Promise<ISetting | null> {
    return await DB_Connection.Setting.findById(id)
      .select('+integrations.payOS.apiKey +integrations.payOS.checksumKey')
      .exec();
  }

  /**
   * Cập nhật thông tin cấu hình (Phương thức thanh toán, in ấn, tham số hệ thống...)
   */
  async updateSetting(
    id: string,
    settingData: Partial<ISetting>,
    options?: { session?: ClientSession },
  ): Promise<ISetting | null> {
    return await DB_Connection.Setting.findByIdAndUpdate(id, settingData, {
      new: true,
      session: options?.session ?? null,
    }).exec();
  }

  async deleteSetting(id: string): Promise<ISetting | null> {
    return await DB_Connection.Setting.findByIdAndDelete(id).exec();
  }

  // ==========================================
  // II. QUERIES ĐẶC THÙ (Business Logic)
  // ==========================================

  /**
   * Hàm Query linh hoạt: Lấy danh sách cấu hình theo mọi bộ lọc (Filter)
   */
  async findSettings(filter: FilterQuery<ISetting>): Promise<ISettingDocument[]> {
    return await DB_Connection.Setting.find(filter)
      .populate([
        {
          path: 'targetId',
        },
      ])
      .sort({ createdAt: -1 })
      .select('+integrations.payOS.apiKey +integrations.payOS.checksumKey')
      .exec();
  }

  async findPayOSSettingById(id: string): Promise<Partial<ISetting> | null> {
    // Thêm <ISetting | null> vào ngay sau findById
    return await DB_Connection.Setting.findOne<ISetting | null>({
      scope: 'restaurant',
      targetId: id,
    })
      .select('integrations.payOS')
      .lean();
  }
  /**
   * Lấy nhanh hoặc Khởi tạo duy nhất một bản ghi cấu hình theo Phạm vi (scope) và Đối tượng (targetId)
   * Sử dụng cơ chế Upsert để phòng ngừa lỗi trùng lặp Index hỗn hợp { scope, targetId }
   */
  async getOrCreateSetting(
    scope: 'admin' | 'restaurant',
    targetModel: string,
    targetId: string,
    options?: { session?: ClientSession },
  ): Promise<ISetting> {
    return await DB_Connection.Setting.findOneAndUpdate(
      { scope, targetId, targetModel },
      {
        $setOnInsert: {
          paymentMethodType: 'none',
          tableConfig: { autoCleanAfterCheckout: true, allowReservationBufferMinutes: 15 },
          menuConfig: { allowToGo: true, autoHideOut: false },
          receiptConfig: {
            vat: 10,
            serviceFee: 0,
            deleveryFee: 0,
            footerText: 'Cảm ơn quý khách đã dùng bữa! Hẹn gặp lại!',
            autoPrintOnCheckout: false,
            autoPrintToKitchen: true,
            printCount: 1,
            paperSize: '80mm',
            showLogo: true,
            showStaffName: true,
            showWifiInfo: false,
          },
          systemConfig: { autoPushKDS: true, maintenanceMode: false, requireOtpForVoid: true },
        },
      },
      {
        new: true,
        upsert: true, // Nếu chưa có cấu hình sẽ tự động tạo mới theo block mặc định ở trên
        session: options?.session ?? null,
      },
    ).exec();
  }
}

export default new SettingRepository();
