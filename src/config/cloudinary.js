/**
 * Cloudinary Configuration
 * For image and video uploads
 */

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * Upload file to Cloudinary
 * @param {string} filePath - Local file path or base64 data
 * @param {object} options - Upload options
 * @returns {Promise<object>} Upload result
 */
const uploadFile = async (filePath, options = {}) => {
    try {
        const defaultOptions = {
            folder: 'elearning',
            resource_type: 'auto',
            quality: 'auto',
            fetch_format: 'auto',
        };

        const result = await cloudinary.uploader.upload(filePath, {
            ...defaultOptions,
            ...options,
        });

        return {
            success: true,
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            duration: result.duration, // For videos
            resourceType: result.resource_type,
        };
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload file to cloud storage');
    }
};

/**
 * Upload image with specific transformations
 * @param {string} filePath - Local file path or base64
 * @param {object} options - Additional options
 */
const uploadImage = async (filePath, options = {}) => {
    return uploadFile(filePath, {
        folder: 'elearning/images',
        resource_type: 'image',
        transformation: [
            { width: 1920, height: 1080, crop: 'limit' },
            { quality: 'auto:best' },
            { fetch_format: 'auto' },
        ],
        ...options,
    });
};

/**
 * Upload avatar with square crop
 * @param {string} filePath - Local file path or base64
 */
const uploadAvatar = async (filePath) => {
    return uploadFile(filePath, {
        folder: 'elearning/avatars',
        resource_type: 'image',
        transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
        ],
    });
};

/**
 * Upload course thumbnail
 * @param {string} filePath - Local file path or base64
 */
const uploadThumbnail = async (filePath) => {
    return uploadFile(filePath, {
        folder: 'elearning/thumbnails',
        resource_type: 'image',
        transformation: [
            { width: 1280, height: 720, crop: 'fill' },
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
        ],
    });
};

/**
 * Upload video file
 * @param {string} filePath - Local file path
 * @param {object} options - Additional options
 */
const uploadVideo = async (filePath, options = {}) => {
    return uploadFile(filePath, {
        folder: 'elearning/videos',
        resource_type: 'video',
        chunk_size: 6000000, // 6MB chunks
        eager: [
            { streaming_profile: 'full_hd', format: 'm3u8' },
            { format: 'mp4', transformation: [{ quality: 'auto' }] },
        ],
        eager_async: true,
        ...options,
    });
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of the file
 * @param {string} resourceType - Type of resource (image, video, raw)
 */
const deleteFile = async (publicId, resourceType = 'image') => {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
        });
        return result.result === 'ok';
    } catch (error) {
        console.error('Cloudinary delete error:', error);
        throw new Error('Failed to delete file from cloud storage');
    }
};

/**
 * Generate optimized URL for an image
 * @param {string} publicId - Public ID of the image
 * @param {object} transformations - Transformation options
 */
const getOptimizedImageUrl = (publicId, transformations = {}) => {
    return cloudinary.url(publicId, {
        secure: true,
        transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            transformations,
        ],
    });
};

/**
 * Generate thumbnail URL from video
 * @param {string} publicId - Public ID of the video
 */
const getVideoThumbnail = (publicId) => {
    return cloudinary.url(publicId, {
        secure: true,
        resource_type: 'video',
        transformation: [
            { width: 640, height: 360, crop: 'fill' },
        ],
        format: 'jpg',
    });
};

module.exports = {
    cloudinary,
    uploadFile,
    uploadImage,
    uploadAvatar,
    uploadThumbnail,
    uploadVideo,
    deleteFile,
    getOptimizedImageUrl,
    getVideoThumbnail,
};
