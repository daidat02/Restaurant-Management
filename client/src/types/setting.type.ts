import type { IRestaurant } from './restaurant.type';
import type { IUser } from './user.type';

export interface ITableConfig {
  autoCleanAfterCheckout: boolean;
  allowReservationBufferMinutes: number;
}

export interface IMenuConfig {
  allowToGo: boolean;
  autoHideOut: boolean;
}

export interface IReceiptConfig {
  // --- Khối Thuế & Phí (Cũ) ---
  vat: number;
  serviceFee: number;
  deleveryFee: number;
  footerText: string;

  // --- Khối Tự động hóa & In ấn (Mới thêm) ---
  autoPrintOnCheckout: boolean; // Tự động in hóa đơn khi thanh toán
  autoPrintToKitchen: boolean;
  printCount: number; // Số lượng bản in hóa đơn (Mặc định: 1)
  paperSize: '80mm' | '58mm';

  showLogo: boolean;
  showStaffName: boolean;
  showWifiInfo: boolean;
  wifiName?: string;
  wifiPassword?: string;
}

export interface IBankAccountConfig {
  bankName: string;
  accountNumber: string;
  accountName: string;
  bin: string;
  fixedQrUrl?: string;
}

export interface IPayOSConfig {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  hasApiKey: string;
  hasChecksumKey: string;
}

export interface IThirdPartyIntegration {
  payOS?: IPayOSConfig;
  googleMapsApiKey?: string;
  viberOrSmsApiKey?: string;
}
export interface ISystemConfig {
  autoPushKDS: boolean;
  maintenanceMode: boolean;
  requireOtpForVoid: boolean;
}

// INTERFACE CHÍNH CHO SETTING
export interface ISetting {
  _id?: string;
  scope: 'admin' | 'restaurant';
  targetModel: 'User' | 'Restaurant';
  targetId: string | IUser | IRestaurant;

  paymentMethodType: 'none' | 'bank_transfer' | 'payos';

  // Các khối dữ liệu cấu hình
  integrations?: IThirdPartyIntegration;
  bankAccount?: IBankAccountConfig;
  tableConfig: ITableConfig;
  menuConfig?: IMenuConfig;
  receiptConfig?: IReceiptConfig;
  payOSConfig?: IPayOSConfig;
  systemConfig?: ISystemConfig;

  createdAt?: Date;
  updatedAt?: Date;
}
