/**
 * Converts an Image File (PNG, JPG) into a flat array of normalized numeric values (0.0 to 1.0).
 * This array can then be encrypted using Homomorphic Encryption.
 * * @param file - The image file object (File or Blob).
 * @param targetSize - The desired dimension (e.g., 64 for 64x64 image). Must be square for simplicity.
 * @returns A promise that resolves to an array of numbers (R, G, B, A, or grayscale values).
 */

import { HE_PARAMS } from "./heClient";

/**
 * Converts an Image File (PNG, JPG) into a flat array of normalized numeric values (0.0 to 1.0).
 */


export async function imageFileToNormalizedVector(
    file: File,
    targetSize: number = 36
): Promise<number[]> {
    if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image type (e.g., JPEG, PNG).');
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    return reject(new Error("Could not get canvas context."));
                }

                // 1. Set canvas size to the target HE dimension
                canvas.width = targetSize;
                canvas.height = targetSize;

                // 2. Draw and resize
                ctx.drawImage(img, 0, 0, targetSize, targetSize);

                // 3. Extract RGBA data
                const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
                const pixelData = imageData.data;

                const vector: number[] = [];

                // 4. Normalize RGB values
                for (let i = 0; i < pixelData.length; i += 4) {
                    vector.push(pixelData[i] / 255.0);     // R
                    vector.push(pixelData[i + 1] / 255.0); // G
                    vector.push(pixelData[i + 2] / 255.0); // B
                    // Alpha is skipped
                }

                // 5. Slot Capacity Check
                const availableSlots = HE_PARAMS.ckks.polyModulusDegree / 2;

                if (vector.length > availableSlots) {
                    return reject(new Error(
                        `Vector size (${vector.length}) exceeds CKKS slot capacity (${availableSlots}). ` +
                        `For RGB, use targetSize 32 or smaller.`
                    ));
                }

                resolve(vector);
            };
            img.onerror = () => reject(new Error('Failed to load image.'));
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('File read error.'));
        reader.readAsDataURL(file);
    });
}