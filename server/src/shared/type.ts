export interface Image extends Document{
    url:string,
    publicId:string
}

export interface ServiceResponse<T>{
    message: string;
    data?: T;
    accessToken?: string;
    refreshToken?: string;
    code: number;
    /** Mã lỗi nghiệp vụ (vd 'RESTAURANT_LOCKED') — không phải HTTP status. */
    errorCode?: string;
    /** HTTP status ưu tiên khi khác `code`. */
    statusCode?: number;
    /** Dữ liệu phụ của lỗi nghiệp vụ (vd giới hạn gói khi PLAN_LIMIT_REACHED). */
    meta?: Record<string, unknown>;
}

// types/cloudinary.ts
export interface CloudinaryParams {
  folder?: string;
  allowed_formats?: string[];
  transformation?: Array<{ [key: string]: any }>;
  [key: string]: any; // Cho phép các thuộc tính khác của Cloudinary
}

export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  [key: string]: any;
}