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

/** Giờ mở cửa theo nhóm ngày (theo preview settings). */
export interface IOperatingHoursByDay {
  /** Thứ 2 – Thứ 6. */
  weekdays: {
    open: string;
    close: string;
  };
  /** Thứ 7 & Chủ nhật. */
  weekend: {
    open: string;
    close: string;
  };
}

export interface IPayOSConfig {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  hasApiKey?: string;
  hasChecksumKey?: string;
}

export interface IThirdPartyIntegration {
  payOS?: IPayOSConfig;
  googleMapsApiKey?: string;
  viberOrSmsApiKey?: string;
}

// --- Cấu hình cổng thanh toán hệ thống (Super Admin) — Ticket 07 ---
export interface IGatewayPayOSConfig {
  clientId: string;
  apiKey: string;
  checksumKey: string;
}

export interface IGatewayVNPayConfig {
  merchant: string;
  accountName: string;
  accountNumber: string;
  apiKey: string;
  checksumKey: string;
}

// Dữ liệu server trả về: key luôn bị ẩn, chỉ có cờ + các trường không nhạy cảm
export interface IGatewaySanitized {
  payos: {
    clientId: string;
    hasApiKey: boolean;
    hasChecksumKey: boolean;
  };
  vnpay: {
    merchant: string;
    accountName: string;
    accountNumber: string;
    hasApiKey: boolean;
    hasChecksumKey: boolean;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    fromName: string;
    fromEmail: string;
    hasPass: boolean;
  };
}

// Payload khi lưu: key rỗng/chuỗi ẩn (••••) để server giữ nguyên key cũ
export interface IGatewayInput {
  payos: {
    clientId: string;
    apiKey: string;
    checksumKey: string;
  };
  vnpay: {
    merchant: string;
    accountName: string;
    accountNumber: string;
    apiKey: string;
    checksumKey: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromName: string;
    fromEmail: string;
  };
}
export interface ISystemConfig {
  autoPushKDS: boolean;
  maintenanceMode: boolean;
  requireOtpForVoid: boolean;
  kitchenCode?: string;
}

// INTERFACE CHÍNH CHO SETTING
export interface ISetting {
  _id?: string;
  scope: 'admin' | 'restaurant';
  targetModel: 'User' | 'Restaurant';
  targetId: string | IUser | IRestaurant;

  paymentMethodType: 'none' | 'bank_transfer' | 'payos';

  // Các khối dữ liệu cấu hình
  integrations?: IThirdPartyIntegration | null;
  bankAccount?: IBankAccountConfig;
  tableConfig: ITableConfig;
  menuConfig?: IMenuConfig;
  receiptConfig?: IReceiptConfig;
  payOSConfig?: IPayOSConfig;
  systemConfig?: ISystemConfig;
  operatingHoursByDay?: IOperatingHoursByDay;

  createdAt?: Date;
  updatedAt?: Date;
}
