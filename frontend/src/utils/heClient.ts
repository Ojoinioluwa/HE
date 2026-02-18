import SEAL from 'node-seal';
import { getCiphertextById, uploadCiphertext } from "../API/he";

// Global objects for the client session
let seal: any = null;
let encryptor: any = null;
let context: any = null;
const encoders: { ckks?: any } = {};

export const HE_PARAMS = {
    scheme: 'ckks',
    ckks: {
        polyModulusDegree: 8192,
        // For 8192, total bits must be <= 218 for 128-bit security
        coeffModulusBitSizes: [50, 30, 30, 30, 50],
        scale: Math.pow(2, 30),
    },
};

/**
 * 1. Initializes SEAL WebAssembly and Context.
 */
export async function initializeSEALClient() {
    if (seal) return;

    seal = await SEAL({
        locateFile: (path: string) => (path.endsWith('.wasm') ? '/seal_all.wasm' : path),
    });

    const parms = new seal.EncryptionParameters(seal.SchemeType.ckks);
    parms.setPolyModulusDegree(HE_PARAMS.ckks.polyModulusDegree);
    parms.setCoeffModulus(
        seal.CoeffModulus.Create(
            HE_PARAMS.ckks.polyModulusDegree,
            Int32Array.from(HE_PARAMS.ckks.coeffModulusBitSizes),
        ),
    );

    context = new seal.SEALContext(parms, true, seal.SecLevelType.none);
    encoders.ckks = new seal.CKKSEncoder(context);
}




/**
 * Core engine for performing Homomorphic computations in the browser.
 * This extracts the heavy SEAL logic from the UI components.
 */
export const executeHomomorphicComputation = async (
    type: "sum" | "average" | "regression",
    selectedIds: string[],
    activeScheme: string
) => {
    await initializeSEALClient();

    if (!seal || !context) {
        throw new Error("SEAL Engine failed to initialize.");
    }

    const evaluator = new seal.Evaluator(context);
    const resultCiphertext = new seal.Ciphertext();

    const fullRecords = await Promise.all(
        selectedIds.map((id) => getCiphertextById(id))
    );

    try {
        if (type === "sum" || type === "average") {
            if (fullRecords.length < 2) throw new Error("Need at least 2 items.");

            // STEP 1: LOAD FIRST RECORD
            resultCiphertext.loadFromBase64(context, fullRecords[0].ciphertextBase64);

            // STEP 2: SUM EVERYTHING (Works for both 'sum' and 'average')
            for (let i = 1; i < fullRecords.length; i++) {
                const nextCt = new seal.Ciphertext();
                try {
                    nextCt.loadFromBase64(context, fullRecords[i].ciphertextBase64);
                    evaluator.addInplace(resultCiphertext, nextCt);
                } finally {
                    nextCt.delete();
                }
            }
            // NO MULTIPLICATION HERE. We are keeping it simple.
        }

        else if (type === "regression") {
            const inputCt = new seal.Ciphertext();
            const ckksEncoder = new seal.CKKSEncoder(context);
            const ptSlope = new seal.Plaintext();
            const ptIntercept = new seal.Plaintext();

            try {
                inputCt.loadFromBase64(context, fullRecords[0].ciphertextBase64);

                // Multiply x * 0.75
                ckksEncoder.encode(Float64Array.from([0.75]), inputCt.scale, ptSlope);
                evaluator.multiplyPlain(inputCt, ptSlope, resultCiphertext);

                // Rescale (reduces scale automatically)
                if (resultCiphertext.coeffModulusSize > 1) {
                    evaluator.rescaleToNextInplace(resultCiphertext);
                }

                // 🔥 DO NOT TOUCH SCALE
                const currentScale = resultCiphertext.scale;

                // Encode intercept at EXACT same scale
                ckksEncoder.encode(Float64Array.from([5.0]), currentScale, ptIntercept);

                evaluator.addPlainInplace(resultCiphertext, ptIntercept);

            } finally {
                inputCt.delete();
                ptSlope.delete();
                ptIntercept.delete();
                ckksEncoder.delete();
            }
        }





        const compression = seal.ComprModeType.none;
        const finalBase64 = resultCiphertext.saveToBase64(compression);
        const newResultId = `res_${type}_${Date.now().toString().slice(-4)}`;

        // STEP 3: UPLOAD WITH METADATA
        await uploadCiphertext({
            dataId: newResultId,
            ciphertextBase64: finalBase64,
            scheme: activeScheme,
            metadata: {
                type: fullRecords[0].metadata.type,
                operation: type,
                // Crucial: Store the count so we can divide later
                averageCount: fullRecords.length,
                sourceDataIds: selectedIds,
                processedAt: new Date().toISOString()
            },
        });

        return { success: true, resultId: newResultId };

    } catch (err: any) {
        console.error("SEAL Execution Error:", err);
        throw err;
    } finally {
        if (resultCiphertext) resultCiphertext.delete();
        if (evaluator) evaluator.delete();
    }
};
/**
 * 2. AES Key Derivation
 */
