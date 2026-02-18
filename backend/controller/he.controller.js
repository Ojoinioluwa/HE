import CiphertextModel from "../models/CiphertextModel.js";
import KeyModel from "../models/HEKeyModels.js";
import heConfig from "../utils/he.config.js";
import { createHESession } from "../global/heState.js";
import { sealGlobals } from "../server.js";

const { loadContext, deserialize, serialize } = heConfig;

const heController = {};

/**
 * Initializes the HE context on the server for a specific user.
 */
heController.initializeHE = async (req, res) => {
    try {
        const { scheme, params, publicKeyBase64, evaluationKeysBase64 } = req.body;
        const userId = req.user._id.toString();
        const seal = sealGlobals.seal;

        if (!seal) throw new Error("SEAL instance not initialized on server.");

        // 1. Create the Context & Evaluator
        const { context, evaluator, encoders } = loadContext(seal, userId, { ...params, scheme });

        // 2. Compute Key Size for Storage Decision
        const keySizeInMB = evaluationKeysBase64 ? (evaluationKeysBase64.length * 0.75) / (1024 * 1024) : 0;

        // 3. Save to Database (RelinKeys only if they fit)
        await KeyModel.findOneAndUpdate(
            { userId },
            {
                scheme,
                encryptionParameters: params,
                publicKeyBase64,
                evaluationKeysBase64: keySizeInMB > 15 ? "STORED_IN_MEMORY_ONLY" : evaluationKeysBase64,
            },
            { upsert: true }
        );

        // 4. Initialize the In-Memory Session
        // We create the session first so 'deserialize' can access the context
        createHESession(userId, {
            seal,
            context,
            evaluator,
            encoders,
            relinKeys: null
        });

        // 5. Load RelinKeys into memory if provided
        if (evaluationKeysBase64 && evaluationKeysBase64 !== "STORED_IN_MEMORY_ONLY") {
            const relinKeys = deserialize(userId, evaluationKeysBase64, "RelinKeys");
            createHESession(userId, { seal, context, evaluator, encoders, relinKeys });
        }

        res.status(201).json({ message: "HE Context initialized." });
    } catch (error) {
        console.error('HE Initialization error:', error);
        res.status(500).json({ error: "Initialization failed.", details: error.message });
    }
};


heController.getUserCiphertexts = async (req, res) => {
    try {
        const uploads = await CiphertextModel.find({ userId: req.user._id }).sort({ createdAt: -1 }).select('-ciphertextBase64');
        res.status(200).json({ count: uploads.length, uploads });
    } catch (error) {
        res.status(500).json({ error: "Fetch failed.", details: error.message });
    }
};

heController.getCiphertextById = async (req, res) => {
    try {
        const ciphertext = await CiphertextModel.findOne({ _id: req.params.id, userId: req.user._id });
        if (!ciphertext) return res.status(404).json({ error: "Not found." });
        res.status(200).json(ciphertext);
    } catch (error) {
        res.status(500).json({ error: "Fetch failed.", details: error.message });
    }
};


heController.uploadCiphertext = async (req, res) => {
    try {
        const { dataId, ciphertextBase64, scheme, metadata } = req.body;
        console.log(dataId)
        const userId = req.user._id.toString();
        console.log("I got here")
        if (!userId || !dataId || !ciphertextBase64 || !scheme) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        console.log(" I 222")

        const newCiphertext = await CiphertextModel.create({
            userId,
            dataId,
            ciphertextBase64,
            scheme: scheme.toLowerCase(),
            metadata: metadata || {},
        });

        res.status(201).json({ message: "Stored successfully.", id: newCiphertext._id });
    } catch (error) {
        res.status(500).json({ error: "Upload failed.", details: error.message });
    }
};

export default heController;