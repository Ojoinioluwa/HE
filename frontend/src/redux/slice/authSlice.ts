// src/store/authSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
    token: string | null;
    isAuthenticated: boolean;
    secretKeyBase64: string | null;
}

const initialState: AuthState = {
    token: localStorage.getItem('userInfo'),
    isAuthenticated: !!localStorage.getItem('userInfo'),
    secretKeyBase64: localStorage.getItem('heSecretKey') || null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setAuth: (state, action: PayloadAction<{ token: string; }>) => {
            state.token = action.payload.token;
            state.isAuthenticated = true;
            localStorage.setItem('userInfo', action.payload.token);
        },
        setSecretKey: (state, action: PayloadAction<string>) => {
            state.secretKeyBase64 = action.payload;
            // Persist the secret key so it survives page refreshes
            localStorage.setItem('heSecretKey', action.payload);
        },
        logout: (state) => {
            state.token = null;
            state.isAuthenticated = false;
            state.secretKeyBase64 = null;
            localStorage.removeItem('userInfo');
            localStorage.removeItem('heSecretKey'); // Clean up on logout
        },
    },
});

export const { setAuth, setSecretKey, logout } = authSlice.actions;
export default authSlice.reducer;