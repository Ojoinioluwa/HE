import SEAL from 'node-seal';

// Global objects for the client session
let seal: SEAL = null as any;
let encryptor: SEAL.Encryptor | null = null;
let context: SEAL.Context | null = null;
const encoders: { ckks?: SEAL.CKKSEncoder } = {};

export const HE_PARAMS = {
    scheme: 'ckks',
    ckks: {
        polyModulusDegree: 8192, // Stick to 8192 for images
        coeffModulusBitSizes: [40, 40, 40, 40],
        scale: Math.pow(2, 30)
    }
};

/**
 * 1. Initializes SEAL WebAssembly and Context.
 */
export async function initializeSEALClient() {
    if (seal) return;

    seal = await SEAL({
        locateFile: (path: string) => path.endsWith(".wasm") ? "/seal_all.wasm" : path
    });

    const parms = new seal.EncryptionParameters(seal.SchemeType.ckks);
    parms.setPolyModulusDegree(HE_PARAMS.ckks.polyModulusDegree);
    parms.setCoeffModulus(seal.CoeffModulus.Create(HE_PARAMS.ckks.polyModulusDegree, new Int32Array(HE_PARAMS.ckks.coeffModulusBitSizes)));

    context = new seal.SEALContext(parms, true, seal.SecLevelType.tc128);
    encoders.ckks = new seal.CKKSEncoder(context);

}

/**
 * 2. AES Key Derivation
 * Uses the password and email to create a key for locking/unlocking the HE Secret Key.
 */
async function getAESKey(password: string, email: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: enc.encode(email), iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * 3. Generate & Wrap Keys (For Registration)
 * Generates a real HE key and encrypts it with the password.
 */

export async function createAndWrapKeys(password: string, email: string) {
    if (!seal || !context) await initializeSEALClient();

    const keygen = new seal.KeyGenerator(context!);
    const secretKey = keygen.secretKey();
    const publicKey = keygen.createPublicKey();
    const relinKeys = keygen.createRelinKeys();

    // 1. Force a specific compression mode. 
    // "none" is the most compatible and avoids the 'value' undefined error.
    const compression = seal.ComprModeType.none;

    // 2. Pass the compression mode explicitly to every call
    const secretKeyBase64 = secretKey.saveToBase64(compression);
    const publicKeyBase64 = publicKey.saveToBase64(compression);
    const relinKeysBase64 = relinKeys.saveToBase64(compression);

    // 3. Wrap the Secret Key with AES-GCM
    const aesKey = await getAESKey(password, email);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedData = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        new TextEncoder().encode(secretKeyBase64)
    );

    const wrappedKey = JSON.stringify({
        iv: Array.from(iv),
        ciphertext: Array.from(new Uint8Array(encryptedData))
    });

    const result = {
        keysAndParams: {
            scheme: HE_PARAMS.scheme,
            params: HE_PARAMS.ckks,
            publicKeyBase64: publicKeyBase64,
            evaluationKeysBase64: relinKeysBase64,
        },
        wrappedSecretKey: btoa(wrappedKey)
    };

    // Cleanup
    publicKey.delete();
    relinKeys.delete();
    secretKey.delete();

    return result;
}

/**
 * 4. Unwrap & Load Keys (For Login)
 * Takes the wrapped key from the DB and unlocks it with the password.
 */
export async function unwrapAndLoadKeys(wrappedKeyBase64: string, password: string, email: string) {
    if (!seal) await initializeSEALClient();

    const { iv, ciphertext } = JSON.parse(atob(wrappedKeyBase64));
    const aesKey = await getAESKey(password, email);

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        aesKey,
        new Uint8Array(ciphertext)
    );

    const secretKeyBase64 = new TextDecoder().decode(decrypted);

    // Load into SEAL
    const secretKey = new seal.SecretKey();
    secretKey.loadFromBase64(context!, secretKeyBase64);

    const keygen = new seal.KeyGenerator(context!, secretKey);
    const publicKey = keygen.createPublicKey();
    encryptor = new seal.Encryptor(context!, publicKey);

    secretKey.delete();
    publicKey.delete();

    return secretKeyBase64;
}

/**
 * 5. Encrypt Data
 */
export function encryptData(data: number[] | Float64Array): string {
    if (!encryptor || !encoders.ckks || !seal) throw new Error("Encryptor not ready");

    // FIX: Force conversion to Float64Array if it's a standard number array
    const inputData = data instanceof Float64Array ? data : new Float64Array(data);

    const plain = new seal.Plaintext();
    const cipher = new seal.Ciphertext();

    try {
        // SEAL's encode method requires Float64Array specifically
        encoders.ckks.encode(inputData, HE_PARAMS.ckks.scale, plain);
        encryptor.encrypt(plain, cipher);

        const base64 = cipher.saveToBase64(seal.ComprModeType.zstd);
        return base64;
    } finally {
        // Clean up memory to avoid WASM memory leaks
        plain.delete();
        cipher.delete();
    }
}
/**
 * 6. Decrypt Data
 */
export async function decryptCiphertext(
    ciphertextBase64: string,
    secretKeyBase64: string
): Promise<Float64Array> {
    if (!seal || !context) await initializeSEALClient();

    const secretKey = new seal.SecretKey();
    secretKey.loadFromBase64(context!, secretKeyBase64);

    const decryptor = new seal.Decryptor(context!, secretKey);
    const ckksEncoder = new seal.CKKSEncoder(context!);

    const cipher = new seal.Ciphertext();
    const plain = new seal.Plaintext();


    try {
        cipher.loadFromBase64(context!, ciphertextBase64);

        // 1. Decrypt the ciphertext into the plaintext object
        decryptor.decrypt(cipher, plain);

        // 2. USE THE CORRECT METHOD NAME FOUND IN YOUR LOG
        // In your build, it's decodeFloat64
        const result = ckksEncoder.decodeFloat64(plain);

        // 3. Cleanup WASM memory
        cipher.delete();
        plain.delete();
        decryptor.delete();
        secretKey.delete();
        ckksEncoder.delete();

        return result;
    } catch (error) {
        if (cipher) cipher.delete();
        if (plain) plain.delete();
        if (secretKey) secretKey.delete();
        if (decryptor) decryptor.delete();
        if (ckksEncoder) ckksEncoder.delete();
        console.error("SEAL Decryption Error:", error);
        throw error;
    }
}
/**
 * Re-initializes the SEAL Encryptor using a Base64 Secret Key.
 * Crucial for session persistence when moving between pages.
 */
export async function initializeEncryptorFromKey(secretKeyBase64: string) {
    if (!seal || !context) await initializeSEALClient();

    // 1. Create SecretKey object from string
    const secretKey = new seal.SecretKey();
    secretKey.loadFromBase64(context!, secretKeyBase64);

    // 2. Derive Public Key (Required for Encryption)
    const keygen = new seal.KeyGenerator(context!, secretKey);
    const publicKey = keygen.createPublicKey();

    // 3. Set the global encryptor
    encryptor = new seal.Encryptor(context!, publicKey);

    // Cleanup WASM memory for temporary objects
    secretKey.delete();
    publicKey.delete();
}