import AuditLogPanel from '@/components/AuditLogPanel';

/** Nhật Ký Hệ Thống — super-admin: toàn nền tảng, action theo whitelist. */
export default function SuperAdminAudit() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950">
              Nhật Ký Hệ Thống
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Nhật ký hoạt động trên nền tảng: đăng ký, thanh toán, khoá/mở chủ
            </p>
          </div>
        </div>

        <AuditLogPanel mode="platform" />
      </div>
    </div>
  );
}
