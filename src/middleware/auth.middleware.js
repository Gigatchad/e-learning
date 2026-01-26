/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * Protect routes - Verify JWT token
 */
const protect = async (req, res, next) => {
    try {
        let token;

        // Get token from Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Also check cookies for token
        else if (req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please log in.',
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Check if user still exists and is active
            const [users] = await db.pool.execute(
                'SELECT id, uuid, email, first_name, last_name, role, is_active, email_verified FROM users WHERE id = ?',
                [decoded.id]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'User no longer exists.',
                });
            }

            const user = users[0];

            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'Your account has been deactivated. Please contact support.',
                });
            }

            // Attach user to request
            req.user = user;
            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired. Please log in again.',
                    code: 'TOKEN_EXPIRED',
                });
            }
            if (jwtError.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token. Please log in again.',
                    code: 'INVALID_TOKEN',
                });
            }
            throw jwtError;
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error. Please try again.',
        });
    }
};

/**
 * Optional auth - Attach user if token present, but don't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const [users] = await db.pool.execute(
                    'SELECT id, uuid, email, first_name, last_name, role, is_active FROM users WHERE id = ? AND is_active = 1',
                    [decoded.id]
                );

                if (users.length > 0) {
                    req.user = users[0];
                }
            } catch (err) {
                // Token invalid, but that's okay for optional auth
                req.user = null;
            }
        }

        next();
    } catch (error) {
        next();
    }
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = async (req, res, next) => {
    try {
        const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: 'Refresh token required.',
            });
        }

        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

            // Check if refresh token matches stored token
            const [users] = await db.pool.execute(
                'SELECT id, uuid, email, first_name, last_name, role, is_active, refresh_token FROM users WHERE id = ?',
                [decoded.id]
            );

            if (users.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid refresh token.',
                });
            }

            const user = users[0];

            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: 'Account is deactivated.',
                });
            }

            if (user.refresh_token !== refreshToken) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid refresh token. Please log in again.',
                });
            }

            req.user = user;
            next();
        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired refresh token.',
            });
        }
    } catch (error) {
        console.error('Refresh token verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error verifying refresh token.',
        });
    }
};

module.exports = {
    protect,
    optionalAuth,
    verifyRefreshToken,
};
