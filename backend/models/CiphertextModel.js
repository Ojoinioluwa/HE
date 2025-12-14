import mongoose from "mongoose";

const CiphertextSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dataId: { type: String, required: true, unique: true }, // Unique ID for querying

    // Ciphertext (Serialized to Base64 string)
    ciphertextBase64: { type: String, required: true },

    // HE Scheme used (BFV, CKKS, Paillier)
    scheme: { type: String, enum: ['bfv', 'ckks', 'paillier'], required: true },

    // Optional: Metadata about the data 
    metadata: { type: mongoose.Schema.Types.Mixed },

    createdAt: { type: Date, default: Date.now },
}, { collection: 'ciphertexts' });

// Export the Mongoose Model
const Ciphertext = mongoose.model("Ciphertext", CiphertextSchema);
export default Ciphertext