import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UpsellState {
  /** Modal upsell (nhà hàng bị khoá) đang mở hay không. */
  open: boolean;
  /** Nhà hàng bị khoá (nếu biết). */
  restaurantId: string | null;
  message: string;
}

const initialState: UpsellState = {
  open: false,
  restaurantId: null,
  message: '',
};

const upsellSlice = createSlice({
  name: 'upsell',
  initialState,
  reducers: {
    openUpsell: (state, action: PayloadAction<Partial<Pick<UpsellState, 'restaurantId' | 'message'>>>) => {
      state.open = true;
      state.restaurantId = action.payload.restaurantId ?? null;
      state.message = action.payload.message ?? 'Nhà hàng đã bị khoá do hết hạn thanh toán';
    },
    closeUpsell: (state) => {
      state.open = false;
      state.restaurantId = null;
      state.message = '';
    },
  },
});

export const { openUpsell, closeUpsell } = upsellSlice.actions;
export default upsellSlice.reducer;
