import type { IRestaurant } from "./restaurant.type";

export type UserRole = 'customer' | 'staff' | 'manager' | 'admin' | 'super-admin';
export type UserGender = 'male' | 'female' | 'other';
export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export type UserCredentials = {
    email: string;
    password: string;
};

export type RegisterCredentials = {
    email: string;
    password: string;
    name: string;
    address?: string;
    phone?: string;
    role?: UserRole;
    restaurant?: string;
    restaurantIds?: string[];
    // HR fields (optional - for staff/manager creation)
    employeeCode?: string;
    position?: string;
    gender?: UserGender;
    birthday?: string; // YYYY-MM-DD
    nationalId?: string;
    hireDate?: string; // YYYY-MM-DD
    baseSalary?: number;
    emergencyContact?: {
        name?: string;
        phone?: string;
        relation?: string;
    };
};

export interface IEmergencyContact {
    name?: string;
    phone?: string;
    relation?: string;
}

export interface IPreferences {
    favoriteItems?: string[];
    allergies?: string[];
    notes?: string;
}

export interface IDefaultAddress {
    label?: string;
    address: string;
    phone?: string;
    isDefault?: boolean;
}

export interface IRestaurantRole {
    restaurantId: string;
    role: UserRole;
    joinedAt: string;
}

export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  /** Danh sách nhà hàng mà user thuộc về (đa tenant). */
  restaurantIds?: (IRestaurant | string)[];
  /**
   * @deprecated Field compat cho client legacy (ticket 06 sẽ xoá, chuyển hẳn sang restaurantIds).
   */
  restaurant?: IRestaurant | string ;
  avatar?: string;
  address?: string;
  notificationEnabled?: boolean;
  isActive: boolean;

  // HR fields
  employeeCode?: string;
  position?: string;
  gender?: UserGender;
  birthday?: string;
  nationalId?: string;
  hireDate?: string;
  baseSalary?: number;
  emergencyContact?: IEmergencyContact;

  // CRM fields
  loyaltyPoints: number;
  loyaltyTier: LoyaltyTier;
  totalSpent: number;
  preferences?: IPreferences;
  defaultAddresses?: IDefaultAddress[];

  // Multi-tenant
  primaryRestaurantId?: string;
  restaurantRoles?: IRestaurantRole[];

  // Security
  passwordChangedAt?: string;
  lastLoginAt?: string;
  loginAttempts: number;
  lockUntil?: string;
  emailVerified: boolean;
  emailVerifiedAt?: string;
  phoneVerified: boolean;
  tokenVersion: number;
  deletedAt?: string;

  // Push
  deviceTokens?: string[];

  resetPasswordToken?: string;
  resetPasswordExpires?: string;
  createdAt: string;
  updatedAt: string;
}

// Dữ liệu form tạo/sửa nhân viên (staff/manager)
export type EmployeeFormData = Partial<IUser> & {
    password?: string;
    confirmPassword?: string;
    restaurant?: string;
};