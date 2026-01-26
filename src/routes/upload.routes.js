/**
 * Upload Routes
 */

const express = require('express');
const router = express.Router();

const uploadController = require('../controllers/upload.controller');
const { protect } = require('../middleware/auth.middleware');
const { instructorAndAbove } = require('../middleware/rbac.middleware');
const {
    uploadSingleImage,
    uploadMultipleImages,
    uploadSingleVideo,
    uploadAvatar,
    uploadThumbnail,
    handleMulterError
} = require('../middleware/upload.middleware');

/**
 * All upload routes require authentication
 */

// Upload single image
router.post('/image', protect, uploadSingleImage, handleMulterError, uploadController.uploadImage);

// Upload multiple images
router.post('/images', protect, uploadMultipleImages, handleMulterError, uploadController.uploadMultipleImages);

// Upload video (instructor/admin only)
router.post('/video', protect, instructorAndAbove, uploadSingleVideo, handleMulterError, uploadController.uploadVideo);

// Upload avatar
router.post('/avatar', protect, uploadAvatar, handleMulterError, uploadController.uploadAvatar);

// Upload thumbnail (instructor/admin only)
router.post('/thumbnail', protect, instructorAndAbove, uploadThumbnail, handleMulterError, uploadController.uploadThumbnail);

// Delete file (instructor/admin only)
router.delete('/delete', protect, instructorAndAbove, uploadController.deleteFile);

module.exports = router;
