import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { IMenuItem } from '@/types/category.type';
import type { IOrder } from '@/types/order.type';

interface CartItem {
  food: IMenuItem;
  quantity: number;
}

interface CartState {
  cartItems: CartItem[];
}

const initialState: CartState = {
  cartItems: [],
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Action: Thêm món ăn mới hoặc tăng số lượng nếu đã có
    addToCart: (state, action: PayloadAction<{ food: IMenuItem; quantity?: number }>) => {
      const { food, quantity } = action.payload;
      // Bỏ dấu ?. để Immer theo dõi biến chính xác 100%
      const existing = state.cartItems?.find((item) => item.food._id === food._id);
      if (existing) {
        existing.quantity += quantity || 1;
      } else {
        state.cartItems?.push({
          food: food,
          quantity: quantity || 1,
        });
      }
    },

    // Action: Cập nhật tăng/giảm số lượng
    updateQuantity: (state, action: PayloadAction<{ id: string; delta: number }>) => {
      const { id, delta } = action.payload;
      const existing = state.cartItems.find((item) => item.food._id === id);

      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty > 0) {
          existing.quantity = newQty;
        } else {
          // Khi lọc mảng (filter), Immer yêu cầu gán đè lại chính mảng đó để cập nhật vùng nhớ mới
          state.cartItems = state.cartItems.filter((item) => item.food._id !== id);
        }
      }
    },

    // Action: Xóa sạch giỏ hàng sau khi đặt đơn thành công
    clearCart: (state) => {
      state.cartItems = [];
    },
  },
});

export const { addToCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
