import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function Privacy() {
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
          Chính sách bảo mật
        </h1>
        <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-600">
          <p>
            Chúng tôi tôn trọng quyền riêng tư của bạn và cam kết bảo vệ dữ liệu khi sử dụng{' '}
            <strong>NhaHang OS</strong>.
          </p>
          <p>
            <strong>1. Dữ liệu thu thập:</strong> Chúng tôi thu thập các thông tin bạn cung cấp khi
            đăng ký (tên, email, số điện thoại) và dữ liệu vận hành nhà hàng của bạn.
          </p>
          <p>
            <strong>2. Mục đích sử dụng:</strong> Dữ liệu được dùng để cung cấp, vận hành và cải
            thiện dịch vụ, hỗ trợ khách hàng và gửi thông báo quan trọng.
          </p>
          <p>
            <strong>3. Chia sẻ dữ liệu:</strong> Chúng tôi không bán dữ liệu của bạn cho bên thứ ba.
            Dữ liệu chỉ được chia sẻ khi cần thiết để cung cấp dịch vụ (thanh toán, email...) hoặc
            theo yêu cầu pháp luật.
          </p>
          <p>
            <strong>4. Bảo mật:</strong> Dữ liệu được mã hóa khi lưu trữ và truyền tải; truy cập bị
            giới hạn theo vai trò người dùng.
          </p>
          <p>Nội dung chi tiết sẽ được cập nhật trong phiên bản chính thức.</p>
        </div>
      </div>
    </div>
  );
}