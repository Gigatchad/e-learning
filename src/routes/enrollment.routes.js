/**
 * Enrollment Routes
 */

const express = require('express');
const router = express.Router();

const enrollmentController = require('../controllers/enrollment.controller');
const { protect } = require('../middleware/auth.middleware');
const { instructorAndAbove } = require('../middleware/rbac.middleware');
const { validatePagination, validateCourseId } = require('../middleware/validation.middleware');

/**
 * Student enrollment routes
 */

// Get user's enrollments
router.get('/', protect, validatePagination, enrollmentController.getMyEnrollments);

// Enroll in a course
router.post('/:courseId', protect, enrollmentController.enrollInCourse);

// Cancel enrollment
router.delete('/:courseId', protect, enrollmentController.cancelEnrollment);

// Check enrollment status
router.get('/:courseId/status', protect, enrollmentController.checkEnrollmentStatus);

// Get detailed course progress
router.get('/:courseId/progress', protect, enrollmentController.getCourseProgress);

/**
 * Instructor routes - Get course students
 */
router.get('/course/:courseId/students', protect, instructorAndAbove, validatePagination, enrollmentController.getCourseStudents);

module.exports = router;
