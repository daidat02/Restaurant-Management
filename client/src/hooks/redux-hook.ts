import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '@/redux/store/store'; // Trỏ về file store.ts

// Sử dụng 2 hàm này trong toàn bộ app thay vì useDispatch và useSelector mặc định
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;