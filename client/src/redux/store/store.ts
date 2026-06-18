import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';

// 1. KHÔNG IMPORT BẤT KỲ CÁI GÌ TỪ 'redux-persist/lib/storage...' NỮA

// 2. Tự viết một cái Custom Storage bọc ngoài window.localStorage của trình duyệt
const customStorage = {
  getItem: (key: string) => {
    return Promise.resolve(window.localStorage.getItem(key));
  },
  setItem: (key: string, value: string) => {
    window.localStorage.setItem(key, value);
    return Promise.resolve(value);
  },
  removeItem: (key: string) => {
    window.localStorage.removeItem(key);
    return Promise.resolve();
  },
};

import authReducer from '../slices/authSlice';
import cartReducer from '../slices/cartSlice';
import restaurantReducer from '../slices/restaurantSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  cart: cartReducer,
  restaurant: restaurantReducer,
});

const persistConfig = {
  key: 'root',
  version: 1,
  storage: customStorage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export let persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
