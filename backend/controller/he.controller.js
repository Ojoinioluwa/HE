import CiphertextModel from "../models/CiphertextModel.js";
import KeyModel from "../models/HEKeyModels.js"
import heConfig from "../utils/he.config.js"


import { seal, evaluator, encoders, keyCollection } from "../global/heState.js";
const { loadContext, deserialize, serialize } = heConfig


// --- Route Handlers ---

/**
 * POST /api/v1/he/init
 * Initializes the HE context on the server using client-provided parameters and keys.
 */

const initializeHE = async (req, res) => {
    try {
        const { scheme, params, publicKeyBase64, evaluationKeysBase64 } = req.body;
        const userId = req.user._id.toString();

        // 1. Load the SEAL Context
        loadContext(params);

        // 2. CHECK KEY SIZE BEFORE SAVING
        // Calculate approximate size in MB
        const keySizeInBytes = evaluationKeysBase64 ? (evaluationKeysBase64.length * (3 / 4)) : 0;
        const keySizeInMB = keySizeInBytes / (1024 * 1024);

        let savedKeyId;

        if (keySizeInMB > 15) {
            console.log(`Key size (${keySizeInMB.toFixed(2)}MB) exceeds MongoDB limit. Using memory-only mode for RelinKeys.`);

            // Save everything EXCEPT the massive RelinKeys to the DB
            const newKey = await KeyModel.create({
                userId,
                scheme,
                encryptionParameters: params,
                publicKeyBase64,
                evaluationKeysBase64: "STORED_IN_MEMORY_ONLY" // Placeholder
            });
            savedKeyId = newKey._id;
        } else {
            // Standard save if it fits
            const newKey = await KeyModel.create({
                userId, scheme, encryptionParameters: params, publicKeyBase64, evaluationKeysBase64
            });
            savedKeyId = newKey._id;
        }

        // 3. Keep keys in server memory (THIS IS YOUR LIFELINE)
        // Even if they don't fit in the DB, the server can use them while it's running
        keyCollection[userId] = {
            publicKey: deserialize(publicKeyBase64, 'PublicKey'),
            evaluationKeys: evaluationKeysBase64 ? deserialize(evaluationKeysBase64, 'RelinKeys') : null,
            params: params
        };

        res.status(201).json({ message: "HE Context initialized.", keyId: savedKeyId });
    } catch (error) {
        console.error('HE Initialization error:', error);
        res.status(500).json({ error: "Initialization failed.", details: error.message });
    }
};


/**
 * GET /api/data/my-uploads
 * Fetches all encrypted data entries belonging to the logged-in user.
 */
const getUserCiphertexts = async (req, res) => {
    try {
        // req.user._id is populated by your Auth Middleware
        const userId = req.user._id;

        // Find all records matching the user ID, sorted by most recent first
        const uploads = await CiphertextModel.find({ userId })
            .sort({ createdAt: -1 })
            .select('-__v -ciphertextBase64'); // Exclude the version key

        res.status(200).json({
            count: uploads.length,
            uploads
        });

    } catch (error) {
        console.error('Error fetching user ciphertexts:', error);
        res.status(500).json({
            error: 'Failed to retrieve your data.',
            details: error.message
        });
    }
};

/**
 * POST /api/v1/he/data/upload
 * Uploads an encrypted ciphertext vector to the server for storage.
*/
const uploadCiphertext = async (req, res) => {
    try {
        const { dataId, ciphertextBase64, scheme, metadata } = req.body;
        const userId = req.user._id.toString();

        if (!userId || !dataId || !ciphertextBase64 || !scheme) {
            return res.status(400).json({ error: "Missing required fields." });
        }


        const newCiphertext = await CiphertextModel.create({
            userId,
            dataId,
            ciphertextBase64,
            scheme: scheme.toLowerCase(),
            metadata: metadata || {}
        });

        res.status(201).json({
            message: `Ciphertext '${dataId}' uploaded and stored successfully.`,
            id: newCiphertext._id
        });

    } catch (error) {
        console.error('Ciphertext upload error:', error);
        res.status(500).json({ error: 'Failed to upload ciphertext.', details: error.message });
    }
};



/**
 * GET /api/data/:id
 * Fetches a single ciphertext record by its MongoDB _id or custom dataId
 */
