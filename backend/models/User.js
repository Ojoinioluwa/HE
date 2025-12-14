import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
        required: true,
    },
    verified: {
        type: Boolean,
        required: true,
        default: false
    },
    wrongTrials: {
        type: Number,
        required: true,
        default: 0
    },
    lockUntil: {
        type: Date,
    },
    userType: {
        type: String,
        enum: ['landlord', 'renter'],
        required: true
    }

},
    {
        timestamps: true
    })

const User = mongoose.model("User", userSchema)
export default User