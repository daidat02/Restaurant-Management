import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface IUpsellMeta {
  /** Loại tài nguyên vượt trần (tables/items/staff) hoặc feature bị chặn. */
  resource?: string;
  limit?: number;
  used?: number;
  planKey?: string;
  feature?: string;
}

interface UpsellState {
  /** Modal upsell đang mở hay không. */
  open: boolean;
  /** Loại upsell: nhà hàng bị khoá / vượt giới hạn gói. */
  type: 'locked' | 'plan-limit';
  /** Nhà hàng bị ảnh hưởng (nếu biết). */
  restaurantId: string | null;
  message: string;
  /** Metadata lỗi giới hạn gói từ server (planKey/resource/limit/used/feature). */
  meta: IUpsellMeta | null;
}

const initialState: UpsellState = {
  open: false,
  type: 'locked',
  restaurantId: null,
  message: '',
  meta: null,
};

const upsellSlice = createSlice({
  name: 'upsell',
  initialState,
  reducers: {
    openUpsell: (
      state,
      action: PayloadAction<
        Partial<Pick<UpsellState, 'restaurantId' | 'message' | 'type' | 'meta'>>
      >,
    ) => {
      state.open = true;
      state.type = action.payload.type ?? 'locked';
      state.restaurantId = action.payload.restaurantId ?? null;
      state.message = action.payload.message ?? 'Nhà hàng đã bị khoá do hết hạn thanh toán';
      state.meta = action.payload.meta ?? null;
    },
    closeUpsell: (state) => {
      state.open = false;
      state.type = 'locked';
      state.restaurantId = null;
      state.message = '';
      state.meta = null;
    },
  },
});

export const { openUpsell, closeUpsell } = upsellSlice.actions;
export default upsellSlice.reducer;
