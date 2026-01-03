export interface CiphertextMetadata {
    type: "image" | "text" | "audio" | string;
    uploadedAt: string; // ISO Date string
    resolution?: string; // e.g., "26x26"
    channels?: number;   // 1 for grayscale, 3 for RGB
    format: string;      // e.g., "grayscale-vector" or "color-vector"
    fileName?: string;
    sizeBytes: number;
    charCount?: number;  // Optional, for text types
}

export interface CiphertextRecord {
    _id: string;         // MongoDB ObjectId string
    userId: string;      // Owner's ObjectId string
    dataId: string;      // Your unique human-readable ID
    ciphertextBase64: string;
    scheme: "ckks" | "bfv" | "bgv";
    metadata: CiphertextMetadata;
    createdAt: string;   // ISO Date string
}

// Example usage for API responses:
export type GetCiphertextsResponse = CiphertextRecord[];