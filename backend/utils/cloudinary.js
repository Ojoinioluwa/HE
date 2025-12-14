// utils/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dotenv = require('dotenv');
dotenv.config();

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer + Cloudinary storage config
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        return {
            folder: 'property_images',
            resource_type: 'auto',
            public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
        };
    },
});

const upload = multer({ storage });

// Upload a single image
const uploadToCloudinary = async (filePath, folder = 'uploads') => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder,
        });
        return {
            url: result.secure_url,
            public_id: result.public_id,
        };
    } catch (error) {
        console.error('Cloudinary upload failed:', error);
        throw new Error('Image upload failed');
    }
};

// Delete an image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error('Cloudinary deletion failed:', error);
        throw new Error('Image deletion failed');
    }
};

// Upload multiple images
const uploadMultipleToCloudinary = async (filePaths, folder = 'uploads') => {
    try {
        const uploadResults = await Promise.all(
            filePaths.map((path) => uploadToCloudinary(path, folder))
        );
        return uploadResults;
    } catch (error) {
        console.error('Multiple image upload failed:', error);
        throw new Error('Multiple image upload failed');
    }
};

module.exports = {
    cloudinary,
    storage,
    upload,
    uploadToCloudinary,
    deleteFromCloudinary,
    uploadMultipleToCloudinary,
};
