/**
 * Course Routes
 */

const express = require('express');
const router = express.Router();

const courseController = require('../controllers/course.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { instructorAndAbove, courseOwnerOrAdmin } = require('../middleware/rbac.middleware');
const {
    validateCreateCourse,
    validateUpdateCourse,
    validatePagination,
    validateUUID,
    validateCreateReview
} = require('../middleware/validation.middleware');
const { uploadThumbnail } = require('../middleware/upload.middleware');

/**
 * Public routes
 */

// Get all published courses (with filtering)
router.get('/', optionalAuth, validatePagination, courseController.getAllCourses);

// Get course by ID or slug
router.get('/:id', optionalAuth, courseController.getCourseById);

// Get course reviews
router.get('/:id/reviews', validatePagination, courseController.getCourseReviews);

/**
 * Protected routes
 */

// Get instructor's own courses
router.get('/instructor/my-courses', protect, instructorAndAbove, validatePagination, courseController.getInstructorCourses);

// Add course review
router.post('/:id/reviews', protect, validateCreateReview, courseController.addCourseReview);

/**
 * Instructor/Admin routes
 */

// Create new course
router.post('/', protect, instructorAndAbove, validateCreateCourse, courseController.createCourse);

// Update course
router.put('/:id', protect, validateUpdateCourse, courseController.updateCourse);

// Delete course
router.delete('/:id', protect, courseController.deleteCourse);

// Upload course thumbnail
router.post('/:id/thumbnail', protect, uploadThumbnail, courseController.uploadCourseThumbnail);

module.exports = router;
