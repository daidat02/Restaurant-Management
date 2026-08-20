import { Schema, model, Document, type Types } from 'mongoose';

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
  fixedQrUrl: string;
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
}

export interface IThirdPartyIntegration {
  payOS?: IPayOSConfig;
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

/** Cấu hình SMTP nền tảng (gửi email) — super-admin cấu hình ở /super-admin/settings. */
export interface IGatewaySMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  /** Mã hoá qua encryptKey (như payos/vnpay). */
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface IPlatformGatewayConfig {
  payos?: IGatewayPayOSConfig;
  vnpay?: IGatewayVNPayConfig;
  smtp?: IGatewaySMTPConfig;
}

// Dữ liệu đã ẩn key (trả về cho frontend để hiển thị trạng thái có/không có key)
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
export interface ISystemConfig {
  autoPushKDS: boolean;
  maintenanceMode: boolean;
  requireOtpForVoid: boolean;
  kitchenCode: string;
}

// INTERFACE CHÍNH CHO SETTING
export interface ISetting extends Document {
  scope: 'admin' | 'restaurant' | 'platform';
  targetModel: 'User' | 'Restaurant';
  targetId: Types.ObjectId | string;

  paymentMethodType: 'none' | 'bank_transfer' | 'payos';

  // Các khối dữ liệu cấu hình
  integrations?: IThirdPartyIntegration;
  gateway?: IPlatformGatewayConfig;
  bankAccount?: IBankAccountConfig;
  tableConfig: ITableConfig;
  menuConfig: IMenuConfig;
  receiptConfig: IReceiptConfig;
  payOSConfig: IPayOSConfig;
  systemConfig: ISystemConfig;
  operatingHoursByDay?: IOperatingHoursByDay;

  createdAt: Date;
  updatedAt: Date;
}
export interface ISettingDocument extends ISetting {
  _id: Types.ObjectId;
}

// --- 2. ĐỊNH NGHĨA MONGOOSE SCHEMA ---

const SettingSchema = new Schema<ISetting>(
  {
    scope: {
      type: String,
      enum: ['admin', 'restaurant'],
      required: true,
      index: true,
    },
    targetModel: {
      type: String,
      required: true,
      enum: ['User', 'Restaurant'],
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'targetModel',
      index: true,
    },
    paymentMethodType: {
      type: String,
      enum: ['none', 'bank_transfer', 'payos'],
      required: true,
      index: true,
    },
    integrations: {
      payOS: {
        clientId: { type: String, trim: true },
        apiKey: { type: String, trim: true, select: false },
        checksumKey: { type: String, trim: true, select: false },
      },
    },
    bankAccount: {
      bankName: { type: String, trim: true, default: '' },
      accountNumber: { type: String, trim: true, default: '' },
      accountName: { type: String, trim: true, default: '' },
      bin: { type: String, trim: true, default: '' },
      fixedQrUrl: { type: String, trim: true, default: '' },
    },
    gateway: {
      payos: {
        clientId: { type: String, trim: true, default: '' },
        apiKey: { type: String, trim: true, select: false },
        checksumKey: { type: String, trim: true, select: false },
      },
      vnpay: {
        merchant: { type: String, trim: true, default: '' },
        accountName: { type: String, trim: true, default: '' },
        accountNumber: { type: String, trim: true, default: '' },
        apiKey: { type: String, trim: true, select: false },
        checksumKey: { type: String, trim: true, select: false },
      },
      smtp: {
        host: { type: String, trim: true, default: '' },
        port: { type: Number, default: 587 },
        secure: { type: Boolean, default: false },
        user: { type: String, trim: true, default: '' },
        pass: { type: String, trim: true, select: false },
        fromName: { type: String, trim: true, default: '' },
        fromEmail: { type: String, trim: true, default: '' },
      },
    },
    tableConfig: {
      autoCleanAfterCheckout: { type: Boolean, default: true },
      allowReservationBufferMinutes: { type: Number, default: 15 },
    },
    menuConfig: {
      allowToGo: { type: Boolean, default: true },
      autoHideOut: { type: Boolean, default: false },
    },
    receiptConfig: {
      // --- Khối Thuế & Phí ---
      vat: { type: Number, default: 10, min: 0 },
      serviceFee: { type: Number, default: 0, min: 0 },
      deleveryFee: { type: Number, default: 0, min: 0 }, // Sửa đúng chính tả deleveryFee theo interface của bạn
      footerText: {
        type: String,
        default: 'Cảm ơn quý khách đã dùng bữa! Hẹn gặp lại!',
        trim: true,
      },

      // --- Khối Tự động hóa & In ấn ---
      autoPrintOnCheckout: { type: Boolean, default: false },
      autoPrintToKitchen: { type: Boolean, default: true },
      printCount: { type: Number, default: 1, min: 1 },
      paperSize: {
        type: String,
        enum: ['80mm', '58mm'],
        default: '80mm',
      },

      // --- Khối Hiển thị Tùy chọn ---
      showLogo: { type: Boolean, default: true },
      showStaffName: { type: Boolean, default: true },
      showWifiInfo: { type: Boolean, default: false },

      // --- Khối Thông tin bổ sung ---
      wifiName: { type: String, trim: true },
      wifiPassword: { type: String, trim: true },
    },
    systemConfig: {
      autoPushKDS: { type: Boolean, default: true },
      maintenanceMode: { type: Boolean, default: false },
      requireOtpForVoid: { type: Boolean, default: true },
      // Mã bảo vệ màn hình bếp (KDS): tạo mới mã sẽ vô hiệu hóa mã cũ
      kitchenCode: { type: String, trim: true, default: '' },
    },
    operatingHoursByDay: {
      weekdays: {
        open: { type: String, trim: true, default: '09:00' },
        close: { type: String, trim: true, default: '22:00' },
      },
      weekend: {
        open: { type: String, trim: true, default: '10:00' },
        close: { type: String, trim: true, default: '23:00' },
      },
    },
  },
  {
    timestamps: true,
  },
);

SettingSchema.index({ scope: 1, targetId: 1 }, { unique: true });

export const Setting = model<ISetting>('Setting', SettingSchema);
