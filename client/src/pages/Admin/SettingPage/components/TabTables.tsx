import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { LayoutGrid, Loader2, Plus } from 'lucide-react';

import { SettingCard, Field, SelectField } from './settings-ui';
import { useTable } from '@/hooks/use-table';
import { cn } from '@/lib/utils';
import type { ITable } from '@/types/table.type';
import { AlertDialogCustom } from '@/components/AlertDialog';

const STATUSES: Record<ITable['status'], { label: string; className: string }> = {
  available: { label: 'Trống', className: 'bg-emerald-50 text-emerald-700' },
  occupied: { label: 'Có khách', className: 'bg-amber-50 text-amber-700' },
  reserved: { label: 'Đã đặt', className: 'bg-cerulean-blue-50 text-cerulean-blue-700' },
  inactive: { label: 'Ngưng hoạt động', className: 'bg-slate-100 text-slate-500' },
};

/** Tab "Sơ đồ bàn" — admin/manager. Quản lý CRUD bàn cho nhà hàng đang cấu hình. */
export default function TabTables({ restaurantId }: { restaurantId?: string }) {
  const { tables, isLoading, fetchTablesByRestaurant, addTable, editTable, removeTable } =
    useTable();

  const [editing, setEditing] = useState<ITable | null>(null);
  const [formNumber, setFormNumber] = useState('');
  const [formCapacity, setFormCapacity] = useState('');
  const [formStatus, setFormStatus] = useState<ITable['status']>('available');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ITable | null>(null);

  const hasTarget = !!restaurantId;

  useEffect(() => {
    if (restaurantId) fetchTablesByRestaurant(restaurantId);
  }, [restaurantId, fetchTablesByRestaurant]);

  const sortedTables = useMemo(
    () => [...tables].sort((a, b) => a.tableNumber - b.tableNumber),
    [tables],
  );

  const openAdd = () => {
    setEditing(null);
    setFormNumber('');
    setFormCapacity('4');
    setFormStatus('available');
  };

  const openEdit = (t: ITable) => {
    setEditing(t);
    setFormNumber(String(t.tableNumber));
    setFormCapacity(String(t.capacity));
    setFormStatus(t.status);
  };

  const handleSubmit = async () => {
    const number = Number(formNumber);
    const capacity = Number(formCapacity) || 1;
    if (!Number.isInteger(number) || number <= 0 || !restaurantId) {
      toast.error('Số bàn phải là số nguyên dương', { position: 'top-right' });
      return;
    }
    setSubmitting(true);
    if (editing?._id) {
      await editTable(editing._id, { tableNumber: number, capacity, status: formStatus });
    } else {
      await addTable({
        restaurant: restaurantId,
        tableNumber: number,
        capacity,
        status: formStatus,
      });
    }
    setSubmitting(false);
  };

  const handleDelete = async (table: ITable) => {
    setDeleteTarget(table);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await removeTable(deleteTarget._id);
    setDeleteTarget(null);
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      {/* Danh sách bàn */}
      <SettingCard
        title="Sơ đồ bàn"
        description="Danh sách bàn của nhà hàng"
        className="xl:col-span-2"
        badge={
          <span className="rounded-full bg-cerulean-blue-50 px-2.5 py-1 text-[11px] font-semibold text-cerulean-blue-700">
            {tables.length} bàn
          </span>
        }
      >
        {!hasTarget ? (
          <p className="text-sm text-slate-400">
            Không xác định được nhà hàng đang cấu hình để tải danh sách bàn.
          </p>
        ) : isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-cerulean-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh sách bàn...
          </div>
        ) : sortedTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
            <LayoutGrid className="h-8 w-8" />
            <p className="text-sm">Chưa có bàn nào. Bấm "Thêm bàn mới" để bắt đầu.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {sortedTables.map((table) => {
              const st = STATUSES[table.status];
              return (
                <div
                  key={table._id}
                  className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-cerulean-blue-300"
                  onClick={() => openEdit(table)}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-lg font-extrabold text-gray-900">Bàn {table.tableNumber}</p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        st.className,
                      )}
                    >
                      {st.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{table.capacity} khách</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(table);
                    }}
                    className="mt-3 hidden text-xs font-semibold text-red-500 group-hover:block"
                  >
                    Xoá bàn
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </SettingCard>

      {/* Form thêm / sửa */}
      <SettingCard
        title={editing ? `Sửa bàn số ${editing.tableNumber}` : 'Thêm bàn mới'}
        description={editing ? 'Cập nhật thông tin bàn' : 'Tạo bàn cho sơ đồ nhà hàng'}
      >
        <div className="grid grid-cols-1 gap-4">
          <Field
            label="Số bàn"
            type="number"
            min={1}
            value={formNumber}
            placeholder="vd: 1, 2, 3..."
            onChange={(e) => setFormNumber(e.target.value)}
          />
          <Field
            label="Sức chứa (khách)"
            type="number"
            min={1}
            value={formCapacity}
            onChange={(e) => setFormCapacity(e.target.value)}
          />
          <SelectField
            label="Trạng thái"
            value={formStatus}
            onChange={(e) => setFormStatus(e.target.value as ITable['status'])}
          >
            {Object.entries(STATUSES).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </SelectField>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !hasTarget}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-cerulean-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-cerulean-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <Plus className="h-4 w-4" />
              {editing ? 'Cập nhật bàn' : 'Thêm bàn mới'}
            </button>
          </div>
        </div>
      </SettingCard>

      {/* Xác nhận xoá bàn — dùng AlertDialog dùng chung thay cho window.confirm */}
      <AlertDialogCustom
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        variant="danger"
        title="Xoá bàn?"
        description={
          deleteTarget
            ? `Bạn có chắc muốn xoá bàn số ${deleteTarget.tableNumber} không? Hành động này không thể hoàn tác.`
            : ''
        }
        confirmText="Xoá bàn"
        cancelText="Huỷ"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
