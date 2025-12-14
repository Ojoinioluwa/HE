// src/store/store.ts

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slice/authSlice.ts';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        // Add other slices here (e.g., 'ui', 'settings')
    },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;