export const getCiphertextById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Find by _id AND ensure it belongs to the requesting user
        const ciphertext = await CiphertextModel.findOne({ _id: id, userId });


        if (!ciphertext) {
            return res.status(404).json({ error: "Ciphertext not found or access denied." });
        }

        res.status(200).json(ciphertext);
    } catch (error) {
        console.error('Error fetching specific ciphertext:', error);
        res.status(500).json({ error: 'Failed to retrieve record.', details: error.message });
    }
};

/**
 * POST /api/v1/he/compute/sum
 * Performs homomorphic addition on multiple ciphertexts.
 */
const computeSum = async (req, res) => {
    try {
        const { dataIds } = req.body;
        const userId = req.user._id.toString();

        // 1. Fetch ciphertexts from DB
        const ciphertexts = await CiphertextModel.find({ userId, dataId: { $in: dataIds } });
        if (ciphertexts.length !== dataIds.length) {
            return res.status(404).json({ error: "One or more ciphertexts not found." });
        }

        // Check if evaluator is initialized
        if (!evaluator) {
            return res.status(503).json({ error: "HE context not ready. Run /init first." });
        }

        // 2. Deserialization and Computation Loop
        let encryptedResult = seal.Ciphertext();
        let ct1 = deserialize(ciphertexts[0].ciphertextBase64, 'Ciphertext');

        // Initialize the result with the first ciphertext, then immediately delete the input object
        ct1.copy(encryptedResult);
        ct1.delete();

        for (let i = 1; i < ciphertexts.length; i++) {
            let nextCt = deserialize(ciphertexts[i].ciphertextBase64, 'Ciphertext');
            // AddInplace is more memory efficient
            evaluator.addInplace(encryptedResult, nextCt);
            nextCt.delete(); // CRUCIAL: Delete intermediate object to prevent memory leaks
        }

        // 3. Serialization and Response
        const resultBase64 = serialize(encryptedResult);
        encryptedResult.delete(); // CRUCIAL: Delete final object

        res.status(200).json({ ciphertextBase64: resultBase64, scheme: ciphertexts[0].scheme });

    } catch (error) {
        console.error('Computation error:', error);
        // Include specific note on memory management for the dev
        res.status(500).json({ error: "Homomorphic computation failed.", details: error.message, note: "Check SEAL object memory management (.delete())" });
    }
};

/**
 * POST /api/v1/he/compute/linear-regression
 * Performs homomorphic linear regression: Y_enc = (m * X_enc) + b_enc.
 * Requires CKKS scheme for floating-point calculation.
 */
const computeLinearRegression = async (req, res) => {
    // We assume the CKKS context (for floating-point) has been initialized and is active.
    // The scale value used for CKKS encryption must be available globally or retrieved from the client's parameters.
    const SCALE = 2 ** 40; // Example scale value (must match client's scale)

    let inputCiphertext = null;
    let resultCiphertext = null;
    let plaintextM = null;
    let plaintextB = null;

    try {
        const { dataId_X, slope_m, intercept_b, resultId } = req.body;

        const userId = req.user._id.toString();

        // 1. Validation and Setup
        if (!evaluator || !encoders.ckks) {
            return res.status(503).json({ error: "HE CKKS context not ready. Run /init with CKKS parameters first." });
        }
        if (typeof slope_m !== 'number' || typeof intercept_b !== 'number') {
            return res.status(400).json({ error: "Slope (m) and Intercept (b) must be numbers." });
        }

        // 2. Fetch the Encrypted Data (X) from DB
        const ctDataX = await CiphertextModel.findOne({ userId, dataId: dataId_X, scheme: 'ckks' });
        if (!ctDataX) {
            return res.status(404).json({ error: "Encrypted data X not found for linear regression." });
        }

        // 3. Deserialize Input Ciphertext
        inputCiphertext = deserialize(ctDataX.ciphertextBase64, 'Ciphertext');

        // The result will be computed into this new ciphertext object
        resultCiphertext = seal.Ciphertext();

        // 4. Encode Plaintext Constants m and b
        // The plaintext constants must be encoded using the same CKKS scale as the ciphertext.
        plaintextM = seal.Plaintext();
        encoders.ckks.encode(slope_m, SCALE, plaintextM);

        plaintextB = seal.Plaintext();
        encoders.ckks.encode(intercept_b, SCALE, plaintextB);

        // --- 5. Perform Homomorphic Computation: Y_enc = (m * X_enc) + b_enc ---

        // A. Compute: (m * X_enc) --> Multiplication by Plaintext (no relinearization needed)
        // Store the result directly into resultCiphertext
        evaluator.multiplyPlain(inputCiphertext, plaintextM, resultCiphertext);

        // B. Re-scale (Crucial for CKKS noise management after multiplication)
        // If the client's parameters require re-scaling, perform it here.
        // NOTE: If using chaining, you might skip this step, but for a single regression, it's best practice.
        evaluator.rescaleInplace(resultCiphertext);

        // C. Compute: ... + b_enc --> Addition by Plaintext
        evaluator.addPlainInplace(resultCiphertext, plaintextB);

        // 6. Serialization and Response
        const resultBase64 = serialize(resultCiphertext);

        // Optional: Store result ciphertext in DB
        if (resultId) {
            await CiphertextModel.create({
                userId,
                dataId: resultId,
                ciphertextBase64: resultBase64,
                scheme: 'ckks',
                metadata: { description: `Linear Regression result for ${dataId_X}` }
            });
        }

        res.status(200).json({
            resultId: resultId,
            ciphertextBase64: resultBase64,
            scheme: 'ckks'
        });

    } catch (error) {
        console.error('Linear Regression computation error:', error);
        res.status(500).json({ error: "Homomorphic Linear Regression failed.", details: error.message });
    } finally {
        // 7. CRUCIAL: Memory Cleanup
        if (inputCiphertext) inputCiphertext.delete();
        if (resultCiphertext) resultCiphertext.delete();
        if (plaintextM) plaintextM.delete();
        if (plaintextB) plaintextB.delete();
    }
};


