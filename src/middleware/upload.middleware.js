/**
 * File Upload Middleware
 * Using Multer for handling multipart/form-data
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { AppError } = require('./errorHandler');

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

// File size limits
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_DOCUMENT_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Memory storage for uploading to Cloudinary
 */
const memoryStorage = multer.memoryStorage();

/**
 * Disk storage for temporary files
 */
const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/temp');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

/**
 * File filter for images
 */
const imageFilter = (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Only JPEG, PNG, GIF, and WebP images are allowed.', 400, 'INVALID_FILE_TYPE'), false);
    }
};

/**
 * File filter for videos
 */
const videoFilter = (req, file, cb) => {
    if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Only MP4, WebM, MOV, and AVI videos are allowed.', 400, 'INVALID_FILE_TYPE'), false);
    }
};

/**
 * File filter for documents
 */
const documentFilter = (req, file, cb) => {
    if (ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Only PDF, Word, and PowerPoint documents are allowed.', 400, 'INVALID_FILE_TYPE'), false);
    }
};

/**
 * Multi-type file filter (for mixed uploads)
 */
const multiTypeFilter = (req, file, cb) => {
    const allAllowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES];
    if (allAllowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new AppError('Invalid file type. Allowed: images, videos, and documents.', 400, 'INVALID_FILE_TYPE'), false);
    }
};

/**
 * Upload single image
 */
const uploadSingleImage = multer({
    storage: memoryStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: MAX_IMAGE_SIZE,
        files: 1,
    },
}).single('image');

/**
 * Upload single avatar
 */
const uploadAvatar = multer({
    storage: memoryStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB for avatars
        files: 1,
    },
}).single('avatar');

/**
 * Upload course thumbnail
 */
const uploadThumbnail = multer({
    storage: memoryStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: MAX_IMAGE_SIZE,
        files: 1,
    },
}).single('thumbnail');

/**
 * Upload single video
 */
const uploadSingleVideo = multer({
    storage: diskStorage, // Use disk storage for large videos
    fileFilter: videoFilter,
    limits: {
        fileSize: MAX_VIDEO_SIZE,
        files: 1,
    },
}).single('video');

/**
 * Upload lesson video
 */
const uploadLessonVideo = multer({
    storage: diskStorage,
    fileFilter: videoFilter,
    limits: {
        fileSize: MAX_VIDEO_SIZE,
        files: 1,
    },
}).single('video');

/**
 * Upload multiple images (up to 10)
 */
const uploadMultipleImages = multer({
    storage: memoryStorage,
    fileFilter: imageFilter,
    limits: {
        fileSize: MAX_IMAGE_SIZE,
        files: 10,
    },
}).array('images', 10);

/**
 * Upload course resources (documents)
 */
const uploadResources = multer({
    storage: diskStorage,
    fileFilter: multiTypeFilter,
    limits: {
        fileSize: MAX_DOCUMENT_SIZE,
        files: 5,
    },
}).array('resources', 5);

/**
 * Handle multer errors
 */
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: 'File size exceeds the maximum allowed limit.',
                    code: 'FILE_TOO_LARGE',
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'Too many files uploaded.',
                    code: 'TOO_MANY_FILES',
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    message: 'Unexpected field name in file upload.',
                    code: 'UNEXPECTED_FIELD',
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: `Upload error: ${err.message}`,
                    code: 'UPLOAD_ERROR',
                });
        }
    }
    next(err);
};

module.exports = {
    uploadSingleImage,
    uploadAvatar,
    uploadThumbnail,
    uploadSingleVideo,
    uploadLessonVideo,
    uploadMultipleImages,
    uploadResources,
    handleMulterError,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_VIDEO_TYPES,
    ALLOWED_DOCUMENT_TYPES,
};
