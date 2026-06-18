import type { IUser } from "@/types/user.type";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
    user: IUser | null; // Có thể có user (đã login) hoặc null (chưa login)
    isAuthenticated: boolean;
    token: string | null;
}

const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    token: null,
};

const authSlice = createSlice({
    name: "auth",
    initialState: initialState,
    reducers: {
        login: (state, action: PayloadAction<{ user: IUser; token: string }>) => {
            state.isAuthenticated = true;
            state.user = action.payload.user;
            state.token = action.payload.token;
        },
        logout: (state) => {
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
        },
        refreshToken: (state, action: PayloadAction<string>) => {
            state.token = action.payload;
        }
    },
});

export const { login, logout, refreshToken } = authSlice.actions;

export default authSlice.reducer;