async function getAESKey(password: string, email: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveKey'],
    );

    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode(email), iterations: 100_000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
}

/**
 * 3. Generate & Wrap Keys (For Registration)
 */
export async function createAndWrapKeys(password: string, email: string) {
    if (!seal || !context) await initializeSEALClient();

    const keygen = new seal.KeyGenerator(context);
    const secretKey = keygen.secretKey();
    const publicKey = keygen.createPublicKey();
    const relinKeys = keygen.createRelinKeys();

    const compression = seal.ComprModeType.none;

    const secretKeyBase64 = secretKey.saveToBase64(compression);
    const publicKeyBase64 = publicKey.saveToBase64(compression);
    const relinKeysBase64 = relinKeys.saveToBase64(compression);

    // Wrap the secret key with AES-GCM
    const aesKey = await getAESKey(password, email);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        new TextEncoder().encode(secretKeyBase64),
    );

    const wrappedKey = JSON.stringify({
        iv: Array.from(iv),
        ciphertext: Array.from(new Uint8Array(encryptedData)),
    });

    // Cleanup WASM
    publicKey.delete();
    relinKeys.delete();
    secretKey.delete();

    return {
        keysAndParams: {
            scheme: HE_PARAMS.scheme,
            params: HE_PARAMS.ckks,
            publicKeyBase64,
            evaluationKeysBase64: relinKeysBase64,
        },
        wrappedSecretKey: btoa(wrappedKey),
    };
}

/**
 * 4. Unwrap & Load Keys (For Login)
 */
export async function unwrapAndLoadKeys(
    wrappedKeyBase64: string,
    password: string,
    email: string,
) {
    if (!seal) await initializeSEALClient();

    const { iv, ciphertext } = JSON.parse(atob(wrappedKeyBase64));
    const aesKey = await getAESKey(password, email);
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        aesKey,
        new Uint8Array(ciphertext),
    );

    const secretKeyBase64 = new TextDecoder().decode(decrypted);

    const secretKey = new seal.SecretKey();
    secretKey.loadFromBase64(context, secretKeyBase64);

    const keygen = new seal.KeyGenerator(context, secretKey);
    const publicKey = keygen.createPublicKey();

    encryptor = new seal.Encryptor(context, publicKey);

    // Cleanup
    publicKey.delete();
    secretKey.delete();

    return secretKeyBase64;
}

/**
 * 5. Encrypt Data
 */
export function encryptData(data: number[] | Float64Array): string {
    if (!encryptor || !encoders.ckks || !seal) throw new Error('Encryptor not ready');

    const inputData = data instanceof Float64Array ? data : new Float64Array(data);
    const plain = new seal.Plaintext();
    const cipher = new seal.Ciphertext();

    try {
        encoders.ckks.encode(inputData, HE_PARAMS.ckks.scale, plain);
        encryptor.encrypt(plain, cipher);

        return cipher.saveToBase64(seal.ComprModeType.none);
    } finally {
        plain.delete();
        cipher.delete();
    }
}

/**
 * 6. Decrypt Data
 */
export async function decryptCiphertext(
    ciphertextBase64: string,
    secretKeyBase64: string,
): Promise<Float64Array> {
    if (!seal || !context) await initializeSEALClient();

    const secretKey = new seal.SecretKey();
    secretKey.loadFromBase64(context, secretKeyBase64);

    const decryptor = new seal.Decryptor(context, secretKey);
    const ckksEncoder = new seal.CKKSEncoder(context);

    const cipher = new seal.Ciphertext();
    const plain = new seal.Plaintext();

    try {
        cipher.loadFromBase64(context, ciphertextBase64);
        decryptor.decrypt(cipher, plain);
        const result = ckksEncoder.decodeFloat64(plain);

        return result;
    } finally {
        cipher.delete();
        plain.delete();
        decryptor.delete();
        secretKey.delete();
        ckksEncoder.delete();
    }
}

/**
 * 7. Initialize Encryptor from Base64 Secret Key
 */
export async function initializeEncryptorFromKey(secretKeyBase64: string) {
    if (!seal || !context) await initializeSEALClient();

    const secretKey = new seal.SecretKey();
    secretKey.loadFromBase64(context, secretKeyBase64);

    const keygen = new seal.KeyGenerator(context, secretKey);
    const publicKey = keygen.createPublicKey();

    encryptor = new seal.Encryptor(context, publicKey);

    // Cleanup
    secretKey.delete();
    publicKey.delete();
}
