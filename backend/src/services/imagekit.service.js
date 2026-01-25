const ImageKit = require('imagekit');
const fs = require('fs');
const path = require('path');

let imagekit = null;

// Initialize ImageKit only if credentials are provided
const initImageKit = () => {
    if (!imagekit && process.env.IMAGEKIT_PRIVATE_KEY) {
        imagekit = new ImageKit({
            publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
            privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
            urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || '',
        });
    }
    return imagekit;
};

// Check if ImageKit is configured
const isConfigured = () => {
    return !!process.env.IMAGEKIT_PRIVATE_KEY;
};

// Upload file to ImageKit
const uploadFile = async (file, folder = '/products') => {
    const ik = initImageKit();

    if (!ik) {
        // If ImageKit is not configured, return local file URL
        console.log('ImageKit not configured, using local file storage');
        return null;
    }

    try {
        // Read the file
        const filePath = file.path;
        const fileBuffer = fs.readFileSync(filePath);
        const base64File = fileBuffer.toString('base64');

        // Upload to ImageKit
        const response = await ik.upload({
            file: base64File,
            fileName: file.originalname || `product_${Date.now()}`,
            folder: folder,
        });

        // Delete local file after upload
        fs.unlinkSync(filePath);

        return response.url;
    } catch (error) {
        console.error('ImageKit upload error:', error);
        return null;
    }
};

// Get authentication parameters for client-side uploads (optional, not used now)
const getAuthParams = (req, res) => {
    try {
        const ik = initImageKit();
        if (!ik) {
            return res.status(503).json({
                success: false,
                message: 'ImageKit is not configured. Please add credentials to .env file.',
            });
        }
        const authenticationParameters = ik.getAuthenticationParameters();
        res.json({
            success: true,
            data: authenticationParameters,
        });
    } catch (error) {
        console.error('ImageKit auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate authentication parameters',
        });
    }
};

module.exports = {
    initImageKit,
    isConfigured,
    uploadFile,
    getAuthParams,
};
