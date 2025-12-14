// Import global SEAL objects exported from the global.heState.js file

import { seal, context, evaluator, encoders, keyCollection } from "../global/heState.js";

// --- SEAL Helper Functions ---

/**
 * Creates the SEAL Context, Evaluator, and Encoders based on the provided parameters.
 * IMPORTANT: This mutates the global 'context', 'evaluator', and 'encoders' objects.
 * @param {object} params - The encryption parameters (must include scheme and parameters).
 */
const loadContext = function (params) {
    if (!seal) throw new Error('SEAL library not initialized.');

    const scheme = params.scheme.toLowerCase();

    // Clear previous context if needed (optional but good for debugging multi-scheme usage)
    // You might want to skip this cleanup for a performance gain if context is rarely changed.

    let parms;
    let securityLevel = seal.SecurityLevel.tc128; // Standard security level

    if (scheme === 'bfv') {
        const { polyModulusDegree, bitSizes, plainModulus } = params.bfv;
        if (!polyModulusDegree || !bitSizes || !plainModulus) {
            throw new Error("Missing required BFV parameters.");
        }

        // 1. Create BFV Parameters
        parms = seal.EncryptionParameters(seal.SchemeType.bfv);
        parms.setPolyModulusDegree(polyModulusDegree);
        parms.setCoeffModulus(seal.CoeffModulus.Create(polyModulusDegree, bitSizes));
        parms.setPlainModulus(plainModulus);

    } else if (scheme === 'ckks') {
        const { polyModulusDegree, coeffModulusBitSizes, scale } = params.ckks;
        if (!polyModulusDegree || !coeffModulusBitSizes || !scale) {
            throw new Error("Missing required CKKS parameters.");
        }

        // 1. Create CKKS Parameters
        parms = seal.EncryptionParameters(seal.SchemeType.ckks);
        parms.setPolyModulusDegree(polyModulusDegree);
        parms.setCoeffModulus(seal.CoeffModulus.Create(polyModulusDegree, coeffModulusBitSizes));
        // NOTE: The scale is not set on parms, but is crucial for encoding/decoding.
    } else {
        throw new Error(`Unsupported HE scheme: ${scheme}. Must be BFV or CKKS.`);
    }

    // Set global context
    context = seal.Context(parms, true, securityLevel);

    if (!context.parametersSet()) {
        throw new Error('Failed to set encryption parameters for the chosen scheme.');
    }

    // Set global Evaluator and Encoders
    evaluator = seal.Evaluator(context);

    if (scheme === 'bfv') {
        encoders.bfv = seal.BatchEncoder(context);
    } else if (scheme === 'ckks') {
        encoders.ckks = seal.CKKSEncoder(context);
        // Store the client's preferred scale for the CKKS encoder
        encoders.ckks.scale = params.ckks.scale;
    }

    console.log(`SEAL Context for ${scheme.toUpperCase()} initialized successfully.`);
};


/**
 * Deserializes a Base64 string into a SEAL object.
 * Implements robust try/catch block for safer loading.
 * @param {string} base64String - Base64 string of the serialized object.
 * @param {string} type - 'PublicKey', 'RelinKeys', 'Ciphertext', etc.
 * @returns {object} The deserialized SEAL object.
 */
const deserialize = function (base64String, type) {
    if (!context) throw new Error("SEAL Context not loaded. Call /api/v1/he/init first.");

    const buffer = Buffer.from(base64String, 'base64');

    try {
        switch (type) {
            case 'PublicKey': {
                const pk = seal.PublicKey();
                pk.load(context, buffer);
                return pk;
            }
            case 'RelinKeys': {
                const rlk = seal.RelinKeys();
                rlk.load(context, buffer);
                return rlk;
            }
            case 'Ciphertext': {
                const ct = seal.Ciphertext();
                ct.load(context, buffer);
                return ct;
            }
            // Add other types (e.g., GaloisKeys) as needed
            default:
                throw new Error(`Unknown SEAL object type for deserialization: ${type}`);
        }
    } catch (e) {
        // Catch C++ exceptions thrown by SEAL library during loading (corrupt/invalid data)
        console.error(`SEAL Deserialization Failed for type ${type}:`, e.message);
        throw new Error(`Invalid or corrupt Base64 data provided for ${type}.`);
    }
};


/**
 * Serializes a SEAL object into a Base64 string.
 * @param {object} sealObject - The SEAL object (Ciphertext, PublicKey, etc.)
 * @returns {string} Base64 string representation.
 */
const serialize = function (sealObject) {
    // This process is generally safe, but we include error handling for completeness
    try {
        const resultBuffer = sealObject.save();
        return Buffer.from(resultBuffer).toString('base64');
    } catch (e) {
        console.error('SEAL Serialization Failed:', e.message);
        throw new Error('Failed to serialize SEAL object. Object might be corrupted.');
    }
};


export default { loadContext, deserialize, serialize }