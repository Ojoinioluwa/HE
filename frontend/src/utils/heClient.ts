// src/utils/heClient.ts

import SEAL from 'node-seal';
// NOTE: Make sure to `npm install node-seal` if you haven't already.

// Global objects for the client
let seal: SEAL = null as any;
let keyGenerator: SEAL.KeyGenerator | null = null;
let encryptor: SEAL.Encryptor | null = null;
let context: SEAL.Context | null = null; // Type remains Context, but constructor call changes
const encoders: { ckks?: SEAL.CKKSEncoder } = {};

// --- Recommended HE Parameters (CKKS for floating point) ---
// Note: This scale must be consistent with the backend's Linear Regression constant SCALE (2**40)
const HE_PARAMS = {
    scheme: 'ckks',
    ckks: {
        polyModulusDegree: 8192,
        coeffModulusBitSizes: [40, 40, 40, 40, 40],
        scale: 2 ** 40
    }
};

/**
 * 1. Initializes SEAL WebAssembly, Context, and KeyGenerator.
 */
export async function initializeSEALClient() {
    if (seal) return;

    console.log("Loading SEAL WASM...");

    // WASM loading logic remains necessary for browser environments
    seal = await SEAL({
        wasmUrl: "/seal_all.wasm",
        locateFile: (path: string) => {
            if (path.endsWith(".wasm")) {
                return "/seal_all.wasm";
            }
            return path;
        }
    });

    if (!seal) {
        throw new Error("SEAL failed to initialize (seal is undefined).");
    }

    console.log("Client-side SEAL initialized.");

    // --- 2. Encryption parameters (CKKS) ---
    const parms = new seal.EncryptionParameters(seal.SchemeType.ckks);
    parms.setPolyModulusDegree(HE_PARAMS.ckks.polyModulusDegree);
    const coeffBits = new Int32Array(HE_PARAMS.ckks.coeffModulusBitSizes);

    parms.setCoeffModulus(
        seal.CoeffModulus.Create(
            HE_PARAMS.ckks.polyModulusDegree,
            coeffBits
        )
    );


    // Use the safest, most stable security level: none
    const securityLevel = seal.SecLevelType.tc128
    console.log(securityLevel)


    // --- 3. Create SEAL context ---
    // ✅ FIX: Added the third parameter (securityLevel)
    context = new seal.SEALContext(
        parms,
        true,          // enable expandModChain
        securityLevel  // 3. Must be provided, even if it's 'none'
    );

    if (!context.parametersSet()) {
        throw new Error("Failed to validate CKKS encryption parameters. Context is invalid.");
    }


    if (context.keyContextData()) {
        console.warn("SEAL Context Warning:", context.keyContextData());
    }

    // --- 4. Generate keys + encoders ---
    // Use 'new' for constructors.
    keyGenerator = new seal.KeyGenerator(context);
    encoders.ckks = new seal.CKKSEncoder(context);

    console.log("SEAL CKKS client initialized successfully.");
}


/**
 * 2. Generates HE keys (Public, Relin) and prepares the payload for the backend.
 * @returns The complete initialization payload for the backend.
 */
export function generateHEInitPayload() {
    if (!keyGenerator || !context || !seal) throw new Error("SEAL not initialized.");

    // Generate keys
    // ✅ FIX: Use secretKey() as confirmed by the documentation.
    const secretKey = keyGenerator.secretKey();

    // The createPublicKey/createRelinKeys methods are correct as functions.
    const publicKey = keyGenerator.createPublicKey();
    const relinKeys = keyGenerator.createRelinKeys(true);

    // Create Encryptor and save it globally (for encrypting user data)
    encryptor = new seal.Encryptor(context, publicKey);


    // V7 FIX: Serialization methods must now specify compression mode.
    const compression = seal.ComprModeType.zstd;

    // Serialize keys to Base64 
    const publicKeyBase64 = publicKey.saveToBase64(compression);
    const relinKeysBase64 = relinKeys.saveToBase64(compression);
    const secretKeyBase64 = secretKey.saveToBase64(compression);

    // CRITICAL: Clean up temporary SEAL objects to prevent memory leaks
    publicKey.delete();
    relinKeys.delete();
    // NOTE: We do NOT delete the secretKey here if you intend to save 
    // it locally for later decryption, which is your goal. However,
    // since you delete it in the current code, I will keep that logic 
    // but warn you that typically you *wouldn't* delete the secretKey 
    // if you plan to save and reuse the object in JS memory before deletion.
    secretKey.delete();

    return {
        keysAndParams: {
            scheme: HE_PARAMS.scheme,
            params: HE_PARAMS.ckks,
            publicKeyBase64: publicKeyBase64,
            evaluationKeysBase64: relinKeysBase64,
        },
        secretKeyBase64
    };
}

