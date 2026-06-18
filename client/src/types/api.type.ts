export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data: T;
    code: number;
    accessToken?: string; 
    total?: number;
}