import pica from 'pica';

const picaInstance = pica();

/**
 * Browser-safe high-quality image normalization using Pica.
 * Acts as a Sharp replacement for high-fidelity downscaling.
 */
export async function imageFileToNormalizedVector(
    file: File,
    targetSize: number = 36
): Promise<number[]> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = async () => {
            try {
                URL.revokeObjectURL(img.src); // Memory management

                // 1. Create source canvas for cropping
                const sourceCanvas = document.createElement('canvas');
                const minDim = Math.min(img.width, img.height);
                sourceCanvas.width = minDim;
                sourceCanvas.height = minDim;

                const sCtx = sourceCanvas.getContext('2d', { alpha: false });
                if (!sCtx) throw new Error("Source context failed");

                // Center crop logic
                const sx = (img.width - minDim) / 2;
                const sy = (img.height - minDim) / 2;
                sCtx.drawImage(img, sx, sy, minDim, minDim, 0, 0, minDim, minDim);

                // 2. Create target canvas for 36x36 output
                const targetCanvas = document.createElement('canvas');
                targetCanvas.width = targetSize;
                targetCanvas.height = targetSize;

                // 3. Use PICA for high-quality Lanczos downscaling
                await picaInstance.resize(sourceCanvas, targetCanvas, {
                    unsharpAmount: 80, // Adds back a little "pop" lost in downscaling
                    unsharpRadius: 0.6,
                    unsharpThreshold: 2
                });

                // 4. Extract Pixel Data
                const tCtx = targetCanvas.getContext('2d', { willReadFrequently: true });
                if (!tCtx) throw new Error("Target context failed");

                const imageData = tCtx.getImageData(0, 0, targetSize, targetSize);
                const pixelData = imageData.data;
                const vector: number[] = [];

                // RGB only (Length: 3888)
                for (let i = 0; i < pixelData.length; i += 4) {
                    vector.push(pixelData[i] / 255.0);     // R
                    vector.push(pixelData[i + 1] / 255.0); // G
                    vector.push(pixelData[i + 2] / 255.0); // B
                }

                resolve(vector);
            } catch (err) {
                reject(err);
            }
        };

        img.onerror = () => reject(new Error("Failed to load image file"));
        img.src = URL.createObjectURL(file);
    });
}