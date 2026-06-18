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