import mongoose from "mongoose";

const MediaSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true // Ensures each user has one entry for simplicity
    },
    // Store the ciphertext Buffer directly. This will hold the HE encrypted data.
    encryptedData: {
        type: Buffer,
        required: true
    },
    // Stores the original MIME type (e.g., 'image/jpeg', 'audio/mp3', 'video/mp4')
    mimeType: {
        type: String,
        required: true
    },
    // Stores necessary data for reconstruction/decryption
    // For images: { width, height, channels }
    // For audio/video: { sampleRate, channels, duration, bitrate, etc. }
    metadata: {
        type: Object,
        default: {}
    }
});

// Exported as 'Media'
const Media = exports = mongoose.model('Media', MediaSchema);
export default Media