import type { IUser } from "@/types/user.type";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// Trích ID từ field restaurant có thể đã populate hoặc chưa (string/ObjectId)
const idOf = (field: any): string => {
  if (!field) return '';
  if (typeof field === 'object') return field._id || field.id || '';
  return String(field);
};

interface AuthState {
    user: IUser | null; // Có thể có user (đã login) hoặc null (chưa login)
    isAuthenticated: boolean;
    token: string | null;
    /** Nhà hàng đang làm việc (đa tenant). null nếu chưa chọn / super-admin / customer. */
    currentRestaurantId: string | null;
}

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    token: null,
    currentRestaurantId: null,
};

// Tự chọn nhà hàng mặc định sau login:
// - đúng 1 nhà hàng -> chọn luôn; nhiều nhà hàng -> null (chờ màn hình chọn)
// - super-admin / customer -> null
const deriveDefaultRestaurant = (user: IUser | null): string | null => {
  if (!user) return null;
  if (user.role === 'super-admin' || user.role === 'customer') return null;
  const ids = Array.isArray(user.restaurantIds) ? user.restaurantIds : [];
  if (ids.length === 1) return idOf(ids[0]);
  if (ids.length > 1) return null;
  // Legacy: chỉ có field `restaurant`
  return idOf(user.restaurant) || null;
};

const authSlice = createSlice({
    name: "auth",
    initialState: initialState,
    reducers: {
        login: (state, action: PayloadAction<{ user: IUser; token: string }>) => {
            state.isAuthenticated = true;
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.currentRestaurantId = deriveDefaultRestaurant(action.payload.user);
        },
        logout: (state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
            state.currentRestaurantId = null;
        },
        refreshToken: (state, action: PayloadAction<string>) => {
            state.token = action.payload;
        },
        setCurrentRestaurantId: (state, action: PayloadAction<string | null>) => {
            state.currentRestaurantId = action.payload;
        },
        updateUserInfo: (state, action: PayloadAction<Partial<IUser>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
            }
        }
    },
});

export const { login, logout, refreshToken, setCurrentRestaurantId, updateUserInfo } = authSlice.actions;

export default authSlice.reducer;
