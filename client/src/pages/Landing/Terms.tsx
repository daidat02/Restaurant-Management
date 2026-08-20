import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Terms() {
  return (
    <div className="min-h-screen w-full bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-cerulean-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Về trang chủ
        </Link>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-gray-900">
          Điều khoản sử dụng
        </h1>
        <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-600">
          <p>
            Chào mừng bạn đến với <strong>NhaHang OS</strong>. Bằng việc đăng ký và sử dụng dịch vụ,
            bạn đồng ý tuân thủ các điều khoản dưới đây.
          </p>
          <p>
            <strong>1. Dịch vụ:</strong> NhaHang OS cung cấp nền tảng quản lý nhà hàng bao gồm quản
            lý thực đơn, đặt bàn, gọi món, thanh toán, báo cáo và các tính năng liên quan.
          </p>
          <p>
            <strong>2. Tài khoản:</strong> Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi
            hoạt động diễn ra trên tài khoản của mình.
          </p>
          <p>
            <strong>3. Phí dịch vụ:</strong> Một số tính năng có thể yêu cầu trả phí theo gói. Phí
            sẽ được thông báo rõ ràng trước khi thanh toán.
          </p>
          <p>
            <strong>4. Chấm dứt:</strong> Chúng tôi có quyền tạm ngưng hoặc chấm dứt quyền truy cập
            nếu vi phạm điều khoản hoặc pháp luật hiện hành.
          </p>
          <p>Nội dung chi tiết sẽ được cập nhật trong phiên bản chính thức.</p>
        </div>
      </div>
    </div>
  );
}