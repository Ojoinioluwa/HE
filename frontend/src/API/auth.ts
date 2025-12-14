// src/api/auth.ts

const API_BASE_URL = '/api/v1'; // Base path for your Express routes

interface LoginResponse {
    token: string;
    // Assuming your backend returns a token on success
}

interface RegisterResponse {
    message: string;
}

// --- Login ---
export const loginUser = async ({ email, password }: any): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Login failed. Invalid credentials.');
    }
    return data;
};

// --- Registration ---
export const registerUser = async (formData: any): Promise<RegisterResponse> => {
    const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
        // Handle validation errors from the backend
        const errorMessage = data.errors?.join(', ') || data.message || 'Registration failed.';
        throw new Error(errorMessage);
    }
    return data;
};