/**
 * Input Validation and Sanitization
 * Using express-validator for comprehensive input validation
 */

const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Handle validation results
 */
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value,
        }));

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errorMessages,
        });
    }
    next();
};

// ==================== AUTH VALIDATION ====================

const validateRegister = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 255 })
        .withMessage('Email must not exceed 255 characters'),

    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .isLength({ max: 128 })
        .withMessage('Password must not exceed 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

    body('first_name')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('First name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

    body('last_name')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Last name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

    body('role')
        .optional()
        .isIn(['student', 'instructor'])
        .withMessage('Role must be either student or instructor'),

    handleValidation,
];

const validateLogin = [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Password is required'),

    handleValidation,
];

// ==================== USER VALIDATION ====================

const validateUpdateUser = [
    body('first_name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('First name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

    body('last_name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Last name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

    body('bio')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Bio must not exceed 1000 characters'),

    handleValidation,
];

const validateChangePassword = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),

    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .isLength({ max: 128 })
        .withMessage('New password must not exceed 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),

    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.newPassword) {
                throw new Error('Password confirmation does not match');
            }
            return true;
        }),

    handleValidation,
];

// ==================== COURSE VALIDATION ====================

const validateCreateCourse = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Course title is required')
        .isLength({ min: 5, max: 255 })
        .withMessage('Course title must be between 5 and 255 characters'),

    body('description')
        .trim()
        .notEmpty()
        .withMessage('Course description is required')
        .isLength({ min: 50 })
        .withMessage('Course description must be at least 50 characters'),

    body('short_description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Short description must not exceed 500 characters'),

    body('category_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Invalid category ID'),

    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),

    body('discount_price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Discount price must be a positive number')
        .custom((value, { req }) => {
            if (req.body.price && value >= req.body.price) {
                throw new Error('Discount price must be less than the original price');
            }
            return true;
        }),

    body('level')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced', 'all_levels'])
        .withMessage('Invalid course level'),

    body('language')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Language must not exceed 50 characters'),

    body('requirements')
        .optional()
        .isArray()
        .withMessage('Requirements must be an array'),

    body('what_you_learn')
        .optional()
        .isArray()
        .withMessage('What you learn must be an array'),

    body('tags')
        .optional()
        .isArray()
        .withMessage('Tags must be an array'),

    handleValidation,
];

const validateUpdateCourse = [
    body('title')
        .optional()
        .trim()
        .isLength({ min: 5, max: 255 })
        .withMessage('Course title must be between 5 and 255 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ min: 50 })
        .withMessage('Course description must be at least 50 characters'),

    body('short_description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Short description must not exceed 500 characters'),

    body('category_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Invalid category ID'),

    body('price')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Price must be a positive number'),

    body('level')
        .optional()
        .isIn(['beginner', 'intermediate', 'advanced', 'all_levels'])
        .withMessage('Invalid course level'),

    body('is_published')
        .optional()
        .isBoolean()
        .withMessage('is_published must be a boolean'),

    body('is_featured')
        .optional()
        .isBoolean()
        .withMessage('is_featured must be a boolean'),

    handleValidation,
];

// ==================== LESSON VALIDATION ====================

const validateCreateLesson = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Lesson title is required')
        .isLength({ min: 3, max: 255 })
        .withMessage('Lesson title must be between 3 and 255 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Description must not exceed 2000 characters'),

    body('section_name')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Section name must not exceed 255 characters'),

    body('content_type')
        .optional()
        .isIn(['video', 'article', 'quiz', 'assignment'])
        .withMessage('Invalid content type'),

    body('order_index')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Order index must be a non-negative integer'),

    body('is_preview')
        .optional()
        .isBoolean()
        .withMessage('is_preview must be a boolean'),

    handleValidation,
];

const validateUpdateLesson = [
    body('title')
        .optional()
        .trim()
        .isLength({ min: 3, max: 255 })
        .withMessage('Lesson title must be between 3 and 255 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Description must not exceed 2000 characters'),

    body('content_type')
        .optional()
        .isIn(['video', 'article', 'quiz', 'assignment'])
        .withMessage('Invalid content type'),

    body('article_content')
        .optional()
        .trim(),

    body('is_preview')
        .optional()
        .isBoolean()
        .withMessage('is_preview must be a boolean'),

    body('is_published')
        .optional()
        .isBoolean()
        .withMessage('is_published must be a boolean'),

    handleValidation,
];

// ==================== CATEGORY VALIDATION ====================

const validateCreateCategory = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Category name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Category name must be between 2 and 100 characters'),

    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description must not exceed 500 characters'),

    body('parent_id')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Invalid parent category ID'),

    handleValidation,
];

// ==================== PAGINATION & QUERY VALIDATION ====================

const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),

    query('sort')
        .optional()
        .matches(/^[a-zA-Z_]+:(asc|desc)$/)
        .withMessage('Sort format should be field:asc or field:desc'),

    handleValidation,
];

// ==================== UUID/ID VALIDATION ====================

const validateUUID = [
    param('id')
        .notEmpty()
        .withMessage('ID is required'),
    handleValidation,
];

const validateCourseId = [
    param('courseId')
        .notEmpty()
        .withMessage('Course ID is required'),
    handleValidation,
];

// ==================== REVIEW VALIDATION ====================

const validateCreateReview = [
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),

    body('comment')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Comment must not exceed 2000 characters'),

    handleValidation,
];

module.exports = {
    handleValidation,
    validateRegister,
    validateLogin,
    validateUpdateUser,
    validateChangePassword,
    validateCreateCourse,
    validateUpdateCourse,
    validateCreateLesson,
    validateUpdateLesson,
    validateCreateCategory,
    validatePagination,
    validateUUID,
    validateCourseId,
    validateCreateReview,
};
