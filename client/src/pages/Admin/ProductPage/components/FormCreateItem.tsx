import { FileUpload } from '@/components/FileUpload';
import { useEffect, useState } from 'react';
import {
  FileText,
  ListPlus,
  Image as ImageIcon,
  Plus,
  X,
  Trash2,
  Check,
  Loader2,
  Store,
  CircleDot,
  CheckCircle2,
  Circle,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

// Import hooks và types
import { useMenu } from '@/hooks/use-menu';
import type { IMenuItem, IOptionGroup, IOptionChoice } from '@/types/category.type';
import type { Image } from '@/types/image.type';
import PageHeader from '@/components/PageHeader';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUpload } from '@/hooks/use-upload';
import { deleteFile } from '@/api/upload.api';
import { useActiveRestaurantId } from '@/hooks/use-active-restaurant';
import { FormSelect } from '@/components/FormSelect';
import { CustomTextarea } from '@/components/CustomTextArea';
import { Button } from '@/components/ui/button';

type TabKey = 'basic' | 'options' | 'media';

/** Ảnh đã upload (đáp ứng cả dữ liệu ảnh cũ lẫn ảnh vừa upload). */
type UploadedImage = { url?: string; publicId?: string; _id?: string };

const TABS: { key: TabKey; label: string; icon: typeof FileText }[] = [
  { key: 'basic', label: 'Thông tin cơ bản', icon: FileText },
  { key: 'options', label: 'Tuỳ chọn món', icon: ListPlus },
  { key: 'media', label: 'Hình ảnh & Trạng thái', icon: ImageIcon },
];

/** Nhập tag / nguyên liệu kiểu chip: giữ value dạng chuỗi phân tách dấu phẩy
 *  (tương thích payload cũ), Enter hoặc comma để thêm chip. */
