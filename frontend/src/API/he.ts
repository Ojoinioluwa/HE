// src/api/he.ts

import type { CiphertextRecord } from "../types/heTypes";
import { getUserFromStorage } from "../utils/getUserFromStorage";

const API_BASE_URL = 'https://he-400l.onrender.com/api/v1/he';

// Helper function to get the auth header
const getAuthHeaders = (token: string) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
});

export interface InitPayload {
    scheme: string;
    params: any;
    publicKey: string;
    evaluationKeys: string;
    wrappedSecretKey: string;
    isInitialized: boolean,
    coeffModulusBitSizes: [number]
}

export interface UploadPayload {
    dataId: string;
    ciphertextBase64: string;
    scheme: string;
    metadata?: any;
}

export const getMyUploads = async () => {
    const user = await getUserFromStorage();
    const token = user?.token;

    if (!token) throw new Error("No authentication token found");

    const response = await fetch(`${API_BASE_URL}/data/my-uploads`, {
        method: 'GET',
        headers: getAuthHeaders(token)
    });

    const data = await response.json();


    if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch uploads.');
    }

    return data.uploads; // Returns the array of ciphertext objects
};

// 1. Initialize HE Context
export const InitializeHEServerAPI = async (payload: InitPayload) => {
    const user = await getUserFromStorage();
    const token = user?.token;
    console.log(token)
    console.log(payload)
    const response = await fetch(`${API_BASE_URL}/init`, {
        method: 'POST',
        headers: getAuthHeaders(token!),
        body: JSON.stringify(payload),
    });
    const data = await response.json();
    console.log(data)
    if (!response.ok) {
        throw new Error(data.details || data.error || 'HE context initialization failed.');
    }
    return data;
};


// 2. Upload Encrypted Data
export const uploadCiphertext = async (payload: UploadPayload) => {
    const user = await getUserFromStorage();

    const token = user?.token;
    const response = await fetch(`${API_BASE_URL}/data/upload`, {
        method: 'POST',
        headers: getAuthHeaders(token!),
        body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.details || data.error || 'Ciphertext upload failed.');
    }
    return data;
};


// 3. Fetch list of uploaded Ciphertexts
export interface CiphertextSummary {
    _id: string; // MongoDB ObjectId
    dataId: string; // The user-defined unique ID (e.g., 'Q4_Sales_2025')
    scheme: string;
    ciphertextLength: number;
    uploadedAt: string;
    metadata: any;
}




export const fetchCiphertextList = async (): Promise<CiphertextSummary[]> => {
    const user = await getUserFromStorage();
    const token = user?.token;
    const response = await fetch(`${API_BASE_URL}/data/list`, {
        method: 'GET',
        headers: getAuthHeaders(token!),
    });

    const data = await response.json();

    console.log(data)
    if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to fetch ciphertext list.');
    }
    // Assuming the backend returns an array of summary objects
    return data;
};



// 4. Fetch single Ciphertext content (Base64 string)
export const fetchCiphertextContent = async (dataId: string): Promise<{ ciphertextBase64: string }> => {

    const user = await getUserFromStorage();
    const token = user?.token;

    const getAuthHeaders = (t: string) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` });

    // Assuming your backend has a GET endpoint like /api/v1/he/data/Q4_Sales_2025
    const response = await fetch(`${API_BASE_URL}/data/${dataId}`, {
        method: 'GET',
        headers: getAuthHeaders(token!),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.details || data.error || `Failed to fetch ciphertext for ID: ${dataId}`);
    }
    // Returns { ciphertextBase64: '...' }
    return data;
};


export const getCiphertextById = async (id: string): Promise<CiphertextRecord> => {
    const user = await getUserFromStorage();
    const token = user?.token;
    const getAuthHeaders = (t: string) => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${t}` });

    console.log("I was here")

    // Assuming your backend has a GET endpoint like /api/v1/he/data/Q4_Sales_2025
    const response = await fetch(`${API_BASE_URL}/data/getCipherByid/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(token!),
    });

    const data = await response.json();
    console.log(data)

    if (!response.ok) {
        throw new Error(data.details || data.error || `Failed to fetch ciphertext for ID: ${id}`);
    }
    return data;
};


interface ComputationRequest {
    token: string;
    dataIds: string[]; // List of IDs to operate on
    resultId: string; // New ID for the resulting ciphertext
}

interface MultiplyRequest {
    token: string;
    dataId_A: string;
    dataId_B: string;
    resultId: string;
}

interface ComputationResponse {
    ciphertextBase64: string;
    scheme: string;
    resultId: string;
}

// 5. Homomorphic Sum (Sum(CTs))
export const computeSum = async ({ token, dataIds, resultId }: ComputationRequest): Promise<ComputationResponse> => {
    const response = await fetch(`${API_BASE_URL}/compute/sum`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ dataIds, resultId }),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.details || data.error || 'Homomorphic Sum failed.');
    }
    return data;
};

// 6. Homomorphic Average (Sum(CTs) * (1/N))
export const computeAverage = async ({ token, dataIds, resultId }: ComputationRequest): Promise<ComputationResponse> => {
    const response = await fetch(`${API_BASE_URL}/compute/average`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ dataIds, resultId }),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.details || data.error || 'Homomorphic Average failed.');
    }
    return data;
};

// 7. Homomorphic Multiplication (CT * CT)
export const computeMultiply = async ({ token, dataId_A, dataId_B, resultId }: MultiplyRequest): Promise<ComputationResponse> => {
    const response = await fetch(`${API_BASE_URL}/compute/multiply`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ dataId_A, dataId_B, resultId }),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.details || data.error || 'Homomorphic Multiplication failed. Check RelinKeys.');
    }
    return data;
};

// 8. Homomorphic Linear Regression (Requires two vectors: features & targets)
export const computeLinearRegression = async ({ token, dataId_A, dataId_B, resultId }: MultiplyRequest): Promise<ComputationResponse> => {
    // Assuming backend uses a similar payload structure to multiplication for two inputs
    const response = await fetch(`${API_BASE_URL}/compute/linearRegression`, {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
            dataId_A: dataId_A,
            dataId_B: dataId_B,
            resultId: resultId
        }),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.details || data.error || 'Homomorphic Linear Regression failed.');
    }
    return data;
};


export const runHEComputation = async (type: 'sum' | 'multiply' | 'average' | 'linear-regression', payload: any) => {
    const user = await getUserFromStorage();
    const token = user?.token
    const response = await fetch(`${API_BASE_URL}/compute/${type}`, {
        method: 'POST',
        headers: getAuthHeaders(token!),
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Computation failed');
    }
    return await response.json();
};