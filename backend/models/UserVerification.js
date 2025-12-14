import mongoose from "mongoose"

const userVerificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        require: true
    },
    verificationCode: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    }
},
    { timestamps: true }
)

const UserVerification = mongoose.model("UserVerification", userVerificationSchema)

export default UserVerification