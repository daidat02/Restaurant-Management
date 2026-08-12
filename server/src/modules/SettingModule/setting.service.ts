import { encryptKey } from '../../configs/constants.js';
import jwt from 'jsonwebtoken';
import type {
  IBankAccountConfig,
  IGatewaySanitized,
  IPayOSConfig,
  ISetting,
  ISettingDocument,
  IThirdPartyIntegration,
} from '../../models/Schema/SettingSchema.js';
import type { ServiceResponse } from '../../shared/type.js';
import settingRepository, { PLATFORM_GATEWAY_TARGET_ID } from './setting.repository.js';

/** Chuỗi ẩn mà frontend gửi ngược lại khi người dùng không nhập key mới */
const MASKED_KEY = '••••••••••••••••';

class SettingService {
  /**
   * Tạo mới một bản ghi cấu hình cài đặt
   */
  async createSettingService(settingData: any): Promise<ServiceResponse<ISetting>> {
    // Kiểm tra xem cấu hình cho đối tượng này đã tồn tại chưa để tránh trùng lạp Index hỗn hợp
    const existingSetting = await settingRepository.findSettings({
      scope: settingData.scope,
      targetId: settingData.targetId,
    });

    if (existingSetting && existingSetting.length > 0) {
      return { code: 400, message: 'Cấu hình cài đặt cho đối tượng này đã tồn tại' };
    }

    const newSetting = await settingRepository.createSetting(settingData);
    return { code: 201, message: 'Khởi tạo cấu hình cài đặt thành công', data: newSetting };
  }

  /**
   * Tìm cấu hình theo ID bản ghi
   */
  async findSettingByRestaurantIdService(restaurantId: string): Promise<ServiceResponse<ISetting>> {
    if (!restaurantId) {
      return { code: 400, message: 'Thiếu thông tin ID nhà hàng' };
    }

    const settings = await settingRepository.findSettings({ targetId: restaurantId });
    if (!settings || settings.length === 0) {
      return { code: 404, message: 'Nhà hàng chưa có cấu hình cài đặt nào' };
    }
    // Chuyển sang object thuần để gán cờ ảo cho Frontend (Theo Cách 1 ở câu trả lời trước)
    const settingObject = settings[0]?.toObject() as any;

    if (settingObject.integrations?.payOS) {
      settingObject.integrations.payOS.hasApiKey = !!settingObject.integrations.payOS.apiKey;
      settingObject.integrations.payOS.hasChecksumKey =
        !!settingObject.integrations.payOS.checksumKey;

      delete settingObject.integrations.payOS.apiKey;
      delete settingObject.integrations.payOS.checksumKey;
    }
    return {
      code: 200,
      message: 'Lấy thông tin cấu hình nhà hàng thành công',
      data: settingObject,
    };
  }

  async updateSettingService(
    id: string,
    settingData: Partial<ISetting>,
  ): Promise<ServiceResponse<ISetting>> {
    // 1. Lấy dữ liệu cũ từ DB làm gốc để đối chiếu và bù Key cũ
    const existingSetting = await settingRepository.findSettingById(id);
    if (!existingSetting) {
      return { code: 404, message: 'Cấu hình cài đặt không tồn tại' };
    }

    const updatedSetting = await settingRepository.updateSetting(id, settingData);

    return {
      code: 200,
      message: 'Cập nhật thông tin cấu hình thành công',
      data: updatedSetting as ISetting,
    };
  }

  async deleteSettingService(id: string): Promise<ServiceResponse<null>> {
    const existingSetting = await settingRepository.findSettingById(id);
    if (!existingSetting) {
      return { code: 404, message: 'Cấu hình cài đặt không tồn tại' };
    }
    await settingRepository.deleteSetting(id);
    return { code: 200, message: 'Xóa cấu hình cài đặt thành công' };
  }

  async getOrCreateSettingService(
    scope: 'admin' | 'restaurant' | 'platform',
    targetModel: 'User' | 'Restaurant',
    targetId: string,
  ): Promise<ServiceResponse<ISetting>> {
    if (!targetId) {
      return { code: 400, message: 'Thiếu thông tin ID đối tượng đích (targetId)' };
    }

    const setting = await settingRepository.getOrCreateSetting(scope, targetModel, targetId);
    console.log(setting);
    return { code: 200, message: 'Tải thông tin cấu hình cài đặt thành công', data: setting };
  }

