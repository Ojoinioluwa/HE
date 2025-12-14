
// src/store/authSlice.ts

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';


// Define the state structure
interface AuthState {
    token: string | null;
    isAuthenticated: boolean;
    secretKeyBase64: string | null;
    userRole: 'CLIENT' | 'ANALYST' | null;
}

const initialState: AuthState = {
    token: localStorage.getItem('authToken'), // Try to read from storage on startup
    isAuthenticated: !!localStorage.getItem('authToken'),
    secretKeyBase64: null, // NEVER store the Secret Key in localStorage!
    userRole: null,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Reducer for successful login
        setAuth: (state, action: PayloadAction<{ token: string; role: 'CLIENT' | 'ANALYST' }>) => {
            state.token = action.payload.token;
            state.isAuthenticated = true;
            state.userRole = action.payload.role;
            localStorage.setItem('authToken', action.payload.token); // Store token persistently
        },
        // Reducer for storing the Secret Key generated client-side
        setSecretKey: (state, action: PayloadAction<string>) => {
            state.secretKeyBase64 = action.payload;
        },
        // Reducer for logout
        logout: (state) => {
            state.token = null;
            state.isAuthenticated = false;
            state.secretKeyBase64 = null;
            state.userRole = null;
            localStorage.removeItem('authToken');
            // NOTE: The secretKey should be handled safely on page close/logout (e.g., via browser session storage or cleared explicitly)
        },
    },
});

export const { setAuth, setSecretKey, logout } = authSlice.actions;

export default authSlice.reducer;