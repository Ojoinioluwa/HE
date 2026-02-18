import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        verified: { type: Boolean, required: true, default: false },
        wrongTrials: { type: Number, required: true, default: 0 },
        lockUntil: { type: Date },

        // --- Homomorphic Encryption Configuration ---
        heConfig: {
            publicKey: {
                type: String,
                default: null,
            },
            evaluationKey: {
                type: String,
                default: null,
            },
            // ADD THIS FIELD: Stores the AES-encrypted HE secret key
            wrappedSecretKey: {
                type: String,
                default: null,
            },
            params: {
                polyModulusDegree: { type: Number, default: 4096 },
                // Match the frontend scale (2^30)
                scale: { type: Number, default: Math.pow(2, 30) },
                scheme: { type: String, default: "ckks" },
            },
            isInitialized: {
                type: Boolean,
                default: false,
            },
        },
    },
    {
        timestamps: true,
    }
);


const User = mongoose.model("User", userSchema);
export default User;