import axios from "axios"
import catchAxiosError from "../utils/catchAxiosError"
import type { Login, LoginResponse, User, VerifyEmail } from "../types/userType"
import { BASE_URL } from '../utils/url';
import { getUserFromStorage } from "../utils/getUserFromStorage";


export const LoginAPI = async ({ email, password }: Login): Promise<LoginResponse> => {
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, { email, password })
        return response.data
    } catch (error) {
        catchAxiosError(error, "LoginAPI Error")
        throw error
    }
}

export const RegisterAPI = async ({ email, password, phoneNumber, firstName, lastName, }: User) => {
    try {
        const response = await axios.post(`${BASE_URL}/auth/register`, { email, password, phoneNumber, firstName, lastName })
        return response.data
    } catch (error) {
        catchAxiosError(error, "RegisterAPI Error");
        throw error
    }
}

export const VerifyEmailAPI = async ({ email, verificationCode }: VerifyEmail) => {
    try {
        const response = await axios.post(`${BASE_URL}/auth/verify-user`, { email, verificationCode })
        return response.data
    } catch (error) {
        catchAxiosError(error, "VerifyEmailAPI Error")
        throw error
    }
}

// Updated to only require email and point to the correct endpoint
export const ResendOTPAPI = async (data: { email: string }) => {
    try {
        // Change the URL to match your resend route
        const response = await axios.post(`${BASE_URL}/auth/resend-otp`, data);
        return response.data;
    } catch (error) {
        catchAxiosError(error, "ResendOTPAPI Error");
        throw error;
    }
};

export const GetUserAPI = async () => {
    try {
        const user = await getUserFromStorage();
        const token = user?.token;

        if (!token) {
            alert("Token not found")
            throw new Error("No token found in storage");
        }

        const response = await axios.get(`${BASE_URL}/getUserProfile`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        return response.data;
    } catch (error) {
        catchAxiosError(error, "GetUserAPI");
    }
};


// this gets the salt along with the _id for the user can be used in encryption and decryption for the authorized user
export const GetSaltAPI = async (email: string): Promise<{ message: string; salt: string, id: string } | undefined> => {
    try {
        const encodedEmail = encodeURIComponent(email);
        const response = await axios.get(`${BASE_URL}/getSaltAndId?email=${encodedEmail}`);
        return response.data;
    } catch (error) {
        catchAxiosError(error, "GetSaltAPI");
        return undefined;
    }
};


export const UpdateHEKeysAPI = async (keysAndParams: any) => {
    const user = await getUserFromStorage();

    const token = user?.token;
    const response = await axios.post(`${BASE_URL}/update-he-keys`, keysAndParams, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    return response.data;
};
