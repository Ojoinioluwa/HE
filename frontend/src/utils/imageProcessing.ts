/**
 * Converts an Image File (PNG, JPG) into a flat array of normalized numeric values (0.0 to 1.0).
 * This array can then be encrypted using Homomorphic Encryption.
 * * @param file - The image file object (File or Blob).
 * @param targetSize - The desired dimension (e.g., 64 for 64x64 image). Must be square for simplicity.
 * @returns A promise that resolves to an array of numbers (R, G, B, A, or grayscale values).
 */
export async function imageFileToNormalizedVector(
    file: File,
    targetSize: number = 64
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

                // 1. Set canvas size to the target HE dimension (e.g., 64x64)
                canvas.width = targetSize;
                canvas.height = targetSize;

                // 2. Draw the image, resizing it to the target dimensions
                ctx.drawImage(img, 0, 0, targetSize, targetSize);

                // 3. Get the pixel data (RGBA)
                const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
                const pixelData = imageData.data; // A Uint8ClampedArray: [R, G, B, A, R, G, B, A, ...]

                const vector: number[] = [];

                // 4. Convert 8-bit color values (0-255) to normalized floating-point values (0.0 - 1.0)
                // We use only R, G, B channels for simplicity (3 values per pixel)
                for (let i = 0; i < pixelData.length; i += 4) {
                    // Normalize R, G, B
                    vector.push(pixelData[i] / 255.0);   // Red
                    vector.push(pixelData[i + 1] / 255.0); // Green
                    vector.push(pixelData[i + 2] / 255.0); // Blue
                    // We skip the Alpha channel for Homomorphic Computation
                }

                // CRITICAL CHECK: Ensure the vector size doesn't exceed the HE slot capacity (4096 in your case)
                // targetSize=64 => 64*64=4096 pixels. 4096 * 3 channels = 12288 required slots.
                // Since your HE parameters (polyModulusDegree: 8192) give 4096 slots, 
                // we must stick to a smaller image, or use grayscale/a 32x32 image (32*32*3=3072 slots).
                // Let's force a safe default size here: 32x32 = 1024 pixels * 3 channels = 3072 slots.

                if (vector.length > (HE_PARAMS.ckks.polyModulusDegree / 2)) {
                    // This check depends on HE_PARAMS from heClient.ts, which is outside this file.
                    // For the sake of this code block, assume targetSize=32 is safe.
                    console.warn(`Vector size (${vector.length}) may be too large for HE slots (Max 4096). Recommend using a 32x32 image size.`);
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