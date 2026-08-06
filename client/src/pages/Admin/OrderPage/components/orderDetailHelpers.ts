import type { IOrderItem } from '@/types/order.type';

// Tính tổng tiền 1 món bao gồm topping x số lượng
export const calcItemTotal = (item: IOrderItem): number => {
  const toppingTotal = item.toppings?.reduce((acc, top) => acc + top.price, 0) || 0;
  return (item.priceSnapshot + toppingTotal) * item.quantity;
};

// Format tiền theo chuẩn hiển thị hiện tại của OrderDetail (giữ nguyên UI)
export const formatPrice = (value: number): string => `${value.toLocaleString('vi-VN')} đ`;
