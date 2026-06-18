import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface RestaurantState {
  restaurantSelected: string | null;
}

const initialState: RestaurantState = {
  restaurantSelected: null,
};

const restaurantSlice = createSlice({
  name: 'restaurant',
  initialState: initialState,
  reducers: {
    selectRestaurant: (state, action: PayloadAction<string>) => {
      state.restaurantSelected = action.payload || null;
    },
  },
});

export const { selectRestaurant } = restaurantSlice.actions;

export default restaurantSlice.reducer;
