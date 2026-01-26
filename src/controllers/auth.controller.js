/**
 * Authentication Controller
 * Handles user registration, login, logout, and token refresh
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { generateUUID, sanitizeOutput } = require('../utils/helpers');
const { catchAsync, AppError } = require('../middleware/errorHandler');

/**
 * Generate JWT tokens
 */
const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const refreshToken = jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    return { accessToken, refreshToken };
};

/**
 * Set tokens in cookies
 */
const setTokenCookies = (res, accessToken, refreshToken) => {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    };

    res.cookie('accessToken', accessToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [student, instructor]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or email already exists
 */
const register = catchAsync(async (req, res) => {
    const { email, password, first_name, last_name, role = 'student' } = req.body;

    // Check if email already exists
    const [existingUsers] = await db.pool.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
    );

    if (existingUsers.length > 0) {
        throw new AppError('Email already registered', 400, 'EMAIL_EXISTS');
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate UUID
    const uuid = generateUUID();

    // Create user
    const [result] = await db.pool.execute(
        `INSERT INTO users (uuid, email, password, first_name, last_name, role)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuid, email, hashedPassword, first_name, last_name, role]
    );

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(result.insertId);

    // Store refresh token
    await db.pool.execute(
        'UPDATE users SET refresh_token = ? WHERE id = ?',
        [refreshToken, result.insertId]
    );

    // Get created user
    const [users] = await db.pool.execute(
        'SELECT id, uuid, email, first_name, last_name, role, created_at FROM users WHERE id = ?',
        [result.insertId]
    );

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
            user: users[0],
            accessToken,
            refreshToken,
        },
    });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
const login = catchAsync(async (req, res) => {
    const { email, password } = req.body;

    // Get user with password
    const [users] = await db.pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
    );

    if (users.length === 0) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const user = users[0];

    // Check if account is active
    if (!user.is_active) {
        throw new AppError('Your account has been deactivated. Please contact support.', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Store refresh token
    await db.pool.execute(
        'UPDATE users SET refresh_token = ? WHERE id = ?',
        [refreshToken, user.id]
    );

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Return user without sensitive data
    const userData = sanitizeOutput(user);

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            user: userData,
            accessToken,
            refreshToken,
        },
    });
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 */
const logout = catchAsync(async (req, res) => {
    // Clear refresh token in database
    if (req.user) {
        await db.pool.execute(
            'UPDATE users SET refresh_token = NULL WHERE id = ?',
            [req.user.id]
        );
    }

    // Clear cookies
    res.cookie('accessToken', '', { maxAge: 0 });
    res.cookie('refreshToken', '', { maxAge: 0 });

    res.json({
        success: true,
        message: 'Logout successful',
    });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid refresh token
 */
const refreshToken = catchAsync(async (req, res) => {
    // User is attached by verifyRefreshToken middleware
    const user = req.user;

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

    // Update refresh token in database
    await db.pool.execute(
        'UPDATE users SET refresh_token = ? WHERE id = ?',
        [newRefreshToken, user.id]
    );

    // Set cookies
    setTokenCookies(res, accessToken, newRefreshToken);

    res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
            accessToken,
            refreshToken: newRefreshToken,
        },
    });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
const getMe = catchAsync(async (req, res) => {
    const [users] = await db.pool.execute(
        `SELECT id, uuid, email, first_name, last_name, role, avatar_url, bio, 
                is_active, email_verified, created_at, updated_at
         FROM users WHERE id = ?`,
        [req.user.id]
    );

    if (users.length === 0) {
        throw new AppError('User not found', 404);
    }

    res.json({
        success: true,
        data: users[0],
    });
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 */
const changePassword = catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const [users] = await db.pool.execute(
        'SELECT id, password FROM users WHERE id = ?',
        [req.user.id]
    );

    if (users.length === 0) {
        throw new AppError('User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password);

    if (!isPasswordValid) {
        throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await db.pool.execute(
        'UPDATE users SET password = ?, refresh_token = NULL WHERE id = ?',
        [hashedPassword, req.user.id]
    );

    // Clear tokens - user needs to login again
    res.cookie('accessToken', '', { maxAge: 0 });
    res.cookie('refreshToken', '', { maxAge: 0 });

    res.json({
        success: true,
        message: 'Password changed successfully. Please login with your new password.',
    });
});

module.exports = {
    register,
    login,
    logout,
    refreshToken,
    getMe,
    changePassword,
};
