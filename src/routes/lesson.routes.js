/**
 * Lesson Routes
 */

const express = require('express');
const router = express.Router();

const lessonController = require('../controllers/lesson.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { instructorAndAbove, enrolledOrInstructor } = require('../middleware/rbac.middleware');
const { validateCreateLesson, validateUpdateLesson, validateCourseId, validateUUID } = require('../middleware/validation.middleware');
const { uploadLessonVideo, handleMulterError } = require('../middleware/upload.middleware');

/**
 * Course lessons routes (mounted at /api/courses/:courseId/lessons in course routes)
 */

// Get all lessons for a course
router.get('/course/:courseId', optionalAuth, lessonController.getCourseLessons);

// Create lesson (instructor/admin)
router.post('/course/:courseId', protect, instructorAndAbove, validateCreateLesson, lessonController.createLesson);

/**
 * Individual lesson routes
 */

// Get lesson by ID
router.get('/:id', optionalAuth, lessonController.getLessonById);

// Update lesson
router.put('/:id', protect, validateUpdateLesson, lessonController.updateLesson);

// Delete lesson
router.delete('/:id', protect, lessonController.deleteLesson);

// Upload lesson video
router.post('/:id/video', protect, uploadLessonVideo, handleMulterError, lessonController.uploadLessonVideo);

// Update lesson progress
router.post('/:id/progress', protect, lessonController.updateLessonProgress);

// Mark lesson as complete
router.post('/:id/complete', protect, lessonController.completeLesson);

module.exports = router;
