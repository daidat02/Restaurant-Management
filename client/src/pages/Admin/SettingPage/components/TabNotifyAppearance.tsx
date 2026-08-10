import { useState } from 'react';
import { Check } from 'lucide-react';
import { SettingCard, ToggleRow, ToggleSwitch } from './settings-ui';
import { cn } from '@/lib/utils';

const ACCENT_COLORS = [
  { color: '#3090ff', active: true },
  { color: '#7c3aed' },
  { color: '#0d9488' },
  { color: '#ea580c' },
  { color: '#16a34a' },
  { color: '#e11d48' },
];

/** Tab "Thông báo & Giao diện" — admin/manager (có thể dùng chung staff). */
export default function TabNotifyAppearance({ onDirty }: { onDirty: () => void }) {
  const [newOrderNoti, setNewOrderNoti] = useState(true);
  const [kitchenDoneNoti, setKitchenDoneNoti] = useState(true);
  const [stockLowNoti, setStockLowNoti] = useState(false);
  const [reportNoti, setReportNoti] = useState(true);
  const [soundNoti, setSoundNoti] = useState(true);
  const [mode, setMode] = useState<'light' | 'dark' | 'system'>('light');
  const [accent, setAccent] = useState('#3090ff');
  const [compact, setCompact] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {/* Thông báo hệ thống */}
      <SettingCard title="Thông báo hệ thống" description="Chọn loại thông báo bạn muốn nhận">
        <div className="flex flex-col divide-y divide-slate-100">
          <ToggleRow
            title="Đơn mới tại quầy / bàn"
            description="Báo ngay khi khách đặt món"
            checked={newOrderNoti}
            onChange={(v) => {
              setNewOrderNoti(v);
              onDirty();
            }}
          />
          <ToggleRow
            title="Món hoàn thành tại bếp"
            description="Báo khi món đã lên"
            checked={kitchenDoneNoti}
            onChange={(v) => {
              setKitchenDoneNoti(v);
              onDirty();
            }}
          />
          <ToggleRow
            title="Tồn kho sắp hết"
            description="Nhắc khi nguyên liệu dưới ngưỡng"
            checked={stockLowNoti}
            onChange={(v) => {
              setStockLowNoti(v);
              onDirty();
            }}
          />
          <ToggleRow
            title="Báo cáo doanh thu cuối ngày"
            description="Gửi số liệu kinh doanh hằng ngày"
            checked={reportNoti}
            onChange={(v) => {
              setReportNoti(v);
              onDirty();
            }}
          />
          <ToggleRow
            title="Âm thanh thông báo"
            description="Phát âm thanh khi có sự kiện mới"
            checked={soundNoti}
            onChange={(v) => {
              setSoundNoti(v);
              onDirty();
            }}
          />
        </div>
      </SettingCard>

      {/* Giao diện & Chủ đề */}
      <SettingCard title="Giao diện & Chủ đề" description="Tùy chỉnh cách hiển thị hệ thống">
        <div className="flex flex-col gap-5">
          <div>
            <label className="text-xs font-medium text-slate-600">Chế độ giao diện</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {(
                [
                  { key: 'light', label: 'Sáng' },
                  { key: 'dark', label: 'Tối' },
                  { key: 'system', label: 'Theo hệ thống' },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  onClick={() => {
                    setMode(m.key);
                    onDirty();
                  }}
                  className={cn(
                    'rounded-xl border py-2 text-xs font-semibold transition',
                    mode === m.key
                      ? 'border-2 border-cerulean-blue-500 bg-cerulean-blue-50 text-cerulean-blue-700'
                      : 'border border-slate-200 text-slate-500 hover:bg-slate-50',
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Màu nhấn (Accent)</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {ACCENT_COLORS.map((c) => (
                <span
                  key={c.color}
                  onClick={() => {
                    setAccent(c.color);
                    onDirty();
                  }}
                  className={cn(
                    'flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl transition',
                    accent === c.color && 'ring-2 ring-cerulean-blue-500 ring-offset-2',
                  )}
                  style={{ background: c.color }}
                >
                  {accent === c.color && <Check className="h-4 w-4 text-white" />}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Giao diện compact</p>
              <p className="text-xs text-slate-400">Giảm khoảng cách để xem nhiều dữ liệu hơn</p>
            </div>
            <ToggleSwitch
              checked={compact}
              onChange={(v) => {
                setCompact(v);
                onDirty();
              }}
            />
          </div>
        </div>
      </SettingCard>
    </div>
  );
}