  async updatePaymentMethodTypeService(
    id: string,
    paymentMethodType: ISetting['paymentMethodType'],
    payload: ISetting,
  ): Promise<ServiceResponse<ISetting>> {
    // 1. Kiểm tra cấu hình tồn tại
    const existingSetting = await settingRepository.findSettingById(id);
    if (!existingSetting) {
      return { code: 404, message: 'Cấu hình cài đặt không tồn tại' };
    }

    // Khởi tạo object để update vào DB
    const configData: any = {
      paymentMethodType,
    };

    // 2. Phân loại cấu hình và dọn dẹp dữ liệu cũ
    if (paymentMethodType === 'bank_transfer') {
      const bankPayload = payload.bankAccount as IBankAccountConfig;

      // Tự sinh QR tĩnh cố định
      const fixedQrUrl = `https://img.vietqr.io/image/${bankPayload.bin}-${bankPayload.accountNumber}-compact.png?accountName=${encodeURIComponent(bankPayload.accountName)}`;

      configData.bankAccount = {
        ...bankPayload,
        fixedQrUrl,
      };
      // Xóa rác bên tích hợp bên thứ 3 (nếu có)
      configData.integrations = null;
    } else {
      const integrationsPayload = payload.integrations as IThirdPartyIntegration;
      const payOSData = integrationsPayload?.payOS;

      if (!payOSData?.apiKey || !payOSData?.checksumKey || !payOSData?.clientId) {
        return { code: 400, message: 'Dữ liệu tích hợp PayOS không hợp lệ hoặc thiếu Key' };
      }

      const finalApiKey = encryptKey(payOSData.apiKey);
      const finalChecksumKey = encryptKey(payOSData.checksumKey);

      configData.integrations = {
        payOS: {
          clientId: payOSData.clientId,
          apiKey: finalApiKey,
          checksumKey: finalChecksumKey,
        },
      };
    }

    const updatedSetting = await settingRepository.updateSetting(id, configData);
    console.log('Dữ liệu payload:', configData);
    return {
      code: 200,
      message: 'Cập nhật phương thức thanh toán và cấu hình thành công',
      data: updatedSetting as ISetting,
    };
  }

  /**
   * Xác thực mã nhà bếp: tìm cấu hình theo mã, tự suy ra nhà hàng và cấp token nhẹ cho màn hình KDS
   */
  async verifyKitchenCodeService(
    code: string,
  ): Promise<ServiceResponse<{ token: string; restaurantId: string; restaurantName: string }>> {
    if (!code || !code.trim()) {
      return { code: 400, message: 'Thiếu mã nhà bếp' };
    }

    const setting = await settingRepository.findSettingByKitchenCode(code.trim());
    if (!setting) {
      return { code: 401, message: 'Mã nhà bếp không hợp lệ' };
    }

    const populatedTarget = setting.targetId as any;
    // Sau khi populate, targetId là document có _id; nếu không populate thì là ObjectId/string
    const restaurantId = (
      populatedTarget?._id?.toString?.() ||
      populatedTarget?.toString?.() ||
      String(populatedTarget)
    ).toString();
    const restaurantName = populatedTarget?.name || 'Nhà hàng';

    // Token KDS (mã nhà bếp): scope='kds' + restaurantId đúng nghĩa, không còn giả làm user thật.
    // Chỉ dùng để join đúng phòng nhà hàng của mã bếp, hết hạn sau 8 giờ
    const token = jwt.sign(
      { _id: restaurantId, restaurantId, role: 'kds', scope: 'kds' },
      process.env.JWT_ACCESS_SECRET || '',
      { expiresIn: '8h' },
    );

    return {
      code: 200,
      message: 'Xác thực mã nhà bếp thành công',
      data: { token, restaurantId, restaurantName },
    };
  }

  /**
   * Tạo mã nhà bếp mới (6 chữ số): tạo mã mới sẽ vô hiệu hóa mã cũ
   */
  async generateKitchenCodeService(
    restaurantId: string,
  ): Promise<ServiceResponse<{ kitchenCode: string }>> {
    if (!restaurantId) {
      return { code: 400, message: 'Thiếu thông tin ID nhà hàng' };
    }

    // Tìm setting theo tenant (scope=restaurant + targetId=restaurantId) thay vì _id
    // vì controller chỉ truyền req.tenantId (không tin params.id từ client)
    const existingSetting = await settingRepository.findSettingByRestaurant(restaurantId);
    if (!existingSetting) {
      return { code: 404, message: 'Cấu hình cài đặt không tồn tại' };
    }
    if (existingSetting.scope !== 'restaurant') {
      return { code: 400, message: 'Mã nhà bếp chỉ áp dụng cho cấu hình nhà hàng' };
    }

    const kitchenCode = String(Math.floor(100000 + Math.random() * 900000));
    const updated = await settingRepository.updateKitchenCode(
      existingSetting._id.toString(),
      kitchenCode,
    );

    return {
      code: 200,
      message: 'Tạo mã nhà bếp thành công',
      data: { kitchenCode: updated?.systemConfig?.kitchenCode || kitchenCode },
    };
  }

