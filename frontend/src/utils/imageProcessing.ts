/**
 * Converts an Image File (PNG, JPG) into a flat array of normalized numeric values (0.0 to 1.0).
 * This array can then be encrypted using Homomorphic Encryption.
 * * @param file - The image file object (File or Blob).
 * @param targetSize - The desired dimension (e.g., 64 for 64x64 image). Must be square for simplicity.
 * @returns A promise that resolves to an array of numbers (R, G, B, A, or grayscale values).
 */


export async function imageFileToNormalizedVector(
    file: File,
    targetSize: number = 36 // Increased from 32 to 36 for max capacity
): Promise<number[]> {
    // ... existing file type checks ...

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error("Canvas context failed"));

                canvas.width = targetSize;
                canvas.height = targetSize;

                // --- NEW: CENTER CROP LOGIC ---
                // Find the smallest dimension to make a perfect square
                const minDim = Math.min(img.width, img.height);
                const sx = (img.width - minDim) / 2; // Source X offset
                const sy = (img.height - minDim) / 2; // Source Y offset

                // Draw center-cropped square into the targetSize canvas
                ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
                // ------------------------------

                const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
                const pixelData = imageData.data;
                const vector: number[] = [];

                for (let i = 0; i < pixelData.length; i += 4) {
                    vector.push(pixelData[i] / 255.0);     // R
                    vector.push(pixelData[i + 1] / 255.0); // G
                    vector.push(pixelData[i + 2] / 255.0); // B
                }

                resolve(vector);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    });
}