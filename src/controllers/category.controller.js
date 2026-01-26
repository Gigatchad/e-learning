/**
 * Category Controller
 * Handles category CRUD operations
 */

const db = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { generateSlug, pick } = require('../utils/helpers');
const { getPaginationParams, createPaginationMeta } = require('../utils/pagination');

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     tags: [Categories]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of categories
 */
const getAllCategories = catchAsync(async (req, res) => {
    const { includeInactive } = req.query;
    const isAdmin = req.user && req.user.role === 'admin';

    let whereClause = 'WHERE 1=1';
    if (!isAdmin && !includeInactive) {
        whereClause += ' AND c.is_active = 1';
    }

    const [categories] = await db.pool.execute(
        `SELECT c.id, c.name, c.slug, c.description, c.icon_url, c.parent_id, c.is_active,
                p.name as parent_name, p.slug as parent_slug,
                COUNT(DISTINCT co.id) as course_count
         FROM categories c
         LEFT JOIN categories p ON c.parent_id = p.id
         LEFT JOIN courses co ON c.id = co.category_id AND co.is_published = 1
         ${whereClause}
         GROUP BY c.id
         ORDER BY c.name ASC`
    );

    // Build hierarchical structure
    const rootCategories = categories.filter(c => !c.parent_id);
    const childCategories = categories.filter(c => c.parent_id);

    rootCategories.forEach(parent => {
        parent.subcategories = childCategories.filter(c => c.parent_id === parent.id);
    });

    res.json({
        success: true,
        data: rootCategories,
    });
});

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID or slug
 *     tags: [Categories]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
const getCategoryById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const [categories] = await db.pool.execute(
        `SELECT c.*, p.name as parent_name, p.slug as parent_slug,
                COUNT(DISTINCT co.id) as course_count
         FROM categories c
         LEFT JOIN categories p ON c.parent_id = p.id
         LEFT JOIN courses co ON c.id = co.category_id AND co.is_published = 1
         WHERE c.id = ? OR c.slug = ?
         GROUP BY c.id`,
        [id, id]
    );

    if (categories.length === 0) {
        throw new AppError('Category not found', 404);
    }

    const category = categories[0];

    // Get subcategories
    const [subcategories] = await db.pool.execute(
        `SELECT id, name, slug, description, icon_url, is_active
         FROM categories WHERE parent_id = ?`,
        [category.id]
    );
    category.subcategories = subcategories;

    res.json({
        success: true,
        data: category,
    });
});

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a new category (Admin only)
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               parent_id:
 *                 type: integer
 *               icon_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 */
const createCategory = catchAsync(async (req, res) => {
    const { name, description, parent_id, icon_url } = req.body;

    // Generate slug
    const slug = generateSlug(name);

    // Check if slug exists
    const [existing] = await db.pool.execute(
        'SELECT id FROM categories WHERE slug = ?',
        [slug]
    );

    if (existing.length > 0) {
        throw new AppError('A category with this name already exists', 400);
    }

    // Verify parent exists if provided
    if (parent_id) {
        const [parent] = await db.pool.execute(
            'SELECT id FROM categories WHERE id = ?',
            [parent_id]
        );
        if (parent.length === 0) {
            throw new AppError('Parent category not found', 400);
        }
    }

    const [result] = await db.pool.execute(
        `INSERT INTO categories (name, slug, description, parent_id, icon_url)
         VALUES (?, ?, ?, ?, ?)`,
        [name, slug, description || null, parent_id || null, icon_url || null]
    );

    // Get created category
    const [categories] = await db.pool.execute(
        'SELECT * FROM categories WHERE id = ?',
        [result.insertId]
    );

    res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: categories[0],
    });
});

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category (Admin only)
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Category'
 *     responses:
 *       200:
 *         description: Category updated successfully
 */