  /**
   * Lấy cấu hình cổng thanh toán hệ thống (PayOS + VNPay).
   * Không bao giờ trả key thật — chỉ trả cờ hasApiKey/hasChecksumKey để UI hiển thị trạng thái.
   */
  async getGatewayConfigService(): Promise<ServiceResponse<IGatewaySanitized>> {
    const setting = await settingRepository.findGatewaySetting();
    return {
      code: 200,
      message: 'Lấy cấu hình cổng thanh toán hệ thống thành công',
      data: this.sanitizeGateway(setting),
    };
  }

  /**
   * Lưu cấu hình cổng thanh toán hệ thống (Super Admin).
   * Key mới được mã hóa (encryptKey); key trống/đã ẩn (••••) sẽ giữ nguyên key cũ trong DB.
   */
  async upsertGatewayConfigService(payload: any): Promise<ServiceResponse<IGatewaySanitized>> {
    // 1. Đảm bảo bản ghi platform tồn tại (upsert theo scope='platform' + targetId cố định)
    const setting = await settingRepository.getOrCreateSetting(
      'platform',
      'User',
      PLATFORM_GATEWAY_TARGET_ID,
    );

    // 2. Lấy key cũ (đã mã hóa) để giữ lại khi frontend gửi giá trị ẩn
    const existing = await settingRepository.findGatewaySetting();

    const payos = payload?.payos ?? {};
    const vnpay = payload?.vnpay ?? {};

    const finalPayOSApiKey = this.resolveSecret(payos.apiKey, existing?.gateway?.payos?.apiKey);
    const finalPayOSChecksum = this.resolveSecret(
      payos.checksumKey,
      existing?.gateway?.payos?.checksumKey,
    );
    const finalVNPayApiKey = this.resolveSecret(vnpay.apiKey, existing?.gateway?.vnpay?.apiKey);
    const finalVNPayChecksum = this.resolveSecret(
      vnpay.checksumKey,
      existing?.gateway?.vnpay?.checksumKey,
    );

    const gatewayData: any = {
      gateway: {
        payos: {
          clientId: payos.clientId || '',
          apiKey: finalPayOSApiKey,
          checksumKey: finalPayOSChecksum,
        },
        vnpay: {
          merchant: vnpay.merchant || '',
          accountName: vnpay.accountName || '',
          accountNumber: vnpay.accountNumber || '',
          apiKey: finalVNPayApiKey,
          checksumKey: finalVNPayChecksum,
        },
      },
    };

    const settingId = (setting as ISettingDocument)._id.toString();

    await settingRepository.updateSetting(settingId, gatewayData);

    // Fetch lại (kèm secret) để tính cờ hasApiKey chính xác — response chỉ lộ cờ, không lộ key
    const fresh = await settingRepository.findGatewaySetting();
    return {
      code: 200,
      message: 'Cập nhật cấu hình cổng thanh toán hệ thống thành công',
      data: this.sanitizeGateway(fresh),
    };
  }

  /**
   * Chuẩn hóa cấu hình gateway để trả cho frontend — key nhạy cảm luôn bị che
   */
  private sanitizeGateway(setting: ISetting | null): IGatewaySanitized {
    const g = setting?.gateway;
    return {
      payos: {
        clientId: g?.payos?.clientId || '',
        hasApiKey: !!g?.payos?.apiKey,
        hasChecksumKey: !!g?.payos?.checksumKey,
      },
      vnpay: {
        merchant: g?.vnpay?.merchant || '',
        accountName: g?.vnpay?.accountName || '',
        accountNumber: g?.vnpay?.accountNumber || '',
        hasApiKey: !!g?.vnpay?.apiKey,
        hasChecksumKey: !!g?.vnpay?.checksumKey,
      },
    };
  }

  /**
   * Quyết định giá trị key sẽ lưu:
   * - key mới hợp lệ (khác rỗng, khác chuỗi ẩn) → mã hóa rồi lưu
   * - trống hoặc chuỗi ẩn (••••) → giữ nguyên key cũ đã mã hóa trong DB
   */
  private resolveSecret(incoming: string | undefined, current: string | undefined): string {
    if (incoming && !incoming.includes(MASKED_KEY)) {
      return encryptKey(incoming);
    }
    return current || '';
  }
}

export default SettingService;
