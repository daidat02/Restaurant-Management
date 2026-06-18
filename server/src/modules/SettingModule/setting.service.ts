import { encryptKey } from '../../configs/constants.js';
import type {
  IBankAccountConfig,
  IPayOSConfig,
  ISetting,
  IThirdPartyIntegration,
} from '../../models/Schema/SettingSchema.js';
import type { ServiceResponse } from '../../shared/type.js';
import settingRepository from './setting.repository.js';

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
    scope: 'admin' | 'restaurant',
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
}

export default SettingService;
