/**
 * Category Routes
 */

const express = require('express');
const router = express.Router();

const categoryController = require('../controllers/category.controller');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { adminOnly } = require('../middleware/rbac.middleware');
const { validateCreateCategory, validatePagination, validateUUID } = require('../middleware/validation.middleware');

/**
 * Public routes
 */

// Get all categories
router.get('/', optionalAuth, categoryController.getAllCategories);

// Get category by ID or slug
router.get('/:id', categoryController.getCategoryById);

// Get courses in a category
router.get('/:id/courses', validatePagination, categoryController.getCategoryCourses);

/**
 * Admin routes
 */

// Create category
router.post('/', protect, adminOnly, validateCreateCategory, categoryController.createCategory);

// Update category
router.put('/:id', protect, adminOnly, categoryController.updateCategory);

// Delete category
router.delete('/:id', protect, adminOnly, categoryController.deleteCategory);

module.exports = router;