function ChipInput({
  value,
  onChange,
  placeholder,
  chipClass,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  chipClass: string;
}) {
  const [draft, setDraft] = useState('');
  const items = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const commit = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...items, t].join(', '));
    setDraft('');
  };

  return (
    <div className="flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2 transition focus-within:border-cerulean-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-cerulean-blue-100">
      {items.map((it, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${chipClass}`}
        >
          {it}
          <button
            type="button"
            onClick={() => onChange(items.filter((_, j) => j !== i).join(', '))}
            className="opacity-60 transition hover:text-red-500"
            aria-label={`Xóa ${it}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        className="min-w-[140px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

/** Nút bật/tắt trạng thái — dữ liệu vẫn giữ dạng 'true'/'false' như cũ. */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-cerulean-blue-600' : 'bg-slate-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

const fmtVND = (n: number) => `${Math.round(n || 0).toLocaleString('vi-VN')}đ`;

const FormMenuItem = () => {
  const location = useLocation();

  // Lấy object itemData đã truyền từ trang danh sách
  const initialData = location.state?.itemData;

  const activeRestaurantId = useActiveRestaurantId();
  const { addItem, editItem, categories, fetchCategories } = useMenu();
  const { uploadMultiple } = useUpload();
  const navigate = useNavigate();
  // States quản lý form
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [isAvailable, setIsAvailable] = useState('true');
  const [optionGroups, setOptionGroups] = useState<IOptionGroup[]>([]);
  const [existingImages, setExistingImages] = useState<UploadedImage[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  // UI state
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [priceError, setPriceError] = useState(false);

  // Map categories sang định dạng của FormSelect
  const categoryOptions = categories.map((cat) => ({
    label: cat.name,
    value: cat._id,
  }));

  // Đổ dữ liệu khi mở form (edit/create) — giữ nguyên logic cũ.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchCategories(activeRestaurantId);
    if (initialData) {
      setName(initialData.name || '');
      setPrice(initialData.price?.toString() || '');
      setDescription(initialData.description || '');
      setTags(initialData.tags?.join(', ') || '');
      setIngredients(initialData.ingredients?.join(', ') || '');
      setIsAvailable(initialData.isAvailable ? 'true' : 'false');
      setOptionGroups(initialData.optionGroups || []);

      const catId =
        typeof initialData.category === 'object'
          ? initialData.category._id
          : (initialData.category as string);
      setCategoryId(catId || '');
      setExistingImages(initialData.imageUrl || []);
    } else {
      setName('');
      setPrice('');
      setCategoryId('');
      setDescription('');
      setTags('');
      setIngredients('');
      setIsAvailable('true');
      setImageFiles([]);
      setOptionGroups([]);
    }
  }, [initialData, fetchCategories, activeRestaurantId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updateGroup = (idx: number, patch: Partial<IOptionGroup>) => {
    setOptionGroups((prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  };

  const updateChoice = (gIdx: number, cIdx: number, patch: Partial<IOptionChoice>) => {
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === gIdx
          ? { ...g, choices: g.choices.map((c, j) => (j === cIdx ? { ...c, ...patch } : c)) }
          : g,
      ),
    );
  };

  // Trạng thái hợp lệ của từng bước (hiển thị tick ✓ trên tab)
  const basicOk = name.trim() !== '' && Number(price) > 0;
  const optionsOk = optionGroups.some(
    (g) => g.name.trim() !== '' && g.choices.some((c) => c.name.trim() !== ''),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation nhanh trước khi submit
    if (!name.trim()) {
      setNameError(true);
      setActiveTab('basic');
      toast.error('Vui lòng nhập tên món ăn');
      return;
    }
    if (!price || Number(price) <= 0) {
      setPriceError(true);
      setActiveTab('basic');
      toast.error('Giá bán phải lớn hơn 0');
      return;
    }

    setSaving(true);
    let isSuccess = false;

    // 1. Tạo payload cơ bản
    const payload: Partial<IMenuItem> = {
      restaurant: activeRestaurantId,
      name,
      price: Number(price),
      category: categoryId,
      description,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t !== ''),
      ingredients: ingredients
        .split(',')
        .map((i) => i.trim())
        .filter((i) => i !== ''),
      isAvailable: isAvailable === 'true',
      optionGroups: optionGroups
        .filter((g) => g.name.trim() !== '' && g.choices.length > 0)
        .map((g) => ({
          ...g,
          choices: g.choices.filter((c) => c.name.trim() !== ''),
        })),
    };

    try {
      if (initialData) {
        let uploadedUrls: UploadedImage[] = [];
        if (imageFiles.length > 0) {
          uploadedUrls = ((await uploadMultiple(imageFiles)) as unknown as UploadedImage[]) || [];
        }

        const finalPayload = {
          ...payload,
          imageUrl: [...existingImages, ...uploadedUrls] as unknown as Image[],
        };

        const updated = await editItem(initialData._id, finalPayload);
        if (updated) {
          isSuccess = true;
          if (imagesToDelete.length > 0) {
            // Dùng Promise.all để xóa nhiều ảnh song song cho nhanh
            await Promise.all(imagesToDelete.map((publicId) => deleteFile(publicId))).catch((err) =>
              console.error('Lỗi khi dọn dẹp ảnh cũ:', err),
            );
          }
        }
      } else {
        let uploadedUrls: UploadedImage[] = [];
        if (imageFiles.length > 0) {
          uploadedUrls = ((await uploadMultiple(imageFiles)) as unknown as UploadedImage[]) || [];
        }

        const finalPayload = {
          ...payload,
          imageUrl: uploadedUrls as unknown as Image[],
        };

        const created = await addItem(finalPayload);
        if (created) isSuccess = true;
      }

      if (isSuccess) {
        toast.success(initialData ? 'Đã cập nhật món ăn' : 'Đã thêm món ăn mới');
        navigate('/manager/menu/items');
      }
    } catch (error) {
      console.error('Lỗi khi lưu món ăn:', error);
      toast.error('Có lỗi xảy ra khi lưu món ăn, vui lòng thử lại');
    } finally {
      setSaving(false);
    }
  };

  const submitForm = () => {
    (document.getElementById('menu-item-form') as HTMLFormElement | null)?.requestSubmit();
  };

  const StepBadge = ({ ok }: { ok: boolean }) =>
    ok ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    ) : (
      <Circle className="h-4 w-4 text-slate-300" />
    );

  return (
    <>
      <div className="p-2 h-full flex flex-col min-h-0 bg-gray-50/50">
        {/* ===== HEADER + NÚT HÀNH ĐỘNG ===== */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-end">
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              onClick={() => navigate('/manager/menu/items')}
              className="h-10 border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-cerulean-blue-200 hover:text-cerulean-blue-600"
            >
              <X className="h-4 w-4" /> Huỷ
            </Button>
            <Button
              type="button"
              onClick={submitForm}
              disabled={saving}
              className="h-10 gap-2 bg-cerulean-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-cerulean-blue-200 transition hover:bg-cerulean-blue-700 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saving ? 'Đang lưu...' : 'Lưu món'}
            </Button>
          </div>
        </div>

        <form
          id="menu-item-form"
          onSubmit={handleSubmit}
          className="mt-3 flex flex-col gap-5 flex-1 min-h-0 lg:flex-row"
        >
          {/* ===== TABS DỌC ===== */}
          <div className="shrink-0 lg:w-64">
            <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm lg:sticky lg:top-2">
              <p className="px-2.5 pb-2 pt-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Nội dung món
              </p>
              <nav className="space-y-1">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const active = activeTab === t.key;
                  const ok = t.key === 'basic' ? basicOk : t.key === 'options' ? optionsOk : true;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTab(t.key)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                        active
                          ? 'bg-cerulean-blue-50 text-cerulean-blue-700'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cerulean-blue-50 text-cerulean-blue-600">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="flex-1">{t.label}</span>
                      <StepBadge ok={ok} />
                    </button>
                  );
                })}
              </nav>
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Mỗi bước đánh dấu <span className="font-semibold text-emerald-600">✓</span> khi
                  hợp lệ.
                </span>
              </div>
            </div>
          </div>

          {/* ===== CONTENT ===== */}
          <div className="min-w-0 flex-1 overflow-y-auto pb-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
            {/* ---------- BƯỚC 1: THÔNG TIN CƠ BẢN ---------- */}
            {activeTab === 'basic' && (
              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cerulean-blue-600 text-sm font-bold text-white">
                    1
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Thông tin cơ bản</h2>
                    <p className="text-xs text-slate-400">Tên, danh mục, giá và mô tả của món.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="lg:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Tên món ăn <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (nameError && e.target.value.trim()) setNameError(false);
                      }}
                      onBlur={() => setNameError(!name.trim())}
                      placeholder="VD: Cà phê sữa đá, Lẩu Thái..."
                      className={`h-10 w-full rounded-xl border bg-slate-50/70 px-3.5 text-sm outline-none transition focus:bg-white focus:ring-2 ${
                        nameError
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                          : 'border-slate-200 focus:border-cerulean-blue-500 focus:ring-cerulean-blue-100'
                      }`}
                    />
                    {nameError && (
                      <p className="mt-1 text-xs font-medium text-red-500">
                        Vui lòng nhập tên món.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Danh mục <span className="text-red-500">*</span>
                    </label>
                    <FormSelect
                      label=""
                      placeholder="Chọn danh mục"
                      options={categoryOptions}
                      containerClassName="w-full"
                      value={categoryId}
                      onValueChange={(val) => setCategoryId(val)}
                      key={categoryId}
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Giá bán (₫) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={price}
                        min={0}
                        onChange={(e) => {
                          setPrice(e.target.value);
                          if (priceError && Number(e.target.value) > 0) setPriceError(false);
                        }}
                        onBlur={() => setPriceError(!price || Number(price) <= 0)}
                        placeholder="0"
                        className={`h-10 w-full rounded-xl border bg-slate-50/70 px-3.5 pr-16 text-sm outline-none transition focus:bg-white focus:ring-2 ${
                          priceError
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                            : 'border-slate-200 focus:border-cerulean-blue-500 focus:ring-cerulean-blue-100'
                        }`}
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        VND
                      </span>
                    </div>
                    {priceError ? (
                      <p className="mt-1 text-xs font-medium text-red-500">Giá phải lớn hơn 0.</p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">
                        Khách sẽ thấy:{' '}
                        <span className="font-semibold text-gray-700">{fmtVND(Number(price))}</span>
                      </p>
                    )}
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Nguyên liệu
                    </label>
                    <ChipInput
                      value={ingredients}
                      onChange={setIngredients}
                      placeholder="Nhập rồi Enter..."
                      chipClass="bg-cerulean-blue-50 text-cerulean-blue-700"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tags</label>
                    <ChipInput
                      value={tags}
                      onChange={setTags}
                      placeholder="Nhập rồi Enter..."
                      chipClass="bg-violet-50 text-violet-700"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Mô tả món ăn
                    </label>
                    <CustomTextarea
                      label=""
                      placeholder="Nhập mô tả hấp dẫn về món ăn..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <Button
                    type="button"
                    onClick={() => setActiveTab('options')}
                    className="h-10 gap-2 bg-cerulean-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-cerulean-blue-200 transition hover:bg-cerulean-blue-700"
                  >
                    Tiếp: Tuỳ chọn món <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </section>
            )}

            {/* ---------- BƯỚC 2: TUỲ CHỌN MÓN ---------- */}
            {activeTab === 'options' && (
              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cerulean-blue-600 text-sm font-bold text-white">
                      2
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Tuỳ chọn món</h2>
                      <p className="text-xs text-slate-400">
                        Topping, size, nước sốt... mà khách chọn kèm khi đặt món.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setOptionGroups((prev) => [
                        ...prev,
                        {
                          name: '',
                          type: 'multiple',
                          required: false,
                          min: 0,
                          max: 0,
                          choices: [{ name: '', price: 0 }],
                        },
                      ])
                    }
                    className="flex h-10 items-center gap-2 rounded-xl border border-cerulean-blue-200 bg-cerulean-blue-50 px-4 text-sm font-semibold text-cerulean-blue-700 transition hover:bg-cerulean-blue-100"
                  >
                    <Plus className="h-4 w-4" /> Thêm nhóm
                  </button>
                </div>

                <div className="space-y-4">
                  {optionGroups.map((group, gIdx) => (
                    <div
                      key={gIdx}
                      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-cerulean-blue-200"
                    >
                      {/* Header nhóm */}
                      <div className="flex items-start gap-3">
                        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cerulean-blue-100 text-cerulean-blue-600">
                          {group.type === 'single' ? (
                            <CircleDot className="h-4 w-4" />
                          ) : (
                            <ListPlus className="h-4 w-4" />
                          )}
                        </span>
                        <input
                          value={group.name}
                          onChange={(e) => updateGroup(gIdx, { name: e.target.value })}
                          placeholder="Tên nhóm (VD: Nước sốt, Topping, Size...)"
                          className="h-9 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm font-bold text-gray-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-cerulean-blue-300 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setOptionGroups((prev) => prev.filter((_, i) => i !== gIdx))
                          }
                          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                          aria-label="Xoá nhóm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Kiểu chọn + bắt buộc + min/max */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-0.5">
                          {(['single', 'multiple'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() =>
                                updateGroup(gIdx, {
                                  type: t,
                                  ...(t === 'single' ? { min: 0, max: 0 } : {}),
                                })
                              }
                              className={`rounded-[10px] px-3 py-1.5 text-xs font-semibold transition ${
                                group.type === t
                                  ? 'bg-cerulean-blue-600 text-white'
                                  : 'text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              {t === 'single' ? 'Chọn 1' : 'Chọn nhiều'}
                            </button>
                          ))}
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                          <input
                            type="checkbox"
                            checked={group.required}
                            onChange={(e) => updateGroup(gIdx, { required: e.target.checked })}
                            className="h-4 w-4 rounded accent-cerulean-blue-600"
                          />
                          Bắt buộc chọn
                        </label>
                        {group.type === 'multiple' && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            Tối thiểu
                            <input
                              type="number"
                              min={0}
                              value={group.min?.toString() ?? '0'}
                              onChange={(e) => updateGroup(gIdx, { min: Number(e.target.value) })}
                              className="h-8 w-16 rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-semibold text-slate-700 outline-none focus:border-cerulean-blue-500"
                            />
                            · tối đa
                            <input
                              type="number"
                              min={0}
                              value={group.max?.toString() ?? '0'}
                              onChange={(e) => updateGroup(gIdx, { max: Number(e.target.value) })}
                              className="h-8 w-16 rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-semibold text-slate-700 outline-none focus:border-cerulean-blue-500"
                            />
                          </div>
                        )}
                        {group.required && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                            <Info className="h-3 w-3" /> Khách bắt buộc chọn
                          </span>
                        )}
                      </div>

                      {/* Danh sách lựa chọn */}
                      <div className="mt-3 space-y-2">
                        {group.choices.map((choice, cIdx) => (
                          <div key={cIdx} className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <input
                                value={choice.name}
                                onChange={(e) => updateChoice(gIdx, cIdx, { name: e.target.value })}
                                placeholder="Tên lựa chọn (VD: Thêm phô mai)"
                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm outline-none transition focus:border-cerulean-blue-500 focus:bg-white focus:ring-2 focus:ring-cerulean-blue-100"
                              />
                              {choice.name && choice.price > 0 && (
                                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-emerald-600">
                                  +{fmtVND(choice.price)}
                                </span>
                              )}
                            </div>
                            <div className="relative w-28 shrink-0">
                              <input
                                type="number"
                                min={0}
                                value={choice.price?.toString() ?? ''}
                                onChange={(e) =>
                                  updateChoice(gIdx, cIdx, { price: Number(e.target.value) })
                                }
                                placeholder="Giá"
                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 pr-8 text-sm outline-none transition focus:border-cerulean-blue-500 focus:bg-white focus:ring-2 focus:ring-cerulean-blue-100"
                              />
                              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                                đ
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setOptionGroups((prev) =>
                                  prev.map((g, i) =>
                                    i === gIdx
                                      ? { ...g, choices: g.choices.filter((_, j) => j !== cIdx) }
                                      : g,
                                  ),
                                )
                              }
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                              aria-label="Xoá lựa chọn"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            updateGroup(gIdx, {
                              choices: [...group.choices, { name: '', price: 0 }],
                            })
                          }
                          className="mt-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-cerulean-blue-600 transition hover:bg-cerulean-blue-50"
                        >
                          <Plus className="h-3.5 w-3.5" /> Thêm lựa chọn
                        </button>
                      </div>
                    </div>
                  ))}

                  {optionGroups.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                      <ListPlus className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                      <p className="text-sm text-slate-400">
                        Chưa có nhóm lựa chọn nào. Bấm{' '}
                        <span className="font-semibold text-cerulean-blue-600">"Thêm nhóm"</span> để
                        bắt đầu.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-cerulean-blue-500" />
                  <p>
                    Giá lựa chọn sẽ được{' '}
                    <span className="font-semibold text-gray-700">cộng vào giá món</span> khi khách
                    chọn. Ví dụ món <span className="font-semibold">{fmtVND(Number(price))}</span> +{' '}
                    <span className="font-semibold">Trân châu 5.000đ</span> ={' '}
                    <span className="font-semibold text-gray-700">
                      {fmtVND((Number(price) || 0) + 5000)}
                    </span>
                    .
                  </p>
                </div>

                <div className="flex justify-between border-t border-slate-100 pt-4">
                  <Button
                    type="button"
                    onClick={() => setActiveTab('basic')}
                    className="h-10 gap-2 border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:text-cerulean-blue-600"
                  >
                    <ChevronLeft className="h-4 w-4" /> Quay lại
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setActiveTab('media')}
                    className="h-10 gap-2 bg-cerulean-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-cerulean-blue-200 transition hover:bg-cerulean-blue-700"
                  >
                    Tiếp: Hình ảnh <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </section>
            )}

            {/* ---------- BƯỚC 3: HÌNH ẢNH & TRẠNG THÁI ---------- */}
            {activeTab === 'media' && (
              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cerulean-blue-600 text-sm font-bold text-white">
                    3
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Hình ảnh & Trạng thái</h2>
                    <p className="text-xs text-slate-400">Ảnh món và tuỳ chọn mở bán.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {/* Upload ảnh */}
                  <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Hình ảnh món
                    </label>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                      <FileUpload
                        label=""
                        accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                        initialPreview={initialData?.imageUrl}
                        multipleFile={true}
                        onRemoveUploaded={(removedItem) => {
                          // 1. Ẩn khỏi giao diện (lọc khỏi mảng existingImages)
                          setExistingImages((prev) =>
                            prev.filter((img) => img._id !== removedItem._id),
                          );

                          // 2. Đưa publicId vào danh sách "tử tù" chờ xóa thật
                          if (removedItem.publicId) {
                            setImagesToDelete((prev) => [...prev, removedItem.publicId]);
                          }
                        }}
                        onChange={(data) => {
                          setImageFiles(data ? (data as File[]) : []);
                        }}
                      />
                    </div>
                  </div>

                  {/* Trạng thái + tóm tắt */}
                  <div className="flex flex-col">
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Trạng thái bán
                    </label>
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            isAvailable === 'true'
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <Store className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            {isAvailable === 'true' ? 'Đang mở bán' : 'Ngừng bán'}
                          </p>
                          <p className="text-xs text-slate-400">
                            Món xuất hiện trong thực đơn của khách.
                          </p>
                        </div>
                      </div>
                      <Toggle
                        checked={isAvailable === 'true'}
                        onChange={(v) => setIsAvailable(v ? 'true' : 'false')}
                      />
                    </div>

                    <div className="mt-4 flex-1 rounded-xl bg-gradient-to-br from-cerulean-blue-50 to-white p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-cerulean-blue-600">
                        Tóm tắt món
                      </p>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Tên món</span>
                          <span className="font-semibold text-gray-800">{name || '—'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Giá gốc</span>
                          <span className="font-semibold text-gray-800">
                            {fmtVND(Number(price))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Nhóm lựa chọn</span>
                          <span className="font-semibold text-gray-800">
                            {optionGroups.length} nhóm
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-200/70 pt-2">
                          <span className="text-slate-500">Trạng thái</span>
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              isAvailable === 'true' ? 'text-emerald-600' : 'text-slate-500'
                            }`}
                          >
                            {isAvailable === 'true' ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Circle className="h-3.5 w-3.5" />
                            )}
                            {isAvailable === 'true' ? 'Đang bán' : 'Ngừng bán'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between border-t border-slate-100 pt-4">
                  <Button
                    type="button"
                    onClick={() => setActiveTab('options')}
                    className="h-10 gap-2 border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-600 transition hover:text-cerulean-blue-600"
                  >
                    <ChevronLeft className="h-4 w-4" /> Quay lại
                  </Button>
                  <Button
                    type="submit"
                    disabled={saving}
                    onClick={submitForm}
                    className="h-10 gap-2 bg-cerulean-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-cerulean-blue-200 transition hover:bg-cerulean-blue-700 disabled:opacity-60"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {saving ? 'Đang lưu...' : 'Lưu món'}
                  </Button>
                </div>
              </section>
            )}
          </div>
        </form>
      </div>
    </>
  );
};

export default FormMenuItem;
