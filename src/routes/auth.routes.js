/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { protect, verifyRefreshToken } = require('../middleware/auth.middleware');
const { validateRegister, validateLogin, validateChangePassword } = require('../middleware/validation.middleware');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 */
router.post('/register', validateRegister, authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     security: []
 */
router.post('/login', validateLogin, authController.login);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 */
router.post('/logout', protect, authController.logout);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security: []
 */
router.post('/refresh', verifyRefreshToken, authController.refreshToken);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 */
router.get('/me', protect, authController.getMe);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Auth]
 */
router.post('/change-password', protect, validateChangePassword, authController.changePassword);

module.exports = router;
