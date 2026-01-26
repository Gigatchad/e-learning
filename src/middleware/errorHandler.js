/**
 * Custom Error Handler Middleware
 * Centralized error handling for the application
 */

/**
 * Custom Application Error class
 */
class AppError extends Error {
    constructor(message, statusCode, code = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Handle database errors
 */
const handleDBError = (err) => {
    // Duplicate entry error
    if (err.code === 'ER_DUP_ENTRY') {
        const match = err.message.match(/Duplicate entry '(.+?)' for key '(.+?)'/);
        if (match) {
            return new AppError(`${match[2].split('.').pop()} already exists: ${match[1]}`, 400, 'DUPLICATE_ENTRY');
        }
        return new AppError('A record with this value already exists.', 400, 'DUPLICATE_ENTRY');
    }

    // Foreign key constraint error
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
        return new AppError('Referenced record not found or cannot be deleted due to dependencies.', 400, 'FOREIGN_KEY_ERROR');
    }

    // Data too long
    if (err.code === 'ER_DATA_TOO_LONG') {
        return new AppError('Input data exceeds maximum allowed length.', 400, 'DATA_TOO_LONG');
    }

    // Generic database error
    return new AppError('Database operation failed.', 500, 'DB_ERROR');
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
    return new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
};

/**
 * Handle JWT expired error
 */
const handleJWTExpiredError = () => {
    return new AppError('Your session has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
};

/**
 * Handle validation errors from express-validator
 */
const handleValidationError = (errors) => {
    const messages = errors.map(err => `${err.path}: ${err.msg}`).join('. ');
    return new AppError(messages, 400, 'VALIDATION_ERROR');
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code,
        error: err,
        stack: err.stack,
    });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            code: err.code,
        });
    }
    // Programming or other unknown error: don't leak error details
    else {
        console.error('ERROR 💥:', err);

        res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.',
            code: 'INTERNAL_ERROR',
        });
    }
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;
        error.name = err.name;

        // Handle specific error types
        if (err.code && err.code.startsWith('ER_')) {
            error = handleDBError(err);
        }
        if (err.name === 'JsonWebTokenError') {
            error = handleJWTError();
        }
        if (err.name === 'TokenExpiredError') {
            error = handleJWTExpiredError();
        }
        if (err.name === 'MulterError') {
            error = new AppError(`File upload error: ${err.message}`, 400, 'UPLOAD_ERROR');
        }

        sendErrorProd(error, res);
    }
};

/**
 * Async handler wrapper to catch errors in async functions
 */
const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = errorHandler;
module.exports.AppError = AppError;
module.exports.catchAsync = catchAsync;
module.exports.handleValidationError = handleValidationError;
