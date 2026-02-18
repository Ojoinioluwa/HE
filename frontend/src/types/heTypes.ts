export interface CiphertextMetadata {
    // Core Identity
    type: "image" | "text" | "audio" | "result";
    format: "color-vector" | "grayscale-vector" | "text-sequence" | "numeric-vector";
    uploadedAt: string;

    // Image Specifics
    width?: number;      // Changed to number for direct use in canvas logic
    height?: number;     // e.g., 36
    channels?: number;   // 3 for RGB
    resolution?: string; // "36x36" for display purposes
    pixelCount?: number; // width * height

    // Computation & Lineage (Crucial for Dashboard logic)
    operation: "source" | "sum" | "average" | "regression";
    averageCount?: number;    // If this is a result, how many items were averaged?
    sourceDataIds?: string[]; // The IDs of the original records used to make this result
    processedAt?: string;     // When the HE computation happened

    displayUrl: string
    // File & Size Info
    fileName?: string;
    sizeBytes: number;
    charCount?: number;
    vectorLength?: number;    // e.g., 3888 (important for slot padding safety)
}

export interface CiphertextRecord {
    _id: string;
    userId: string;
    dataId: string;
    ciphertextBase64: string;
    scheme: "ckks" | "bfv" | "bgv";
    metadata: CiphertextMetadata;
    createdAt: string;
}

export type GetCiphertextsResponse = CiphertextRecord[];