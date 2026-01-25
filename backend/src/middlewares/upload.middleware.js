const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Ensure upload directories exist
const uploadPath = process.env.UPLOAD_PATH || './uploads';
const productsPath = path.join(uploadPath, 'products');
const modelsPath = path.join(uploadPath, 'models');
const logosPath = path.join(uploadPath, 'logos');
const bgPath = path.join(uploadPath, 'backgrounds');

[productsPath, modelsPath, logosPath, bgPath].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dest = productsPath;

        if (file.fieldname === 'model3d') {
            dest = modelsPath;
        } else if (file.fieldname === 'logo') {
            dest = logosPath;
        } else if (file.fieldname === 'bgImages') {
            dest = bgPath;
        }

        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `${uuidv4()}${ext}`;
        cb(null, filename);
    },
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const allowed3DTypes = /glb|gltf/;

    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    const mimetype = file.mimetype;

    if (file.fieldname === 'model3d') {
        if (allowed3DTypes.test(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only .glb and .gltf files are allowed for 3D models'));
        }
    } else if (file.fieldname === 'image' || file.fieldname === 'logo' || file.fieldname === 'bgImages') {
        if (allowedImageTypes.test(ext) && /image/.test(mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
        }
    } else {
        cb(null, true);
    }
};

// Multer upload instance
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    },
});

// Product upload (image + 3D model)
const productUpload = upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'model3d', maxCount: 1 },
]);

// Logo upload
const logoUpload = upload.single('logo');

// Background images upload (multiple)
const bgImagesUpload = upload.array('bgImages', 5);

// Get file URL
const getFileUrl = (filename, type = 'products') => {
    if (!filename) return null;
    const baseUrl = process.env.NGROK_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${baseUrl}/uploads/${type}/${filename}`;
};

module.exports = {
    upload,
    productUpload,
    logoUpload,
    bgImagesUpload,
    getFileUrl,
};
