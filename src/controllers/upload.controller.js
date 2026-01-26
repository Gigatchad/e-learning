/**
 * Upload Controller
 * Handles file uploads to Cloudinary
 */

const { catchAsync, AppError } = require('../middleware/errorHandler');
const cloudinary = require('../config/cloudinary');
const fs = require('fs').promises;

/**
 * @swagger
 * /api/upload/image:
 *   post:
 *     summary: Upload an image
 *     tags: [Upload]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               folder:
 *                 type: string
 *                 description: Cloudinary folder to upload to
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 */
const uploadImage = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new AppError('Please upload an image file', 400);
    }

    const folder = req.body.folder || 'elearning/general';

    // Convert buffer to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploadImage(base64Image, { folder });

    res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
            url: result.url,
            public_id: result.publicId,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
        },
    });
});

/**
 * @swagger
 * /api/upload/images:
 *   post:
 *     summary: Upload multiple images
 *     tags: [Upload]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               folder:
 *                 type: string
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 */
const uploadMultipleImages = catchAsync(async (req, res) => {
    if (!req.files || req.files.length === 0) {
        throw new AppError('Please upload at least one image file', 400);
    }

    const folder = req.body.folder || 'elearning/general';
    const uploadPromises = req.files.map(async (file) => {
        const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        return cloudinary.uploadImage(base64Image, { folder });
    });

    const results = await Promise.all(uploadPromises);

    res.json({
        success: true,
        message: 'Images uploaded successfully',
        data: results.map(result => ({
            url: result.url,
            public_id: result.publicId,
            width: result.width,
            height: result.height,
            format: result.format,
        })),
    });
});

/**
 * @swagger
 * /api/upload/video:
 *   post:
 *     summary: Upload a video
 *     tags: [Upload]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *               folder:
 *                 type: string
 *     responses:
 *       200:
 *         description: Video uploaded successfully
 */
const uploadVideo = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new AppError('Please upload a video file', 400);
    }

    const folder = req.body.folder || 'elearning/videos';

    try {
        // Upload to Cloudinary
        const result = await cloudinary.uploadVideo(req.file.path, { folder });

        // Clean up temp file
        await fs.unlink(req.file.path).catch(() => { });

        res.json({
            success: true,
            message: 'Video uploaded successfully',
            data: {
                url: result.url,
                public_id: result.publicId,
                format: result.format,
                duration: result.duration,
                bytes: result.bytes,
            },
        });
    } catch (error) {
        // Clean up temp file on error
        await fs.unlink(req.file.path).catch(() => { });
        throw error;
    }
});

/**
 * @swagger
 * /api/upload/delete:
 *   delete:
 *     summary: Delete a file from Cloudinary
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - public_id
 *             properties:
 *               public_id:
 *                 type: string
 *               resource_type:
 *                 type: string
 *                 enum: [image, video, raw]
 *                 default: image
 *     responses:
 *       200:
 *         description: File deleted successfully
 */
const deleteFile = catchAsync(async (req, res) => {
    const { public_id, resource_type = 'image' } = req.body;

    if (!public_id) {
        throw new AppError('Public ID is required', 400);
    }

    await cloudinary.deleteFile(public_id, resource_type);

    res.json({
        success: true,
        message: 'File deleted successfully',
    });
});

/**
 * @swagger
 * /api/upload/avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [Upload]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 */
const uploadAvatar = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new AppError('Please upload an image file', 400);
    }

    // Convert buffer to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Upload to Cloudinary with avatar transformations
    const result = await cloudinary.uploadAvatar(base64Image);

    res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: {
            url: result.url,
            public_id: result.publicId,
        },
    });
});

/**
 * @swagger
 * /api/upload/thumbnail:
 *   post:
 *     summary: Upload course thumbnail
 *     tags: [Upload]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Thumbnail uploaded successfully
 */
const uploadThumbnail = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new AppError('Please upload an image file', 400);
    }

    // Convert buffer to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Upload to Cloudinary with thumbnail transformations
    const result = await cloudinary.uploadThumbnail(base64Image);

    res.json({
        success: true,
        message: 'Thumbnail uploaded successfully',
        data: {
            url: result.url,
            public_id: result.publicId,
            width: result.width,
            height: result.height,
        },
    });
});

module.exports = {
    uploadImage,
    uploadMultipleImages,
    uploadVideo,
    deleteFile,
    uploadAvatar,
    uploadThumbnail,
};
