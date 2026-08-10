import { useState } from 'react';
import { Cloud, Database, Globe, Lock, Mail, PlugZap, Server } from 'lucide-react';
import { SettingCard, Field, SelectField, ToggleSwitch } from './settings-ui';

/** Tab "Hệ thống & Hạ tầng" — super-admin. Mock UI, state nội bộ, không lưu API. */
export default function TabInfrastructure({ onDirty }: { onDirty: () => void }) {
  const [domain, setDomain] = useState('nhahangos.vn');
  const [subdomain, setSubdomain] = useState('lasen.nhahangos.vn');
  const [sslEnabled, setSslEnabled] = useState(true);
  const dnsPropagated = true;

  const [smtpHost, setSmtpHost] = useState('smtp.zoho.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('noreply@lasen.vn');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpSender, setSmtpSender] = useState('NhàHàng OS <noreply@lasen.vn>');
  const [smtpConnected, setSmtpConnected] = useState(true);

  const [storageType, setStorageType] = useState<'s3' | 'cloudinary'>('s3');
  const [s3Bucket, setS3Bucket] = useState('lasen-restaurant');
  const [s3Region, setS3Region] = useState('ap-southeast-1');
  const [cloudName, setCloudName] = useState('lasen');
  const [tenantLimitBytes, setTenantLimitBytes] = useState('5242880000');

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {/* Domain & SSL */}
      <SettingCard
        title="System Domain & Subdomain"
        description="Tên miền truy cập nền tảng và chi nhánh"
        badge={
          <span className="rounded-full bg-cerulean-blue-50 px-2.5 py-1 text-[11px] font-semibold text-cerulean-blue-700">
            Tên miền chính
          </span>
        }
      >
        <div className="flex flex-col gap-4">
          <Field
            label="Domain chính"
            icon={<Globe className="h-4 w-4 text-slate-400" />}
            value={domain}
            placeholder="vd: nhahangos.vn"
            onChange={(e) => {
              setDomain(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Subdomain chi nhánh (mặc định)"
            icon={<Globe className="h-4 w-4 text-slate-400" />}
            value={subdomain}
            placeholder="vd: ten-chi-nhanh.domain.vn"
            onChange={(e) => {
              setSubdomain(e.target.value);
              onDirty();
            }}
            hint="Tự động cấp <ten-chi-nhanh>.domain.vn cho mỗi nhà hàng mới"
          />
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-amber-600 shadow-sm">
                <Lock className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Chứng chỉ SSL / HTTPS</p>
                <p className="text-xs text-slate-400">Tự động gia hạn qua Let's Encrypt</p>
              </div>
            </div>
            <ToggleSwitch
              checked={sslEnabled}
              onChange={(v) => {
                setSslEnabled(v);
                onDirty();
              }}
            />
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">DNS records</p>
              <p className="text-xs text-slate-400">A / CNAME trỏ về CDN nền tảng</p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                dnsPropagated ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {dnsPropagated ? 'Đã truyền' : 'Đang chờ'}
            </span>
          </div>
        </div>
      </SettingCard>

      {/* Mail Server SMTP */}
      <SettingCard
        title="Mail Server (SMTP)"
        description="Gửi OTP, hoá đơn điện tử và thông báo qua email"
        badge={
          <span className="rounded-full bg-cerulean-blue-50 px-2.5 py-1 text-[11px] font-semibold text-cerulean-blue-700">
            Hệ thống
          </span>
        }
        className="border-cerulean-blue-200"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="SMTP Host"
            icon={<Server className="h-4 w-4 text-slate-400" />}
            value={smtpHost}
            onChange={(e) => {
              setSmtpHost(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Port"
            type="number"
            value={smtpPort}
            onChange={(e) => {
              setSmtpPort(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Username"
            icon={<Mail className="h-4 w-4 text-slate-400" />}
            value={smtpUser}
            onChange={(e) => {
              setSmtpUser(e.target.value);
              onDirty();
            }}
          />
          <Field
            label="Password"
            type="password"
            value={smtpPass}
            placeholder="••••••••"
            onChange={(e) => {
              setSmtpPass(e.target.value);
              onDirty();
            }}
          />
          <div className="sm:col-span-2">
            <Field
              label="Người gửi (From)"
              value={smtpSender}
              onChange={(e) => {
                setSmtpSender(e.target.value);
                onDirty();
              }}
            />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between">
            <button
              onClick={() => {
                setSmtpConnected(true);
                onDirty();
              }}
              className="flex h-10 items-center gap-2 rounded-xl bg-cerulean-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-cerulean-blue-700"
            >
              <PlugZap className="h-4 w-4" /> Kiểm tra kết nối
            </button>
            {smtpConnected && (
              <span className="text-xs font-medium text-emerald-600">✓ Hoạt động tốt</span>
            )}
          </div>
        </div>
      </SettingCard>

      {/* Storage */}
      <SettingCard
        title="Storage (ảnh & file)"
        description="Nơi lưu trữ logo, ảnh món ăn và tệp tải lên"
        className="xl:col-span-2"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Nhà cung cấp"
            value={storageType}
            onChange={(e) => {
              setStorageType(e.target.value as 's3' | 'cloudinary');
              onDirty();
            }}
          >
            <option value="s3">AWS S3</option>
            <option value="cloudinary">Cloudinary</option>
          </SelectField>
          {storageType === 's3' ? (
            <>
              <Field
                label="Bucket"
                icon={<Database className="h-4 w-4 text-slate-400" />}
                value={s3Bucket}
                onChange={(e) => {
                  setS3Bucket(e.target.value);
                  onDirty();
                }}
              />
              <Field
                label="Region"
                value={s3Region}
                onChange={(e) => {
                  setS3Region(e.target.value);
                  onDirty();
                }}
              />
              <Field
                label="Giới hạn dung lượng mỗi tenant"
                type="number"
                value={tenantLimitBytes}
                onChange={(e) => {
                  setTenantLimitBytes(e.target.value);
                  onDirty();
                }}
                hint="Đơn vị bytes · 5 GB = 5,242,880,000"
              />
            </>
          ) : (
            <>
              <Field
                label="Cloud Name"
                icon={<Cloud className="h-4 w-4 text-slate-400" />}
                value={cloudName}
                onChange={(e) => {
                  setCloudName(e.target.value);
                  onDirty();
                }}
              />
              <Field
                label="Giới hạn dung lượng mỗi tenant"
                type="number"
                value={tenantLimitBytes}
                onChange={(e) => {
                  setTenantLimitBytes(e.target.value);
                  onDirty();
                }}
                hint="Đơn vị bytes · 5 GB = 5,242,880,000"
              />
            </>
          )}
        </div>
      </SettingCard>
    </div>
  );
}