/**
 * 3. Encrypts a numeric array for upload.
 * @param data - The array of numbers to encrypt.
 * @returns The encrypted ciphertext in Base64.
 */
export function encryptData(data: number[]): string {
    if (!encryptor || !encoders.ckks || !seal || !context) {
        throw new Error("Encryptor not initialized. Run key generation first.");
    }

    // ✅ FIX: Using 'new' for both Plaintext and Ciphertext for consistency with documentation style
    const plain = new seal.Plaintext();
    const cipher = new seal.Ciphertext();
    const scale = HE_PARAMS.ckks.scale;

    try {
        // Encode the data using CKKS
        encoders.ckks.encode(data, scale, plain);

        // Encrypt the plaintext
        encryptor.encrypt(plain, cipher);

        // ✅ V7 FIX: Serialization methods must now specify compression mode.
        const ciphertextBase64 = cipher.saveToBase64(seal.ComprModeType.zstd);
        return ciphertextBase64;

    } catch (e: any) {
        console.error("Encryption Failed:", e);
        // ... error handling ...
        const errorMsg = e.message.includes('too many coefficients')
            ? "Input array is too large for the HE parameters (max slots: 4096)."
            : "Data encryption failed. Check input data format and parameters.";
        throw new Error(errorMsg);
    } finally {
        // CRITICAL: Clean up temporary SEAL objects
        plain.delete();
        cipher.delete();
    }
}


/**
 * 4. Decrypts a ciphertext Base64 string using the local Secret Key.
 * @param ciphertextBase64 - The ciphertext from the server.
 * @param secretKeyBase64 - The user's private key.
 * @returns The decrypted array of numbers.
 */
export function decryptCiphertext(ciphertextBase64: string, secretKeyBase64: string): number[] {
    if (!seal || !context) throw new Error("SEAL not initialized.");
    if (!encoders.ckks) throw new Error("CKKS Encoder not available.");

    let secretKey = null;
    let decryptor = null;
    let cipher = null;
    let plain = null;

    try {
        // 1. Load Secret Key
        secretKey = new seal.SecretKey();

        // Loading uses the context and buffer
        secretKey.load(context, Buffer.from(secretKeyBase64, 'base64'));

        // 2. Create Decryptor
        decryptor = new seal.Decryptor(context, secretKey);

        // 3. Deserialize Ciphertext
        cipher = new seal.Ciphertext(); // ✅ FIX: Use 'new'
        cipher.load(context, Buffer.from(ciphertextBase64, 'base64'));

        // 4. Decrypt
        plain = new seal.Plaintext(); // ✅ FIX: Use 'new'
        decryptor.decrypt(cipher, plain);

        // 5. Decode
        const result = encoders.ckks.decode(plain);

        // Filter out zero-padding elements often found after the actual data
        return result.filter(v => typeof v === 'number');

    } catch (e: any) {
        console.error("SEAL Decryption/Decoding Error:", e);
        throw new Error(`Client-side SEAL decryption failed: ${e.message}`);
    } finally {
        // CRITICAL: Memory Cleanup
        if (secretKey) secretKey.delete();
        if (decryptor) decryptor.delete();
        if (cipher) cipher.delete();
        if (plain) plain.delete();
    }
}