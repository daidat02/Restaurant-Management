import { useState } from 'react';
import axios from 'axios';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { API_BASE_URL, API_ENDPOINTS } from '@/constants';
import { store } from '@/redux/store/store';
import type { IAnalyticQueryParams } from '@/types/analytic.type';

interface ExportButtonProps {
  params: { startDate: string; endDate: string; restaurantId?: string; restaurantIds?: string[] };
}

/** Nút xuất Excel — GET /analytics/export trả .xlsx theo kỳ đang chọn (Advanced). */
export function ExportButton({ params }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Dùng raw axios (không qua interceptor trả response.data) để đọc được
      // header Content-Disposition chứa tên file do server sinh.
      const res = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.ANALYTIC.EXPORT}`, {
        params,
        responseType: 'blob',
        headers: { Authorization: `Bearer ${store.getState().auth.token}` },
        withCredentials: true,
      });

      const disposition: string = res.headers?.['content-disposition'] ?? '';
      const fileName =
        /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? `bao-cao-${params.startDate}_${params.endDate}.xlsx`;

      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Đã xuất báo cáo Excel', { position: 'top-right' });
    } catch (err: any) {
      toast.error(err?.message || 'Không thể xuất báo cáo, vui lòng thử lại', {
        position: 'top-right',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-60"
    >
      {isExporting ? (
        <Loader2 size={14} className="animate-spin text-cerulean-blue-600" />
      ) : (
        <Download size={14} className="text-slate-500" />
      )}
      {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
    </button>
  );
}
