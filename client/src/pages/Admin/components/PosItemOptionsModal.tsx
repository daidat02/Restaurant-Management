import { useState } from 'react';
import { Check, CircleAlert, X } from 'lucide-react';
import type { IMenuItem, IOptionGroup } from '@/types/category.type';
import { DialogCustom } from '@/components/DialogCustom';
import { cn } from '@/lib/utils';

interface PosItemOptionsModalProps {
  item: IMenuItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Xác nhận thêm món vào giỏ — toppings là các lựa chọn đã chọn ({name, price}). */
  onConfirm: (item: IMenuItem, toppings: { name: string; price: number }[]) => void;
}

/**
 * Modal bắt buộc chọn option trước khi thêm món có optionGroups vào giỏ hàng POS.
 * Dùng DialogCustom dùng chung. Thiết kế cho màn cảm ứng: target chạm ≥44px,
 * lỗi validate highlight ngay tại nhóm (role="alert") thay vì toast.
 */
export default function PosItemOptionsModal({
  item,
  open,
  onOpenChange,
  onConfirm,
}: PosItemOptionsModalProps) {
  const optionGroups = (item.optionGroups || []).filter((g) => (g.choices?.length ?? 0) > 0);

  // Lựa chọn theo từng group (key = index group trong mảng đã lọc, value = mảng tên choice)
  // Group single bắt buộc → mặc định chọn choice đầu tiên
  const [selected, setSelected] = useState<Record<number, string[]>>(() => {
    const map: Record<number, string[]> = {};
    optionGroups.forEach((group, index) => {
      map[index] =
        group.type === 'single' && group.required && group.choices.length > 0
          ? [group.choices[0].name]
          : [];
    });
    return map;
  });
  // Nhóm đang thiếu lựa chọn bắt buộc — highlight tại chỗ thay vì toast
  const [errorGroups, setErrorGroups] = useState<number[]>([]);

  const toggleChoice = (groupIndex: number, group: IOptionGroup, choiceName: string) => {
    setSelected((prev) => {
      const current = prev[groupIndex] || [];
      let next: string[];
      if (group.type === 'single') {
        next = [choiceName];
      } else if (current.includes(choiceName)) {
        next = current.filter((name) => name !== choiceName);
      } else {
        const max = group.max ?? group.choices.length;
        if (current.length >= max) return prev; // Đã đạt giới hạn tối đa
        next = [...current, choiceName];
      }
      // Chọn đủ rồi thì gỡ lỗi của nhóm đó ngay lập tức
      const min = group.type === 'single' ? 1 : group.min || 0;
      const isValidNow = !group.required || next.length >= min;
      if (isValidNow) setErrorGroups((errs) => errs.filter((i) => i !== groupIndex));
      return { ...prev, [groupIndex]: next };
    });
  };

  const selectedToppings = (): { name: string; price: number }[] => {
    const toppings: { name: string; price: number }[] = [];
    optionGroups.forEach((group, index) => {
      const chosen = selected[index] || [];
      for (const choice of group.choices) {
        if (chosen.includes(choice.name)) {
          toppings.push({ name: choice.name, price: choice.price });
        }
      }
    });
    return toppings;
  };

  const totalPrice = item.price + selectedToppings().reduce((sum, t) => sum + t.price, 0);

  const handleConfirm = () => {
    // Group bắt buộc phải chọn đủ — lỗi highlight trực tiếp trên nhóm vi phạm
    const missing: number[] = [];
    optionGroups.forEach((group, index) => {
      const count = (selected[index] || []).length;
      const min = group.type === 'single' ? 1 : group.min || 0;
      if (group.required && count < min) missing.push(index);
    });
    if (missing.length > 0) {
      setErrorGroups(missing);
      return;
    }
    onConfirm(item, selectedToppings());
  };

  return (
    <DialogCustom
      open={open}
      onOpenChange={onOpenChange}
      headerTitle={item.name}
      desc={`Chọn tuỳ chọn trước khi thêm vào đơn · ${item.price.toLocaleString('vi-VN')}đ`}
      /* DialogCustom mặc định ẩn nút đóng → đè style khung để ghép header/body/footer liền mạch */
      contentClass="!max-w-screen !max-h-[100dvh] w-screen md:w-[400px] lg:w-[600px] p-4"
      content={
        <>
          {/* Nút đóng thủ công (POS cảm ứng không có phím Escape) */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Đóng"
            className="absolute top-2.5 right-2.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600 active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="max-h-[52vh] space-y-5 overflow-y-auto px-5 py-4">
            {optionGroups.map((group, index) => {
              const chosen = selected[index] || [];
              const hasError = errorGroups.includes(index);
              const isMultiple = group.type === 'multiple';
              const max = group.max ?? group.choices.length;

              return (
                <fieldset key={group.name}>
                  {/* Tiêu đề nhóm: tên + trạng thái bắt buộc + bộ đếm đã chọn */}
                  <legend className="mb-2 flex w-full items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{group.name}</span>
                    {group.required ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-600">
                        Bắt buộc
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Tuỳ chọn
                      </span>
                    )}
                    {isMultiple && (
                      <span className="ml-auto text-[11px] font-semibold tabular-nums text-slate-400">
                        Đã chọn {chosen.length}/{max}
                      </span>
                    )}
                  </legend>

                  <div
                    className={cn(
                      'grid gap-2 rounded-xl',
                      group.choices.length <= 3 ? 'grid-cols-1' : 'grid-cols-2',
                      hasError && 'ring-2 ring-rose-300 ring-offset-2',
                    )}
                  >
                    {group.choices.map((choice) => {
                      const isSelected = chosen.includes(choice.name);
                      return (
                        <button
                          key={choice.name}
                          type="button"
                          role={isMultiple ? 'checkbox' : 'radio'}
                          aria-checked={isSelected}
                          onClick={() => toggleChoice(index, group, choice.name)}
                          className={cn(
                            'flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm transition-all duration-150 active:scale-[0.98]',
                            isSelected
                              ? 'border-cerulean-blue-500 bg-cerulean-blue-50 font-bold text-cerulean-blue-700 shadow-sm'
                              : 'border-slate-200 bg-white font-medium text-slate-600 hover:border-cerulean-blue-300 hover:bg-slate-50',
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {/* Ô đánh dấu: vuông = chọn nhiều, tròn = chọn 1 */}
                            <span
                              className={cn(
                                'flex h-5 w-5 shrink-0 items-center justify-center border-2 transition-colors duration-150',
                                isMultiple ? 'rounded-md' : 'rounded-full',
                                isSelected
                                  ? 'border-cerulean-blue-500 bg-cerulean-blue-500 text-white'
                                  : 'border-slate-300 bg-white',
                              )}
                            >
                              {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                            </span>
                            <span className="truncate" title={choice.name}>
                              {choice.name}
                            </span>
                          </span>
                          {choice.price > 0 && (
                            <span
                              className={cn(
                                'shrink-0 text-xs font-extrabold tabular-nums',
                                isSelected ? 'text-cerulean-blue-700' : 'text-slate-400',
                              )}
                            >
                              +{choice.price.toLocaleString('vi-VN')}đ
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Lỗi hiển thị ngay dưới nhóm vi phạm — screen reader đọc được */}
                  {hasError && (
                    <p
                      role="alert"
                      className="mt-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold text-rose-600"
                    >
                      <CircleAlert className="h-3.5 w-3.5 shrink-0" />
                      Vui lòng chọn cho nhóm "{group.name}"
                    </p>
                  )}
                </fieldset>
              );
            })}
          </div>

          {/* Footer ghim dưới: tổng cộng + nút thêm */}
          <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-4">
            <div className="leading-tight">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Tổng cộng
              </p>
              <p className="text-lg font-extrabold tabular-nums text-cerulean-blue-700">
                {totalPrice.toLocaleString('vi-VN')}đ
              </p>
            </div>
            <button
              type="button"
              onClick={handleConfirm}
              className="h-12 min-w-[160px] cursor-pointer rounded-xl bg-cerulean-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-cerulean-blue-200 transition-all duration-150 hover:bg-cerulean-blue-700 active:scale-[0.97]"
            >
              Thêm vào đơn
            </button>
          </div>
        </>
      }
    />
  );
}