const updateCategory = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Check if category exists
    const [existing] = await db.pool.execute(
        'SELECT id FROM categories WHERE id = ?',
        [id]
    );

    if (existing.length === 0) {
        throw new AppError('Category not found', 404);
    }

    const allowedFields = ['name', 'description', 'parent_id', 'icon_url', 'is_active'];
    const updates = pick(req.body, allowedFields);

    if (Object.keys(updates).length === 0) {
        throw new AppError('No valid fields to update', 400);
    }

    // If name is updated, update slug
    if (updates.name) {
        updates.slug = generateSlug(updates.name);

        // Check if new slug conflicts
        const [conflicting] = await db.pool.execute(
            'SELECT id FROM categories WHERE slug = ? AND id != ?',
            [updates.slug, id]
        );
        if (conflicting.length > 0) {
            throw new AppError('A category with this name already exists', 400);
        }
    }

    // Prevent self-referencing
    if (updates.parent_id && updates.parent_id == id) {
        throw new AppError('A category cannot be its own parent', 400);
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    await db.pool.execute(
        `UPDATE categories SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        [...values, id]
    );

    // Get updated category
    const [categories] = await db.pool.execute(
        'SELECT * FROM categories WHERE id = ?',
        [id]
    );

    res.json({
        success: true,
        message: 'Category updated successfully',
        data: categories[0],
    });
});

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category (Admin only)
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted successfully
 */
const deleteCategory = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Check if category exists
    const [existing] = await db.pool.execute(
        'SELECT id FROM categories WHERE id = ?',
        [id]
    );

    if (existing.length === 0) {
        throw new AppError('Category not found', 404);
    }

    // Check if category has courses
    const [courses] = await db.pool.execute(
        'SELECT COUNT(*) as count FROM courses WHERE category_id = ?',
        [id]
    );

    if (courses[0].count > 0) {
        throw new AppError('Cannot delete category with associated courses. Set courses to a different category first.', 400);
    }

    // Check if category has subcategories
    const [subcategories] = await db.pool.execute(
        'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
        [id]
    );

    if (subcategories[0].count > 0) {
        throw new AppError('Cannot delete category with subcategories. Delete or reassign subcategories first.', 400);
    }

    await db.pool.execute('DELETE FROM categories WHERE id = ?', [id]);

    res.json({
        success: true,
        message: 'Category deleted successfully',
    });
});

/**
 * @swagger
 * /api/categories/{id}/courses:
 *   get:
 *     summary: Get courses in a category
 *     tags: [Categories]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of courses in category
 */
const getCategoryCourses = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { page, limit, offset } = getPaginationParams(req.query);

    // Get category
    const [categories] = await db.pool.execute(
        'SELECT id, name FROM categories WHERE id = ? OR slug = ?',
        [id, id]
    );

    if (categories.length === 0) {
        throw new AppError('Category not found', 404);
    }

    const category = categories[0];

    // Get total count
    const [countResult] = await db.pool.execute(
        'SELECT COUNT(*) as total FROM courses WHERE category_id = ? AND is_published = 1',
        [category.id]
    );
    const total = countResult[0].total;

    // Get courses
    const [courses] = await db.pool.execute(
        `SELECT c.id, c.uuid, c.title, c.slug, c.short_description, c.thumbnail_url,
                c.price, c.discount_price, c.level, c.duration_hours, c.total_lessons,
                c.total_enrollments, c.average_rating, c.total_reviews,
                u.first_name as instructor_first_name, u.last_name as instructor_last_name
         FROM courses c
         JOIN users u ON c.instructor_id = u.id
         WHERE c.category_id = ? AND c.is_published = 1
         ORDER BY c.total_enrollments DESC
         LIMIT ? OFFSET ?`,
        [category.id, limit, offset]
    );

    const pagination = createPaginationMeta(total, page, limit);

    res.json({
        success: true,
        data: {
            category: category.name,
            courses,
        },
        pagination,
    });
});

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryCourses,
};
