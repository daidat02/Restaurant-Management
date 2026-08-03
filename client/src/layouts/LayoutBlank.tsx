import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { LoadingProvider } from '@/components/LoadingOverlay';

/**
 * Layout trống — không Sidebar/Header điều hướng (chuyên cho màn hình chưa có cấu trúc admin:
 * onboarding khởi tạo cơ sở, landing page tương lai).
 */
export default function LayoutBlank() {
  return (
    <LoadingProvider>
      <Toaster />
      <div className="min-h-screen w-full bg-slate-50">
        <Outlet />
      </div>
    </LoadingProvider>
  );
}