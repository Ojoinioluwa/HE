import mongoose from "mongoose";

const KeySchema = new mongoose.Schema({
    // User ID to associate keys with a client (for multi-user support)
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // HE Parameters (Required to recreate the SEALContext on server)
    encryptionParameters: { type: mongoose.Schema.Types.Mixed, required: true },

    // Public Key (Serialized to Base64 string)
    publicKeyBase64: { type: String, required: true },

    // Evaluation Keys (Relinearization/Galois Keys - Serialized to Base64)
    evaluationKeysBase64: { type: String },

    // HE Scheme used (BFV, CKKS, Paillier)
    scheme: { type: String, enum: ['bfv', 'ckks', 'paillier'], required: true },

    createdAt: { type: Date, default: Date.now },
}, { collection: 'he_keys' });

// Export the Mongoose Model
const HEKey = mongoose.model("HEKey", KeySchema);
export default HEKey