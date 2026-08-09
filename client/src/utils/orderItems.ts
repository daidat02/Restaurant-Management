import type { IOrderItem } from '@/types/order.type';
import { extractId } from './helpers';

/**
 * Gộp các OrderItem trùng menuItem thành 1 dòng hiển thị (chi tiết đơn / bill).
 * - quantity: tổng số lượng các lần gọi.
 * - status/price/name: theo item CUỐI CÙNG (mới nhất) — nếu món cũ đã served mà
 *   gọi thêm món mới, cả mục hiển thị quay về trạng thái của món mới (đang chờ bếp).
 */
export const mergeOrderItems = (items: IOrderItem[]): IOrderItem[] => {
  // Sắp xếp theo thời gian tạo tăng dần → item cuối trong nhóm = món gọi mới nhất
  const sorted = [...items].sort((a, b) => {
    const ta = new Date(a.createdAt || a.updatedAt || 0).getTime();
    const tb = new Date(b.createdAt || b.updatedAt || 0).getTime();
    return ta - tb;
  });

  const map = new Map<string, IOrderItem>();

  for (const item of sorted) {
    const menuKey = extractId(item.menuItem);
    if (!menuKey) continue;

    // Gộp khi giống menuItem + note + toppings (tránh gộp nhầm 2 món cùng tên khác yêu cầu)
    const key = `${menuKey}|${item.note || ''}|${JSON.stringify(item.toppings || [])}`;

    const existing = map.get(key);
    if (existing) {
      existing.quantity += item.quantity;
      existing.status = item.status;
      existing.nameSnapshot = item.nameSnapshot;
      existing.priceSnapshot = item.priceSnapshot;
      existing._id = item._id;
    } else {
      map.set(key, { ...item });
    }
  }

  return Array.from(map.values());
};
