import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Tag } from 'lucide-react';

import { SettingCard, Field, TextArea } from './settings-ui';
import { useMenu } from '@/hooks/use-menu';
import type { IMenuCategory } from '@/types/category.type';

/** Tab "Danh mục món ăn" — admin/manager. CRUD danh mục cho nhà hàng đang cấu hình. */
export default function TabMenuCategories({ restaurantId }: { restaurantId?: string }) {
  const { categories, isLoading, fetchCategories, addCategory, editCategory } = useMenu();

  const [editing, setEditing] = useState<IMenuCategory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hasTarget = !!restaurantId;

  useEffect(() => {
    if (restaurantId) fetchCategories(restaurantId);
  }, [restaurantId, fetchCategories]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [categories],
  );

  const openAdd = () => {
    setEditing(null);
    setName('');
    setDescription('');
  };

  const openEdit = (cat: IMenuCategory) => {
    setEditing(cat);
    setName(cat.name || '');
    setDescription(cat.description || '');
  };

  const handleSubmit = async () => {
    if (!name.trim() || !restaurantId) {
      toast.error('Vui lòng nhập tên danh mục', { position: 'top-right' });
      return;
    }
    setSubmitting(true);
    if (editing?._id) {
      await editCategory(editing._id, { name: name.trim(), description: description.trim() });
    } else {
      await addCategory({
        restaurant: restaurantId,
        name: name.trim(),
        description: description.trim(),
      });
    }
    setSubmitting(false);
    setName('');
    setDescription('');
    setEditing(null);
  };

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      {/* Danh sách danh mục */}
      <SettingCard
        title="Danh mục món ăn"
        description="Nhóm món hiển thị trên thực đơn"
        className="xl:col-span-2"
        badge={
          <span className="rounded-full bg-cerulean-blue-50 px-2.5 py-1 text-[11px] font-semibold text-cerulean-blue-700">
            {categories.length} danh mục
          </span>
        }
      >
        {!hasTarget ? (
          <p className="text-sm text-slate-400">
            Không xác định được nhà hàng đang cấu hình để tải danh sách danh mục.
          </p>
        ) : isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-cerulean-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh mục...
          </div>
        ) : sortedCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
            <Tag className="h-8 w-8" />
            <p className="text-sm">Chưa có danh mục nào. Bấm "Thêm danh mục" để bắt đầu.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {sortedCategories.map((cat) => (
              <div
                key={cat._id}
                className="flex cursor-pointer items-center gap-3 py-3 transition hover:opacity-80"
                onClick={() => openEdit(cat)}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cerulean-blue-50 text-sm font-extrabold text-cerulean-blue-700">
                  {(cat.name || '?').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{cat.name}</p>
                  {cat.description && (
                    <p className="truncate text-xs text-slate-400">{cat.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{cat.foodCount ?? 0}</p>
                  <p className="text-[11px] text-slate-400">món</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SettingCard>

      {/* Form thêm / sửa */}
      <SettingCard
        title={editing ? `Sửa danh mục` : 'Thêm danh mục mới'}
        description={editing ? `Đang sửa: ${editing.name}` : 'Tạo danh mục cho thực đơn'}
      >
        <div className="grid grid-cols-1 gap-4">
          <Field
            label="Tên danh mục"
            required
            value={name}
            placeholder="vd: Món khai vị, Đồ uống..."
            onChange={(e) => setName(e.target.value)}
          />
          <TextArea
            label="Mô tả"
            value={description}
            placeholder="Mô tả ngắn về nhóm món (tuỳ chọn)"
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="pt-1">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !hasTarget}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-cerulean-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-cerulean-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              <Plus className="h-4 w-4" />
              {editing ? 'Cập nhật' : 'Thêm danh mục'}
            </button>
          </div>
        </div>
      </SettingCard>
    </div>
  );
}
