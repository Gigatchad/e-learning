/**
 * User Routes
 */

const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/rbac.middleware');
const { validateUpdateUser, validatePagination, validateUUID } = require('../middleware/validation.middleware');
const { uploadAvatar } = require('../middleware/upload.middleware');

/**
 * Public routes
 */

// Get all instructors (public)
router.get('/instructors', validatePagination, userController.getInstructors);

/**
 * Protected routes
 */

// Update current user's profile
router.put('/profile', protect, validateUpdateUser, userController.updateProfile);

// Upload avatar
router.post('/avatar', protect, uploadAvatar, userController.updateAvatar);

/**
 * Admin routes
 */

// Get all users (admin only)
router.get('/', protect, adminOnly, validatePagination, userController.getAllUsers);

// Get user by ID
router.get('/:id', protect, adminOnly, validateUUID, userController.getUserById);

// Update user (admin only)
router.put('/:id', protect, adminOnly, validateUUID, userController.updateUser);

// Delete user (admin only)
router.delete('/:id', protect, adminOnly, validateUUID, userController.deleteUser);

module.exports = router;