/**
 * POST /api/v1/he/compute/multiply
 * Performs homomorphic multiplication (ct1 * ct2) or (ct * pt).
 * Requires RelinKeys for ciphertext * ciphertext multiplication.
 */
const computeMultiply = async (req, res) => {
    let ct1 = null;
    let ct2 = null;
    let encryptedResult = null;
    let relinKeys = null;

    try {
        const { dataId_A, dataId_B, resultId } = req.body;
        const userId = req.user._id.toString();

        // 1. Fetch ciphertexts from DB
        const ctDataA = await CiphertextModel.findOne({ userId, dataId: dataId_A });
        const ctDataB = await CiphertextModel.findOne({ userId, dataId: dataId_B });

        if (!ctDataA || !ctDataB) {
            return res.status(404).json({ error: "One or both ciphertexts not found." });
        }

        if (!evaluator) {
            return res.status(503).json({ error: "HE context not ready. Run /init first." });
        }

        // 2. Deserialization
        ct1 = deserialize(ctDataA.ciphertextBase64, 'Ciphertext');
        ct2 = deserialize(ctDataB.ciphertextBase64, 'Ciphertext');
        encryptedResult = seal.Ciphertext();

        // 3. Check for RelinKeys
        const userKeys = keyCollection[userId];
        if (!userKeys || !userKeys.evaluationKeys) {
            // In a production system, you would load these from DB if not in memory.
            return res.status(400).json({ error: "Relinearization Keys (RelinKeys) required for multiplication are missing from server memory." });
        }
        relinKeys = userKeys.evaluationKeys;


        // 4. Perform Multiplication (ct1 * ct2)
        evaluator.multiply(ct1, ct2, encryptedResult);

        // 5. Perform Relinearization
        // Relinearization is CRUCIAL after multiplication to reduce the size of the ciphertext (noise increase is managed).
        evaluator.relinearizeInplace(encryptedResult, relinKeys);

        // If CKKS, perform rescaling
        if (ctDataA.scheme === 'ckks') {
            evaluator.rescaleInplace(encryptedResult);
        }

        // 6. Serialization and Response
        const resultBase64 = serialize(encryptedResult);

        // Optional: Store result
        if (resultId) {
            await CiphertextModel.create({
                userId, dataId: resultId, ciphertextBase64: resultBase64, scheme: ctDataA.scheme,
                metadata: { description: `Homomorphic Multiplication result for ${dataId_A} * ${dataId_B}` }
            });
        }

        res.status(200).json({ ciphertextBase64: resultBase64, scheme: ctDataA.scheme, resultId });

    } catch (error) {
        console.error('Multiplication computation error:', error);
        res.status(500).json({ error: "Homomorphic multiplication failed.", details: error.message });
    } finally {
        // 7. CRUCIAL: Memory Cleanup
        if (ct1) ct1.delete();
        if (ct2) ct2.delete();
        if (encryptedResult) encryptedResult.delete();
        // relinKeys is a globally stored object, DO NOT delete it here.
    }
};

// ---

/**
 * POST /api/v1/he/compute/average
 * Computes the homomorphic average of a set of ciphertexts: (Sum(CTs) * (1/N)).
 */
const computeAverage = async (req, res) => {
    let plaintextReciprocal = null;
    let encryptedSum = null;

    try {
        const { dataIds } = req.body;
        const userId = req.user._id.toString();

        if (!dataIds || dataIds.length === 0) {
            return res.status(400).json({ error: "Must provide dataIds to compute the average." });
        }

        // The logic is: Average = Sum / N. We will use the existing computeSum logic for step 1.

        // 1. Execute Summation Logic
        const sumResult = await exports.computeSum({
            body: { dataIds },
            user: req.user
            // This is an internal function call and won't send a response directly
        }, {
            // Mock the response object for internal call, if computeSum was a standard controller
            status: () => ({ json: () => { } })
        });

        // Check if summation failed (assuming computeSum returns a structure if called internally)
        if (!sumResult || !sumResult.ciphertextBase64) {
            // Fallback if the summation logic above is not structured for internal calling.
            // For simplicity, we replicate the sum logic below, but in a real app, structure computeSum to be reusable.
            throw new Error("Failed to compute sum internally. Replicate sum logic here.");
        }

        // REPLICATING SUM LOGIC FOR ROBUSTNESS: (Best practice is to factor out the core sum logic)

        // Fetch ciphertexts and compute sum (replicated from computeSum)
        const ciphertexts = await CiphertextModel.find({ userId, dataId: { $in: dataIds } });
        if (ciphertexts.length !== dataIds.length) { throw new Error("Ciphertext lookup mismatch."); }
        if (!evaluator) { throw new Error("HE context not ready."); }

        encryptedSum = seal.Ciphertext();
        let ct1 = deserialize(ciphertexts[0].ciphertextBase64, 'Ciphertext');
        ct1.copy(encryptedSum);
        ct1.delete();

        for (let i = 1; i < ciphertexts.length; i++) {
            let nextCt = deserialize(ciphertexts[i].ciphertextBase64, 'Ciphertext');
            evaluator.addInplace(encryptedSum, nextCt);
            nextCt.delete();
        }

        // 2. Prepare Plaintext Reciprocal (1/N)
        const N = ciphertexts.length;
        const reciprocal = 1 / N;
        const scheme = ciphertexts[0].scheme;

        if (scheme === 'ckks') {
            const scale = encoders.ckks.scale || 2 ** 40; // Use stored scale or a default
            plaintextReciprocal = seal.Plaintext();
            encoders.ckks.encode(reciprocal, scale, plaintextReciprocal);

        } else if (scheme === 'bfv') {
            // BFV arithmetic uses integer encoding. The reciprocal must be integer.
            // This is complex in BFV (requires modulus switching). For simplicity, we assume BFV data is averaged externally.
            throw new Error("BFV average calculation is not supported directly by multiplication by reciprocal. Use CKKS.");
        } else {
            throw new Error("Unsupported scheme for average calculation.");
        }

        // 3. Perform Homomorphic Multiplication: (Sum * (1/N))
        evaluator.multiplyPlainInplace(encryptedSum, plaintextReciprocal);

        // Rescale for CKKS after multiplication
        if (scheme === 'ckks') {
            evaluator.rescaleInplace(encryptedSum);
        }

        // 4. Serialization and Response
        const resultBase64 = serialize(encryptedSum);

        res.status(200).json({ ciphertextBase64: resultBase64, scheme: scheme, count: N });

    } catch (error) {
        console.error('Average computation error:', error);
        res.status(500).json({ error: "Homomorphic average failed.", details: error.message });
    } finally {
        // 5. Memory Cleanup
        if (plaintextReciprocal) plaintextReciprocal.delete();
        if (encryptedSum) encryptedSum.delete();
    }
};

const heController = {
    computeAverage,
    computeLinearRegression,
    computeMultiply,
    computeSum,
    initializeHE,
    uploadCiphertext,
    getUserCiphertexts,
    getCiphertextById
}
export default heController