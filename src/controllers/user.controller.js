/**
 * User Controller
 * Handles user profile management and admin user operations
 */

const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { sanitizeOutput, generateUUID, pick } = require('../utils/helpers');
const { getPaginationParams, createPaginationMeta, parseSortParam } = require('../utils/pagination');
const { uploadAvatar } = require('../config/cloudinary');

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, instructor, student]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: created_at:desc
 *     responses:
 *       200:
 *         description: List of users with pagination
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
const getAllUsers = catchAsync(async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { role, search, is_active } = req.query;
    const { sql: sortSQL } = parseSortParam(req.query.sort, ['created_at', 'email', 'first_name', 'last_name']);

    let whereConditions = [];
    let params = [];

    if (role) {
        whereConditions.push('role = ?');
        params.push(role);
    }

    if (is_active !== undefined) {
        whereConditions.push('is_active = ?');
        params.push(is_active === 'true' ? 1 : 0);
    }

    if (search) {
        whereConditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const [countResult] = await db.pool.execute(
        `SELECT COUNT(*) as total FROM users ${whereClause}`,
        params
    );
    const total = countResult[0].total;

    // Get paginated users
    const [users] = await db.pool.execute(
        `SELECT id, uuid, email, first_name, last_name, role, avatar_url, bio, 
                is_active, email_verified, created_at, updated_at
         FROM users ${whereClause}
         ORDER BY ${sortSQL}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    const pagination = createPaginationMeta(total, page, limit);

    res.json({
        success: true,
        data: users,
        pagination,
    });
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
const getUserById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const [users] = await db.pool.execute(
        `SELECT id, uuid, email, first_name, last_name, role, avatar_url, bio, 
                is_active, created_at
         FROM users 
         WHERE id = ? OR uuid = ?`,
        [id, id]
    );

    if (users.length === 0) {
        throw new AppError('User not found', 404);
    }

    // If it's an instructor, get their course count
    const user = users[0];
    if (user.role === 'instructor') {
        const [courseStats] = await db.pool.execute(
            `SELECT COUNT(*) as total_courses, 
                    COALESCE(SUM(total_enrollments), 0) as total_students
             FROM courses WHERE instructor_id = ? AND is_published = 1`,
            [user.id]
        );
        user.instructor_stats = courseStats[0];
    }

    res.json({
        success: true,
        data: user,
    });
});

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update current user's profile
 *     tags: [Users]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
const updateProfile = catchAsync(async (req, res) => {
    const allowedFields = ['first_name', 'last_name', 'bio'];
    const updates = pick(req.body, allowedFields);

    if (Object.keys(updates).length === 0) {
        throw new AppError('No valid fields to update', 400);
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    await db.pool.execute(
        `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        [...values, req.user.id]
    );

    // Get updated user
    const [users] = await db.pool.execute(
        `SELECT id, uuid, email, first_name, last_name, role, avatar_url, bio, 
                is_active, email_verified, created_at, updated_at
         FROM users WHERE id = ?`,
        [req.user.id]
    );

    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: users[0],
    });
});

/**
 * @swagger
 * /api/users/avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [Users]
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 */
const updateAvatar = catchAsync(async (req, res) => {
    if (!req.file) {
        throw new AppError('Please upload an image file', 400);
    }

    // Convert buffer to base64 for Cloudinary upload
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Upload to Cloudinary
    const result = await uploadAvatar(base64Image);

    // Update user avatar URL
    await db.pool.execute(
        'UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?',
        [result.url, req.user.id]
    );

    res.json({
        success: true,
        message: 'Avatar updated successfully',
        data: {
            avatar_url: result.url,
        },
    });
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user (Admin only)
 *     tags: [Users]
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
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, instructor, student]
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 */
const updateUser = catchAsync(async (req, res) => {
    const { id } = req.params;
    const allowedFields = ['first_name', 'last_name', 'role', 'is_active', 'email_verified'];
    const updates = pick(req.body, allowedFields);

    if (Object.keys(updates).length === 0) {
        throw new AppError('No valid fields to update', 400);
    }

    // Check if user exists
    const [existingUsers] = await db.pool.execute(
        'SELECT id FROM users WHERE id = ? OR uuid = ?',
        [id, id]
    );

    if (existingUsers.length === 0) {
        throw new AppError('User not found', 404);
    }

    const userId = existingUsers[0].id;

    // Don't allow admin to deactivate themselves
    if (updates.is_active === false && userId === req.user.id) {
        throw new AppError('You cannot deactivate your own account', 400);
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    await db.pool.execute(
        `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        [...values, userId]
    );

    // Get updated user
    const [users] = await db.pool.execute(
        `SELECT id, uuid, email, first_name, last_name, role, avatar_url, bio, 
                is_active, email_verified, created_at, updated_at
         FROM users WHERE id = ?`,
        [userId]
    );

    res.json({
        success: true,
        message: 'User updated successfully',
        data: users[0],
    });
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
const deleteUser = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Check if user exists
    const [existingUsers] = await db.pool.execute(
        'SELECT id FROM users WHERE id = ? OR uuid = ?',
        [id, id]
    );

    if (existingUsers.length === 0) {
        throw new AppError('User not found', 404);
    }

    const userId = existingUsers[0].id;

    // Don't allow admin to delete themselves
    if (userId === req.user.id) {
        throw new AppError('You cannot delete your own account', 400);
    }

    // Soft delete - just deactivate the user
    await db.pool.execute(
        'UPDATE users SET is_active = 0, updated_at = NOW() WHERE id = ?',
        [userId]
    );

    res.json({
        success: true,
        message: 'User deleted successfully',
    });
});

/**
 * @swagger
 * /api/users/instructors:
 *   get:
 *     summary: Get all instructors (public)
 *     tags: [Users]
 *     security: []
 *     parameters:
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
 *         description: List of instructors
 */
const getInstructors = catchAsync(async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req.query);

    // Get total count
    const [countResult] = await db.pool.execute(
        `SELECT COUNT(*) as total FROM users WHERE role = 'instructor' AND is_active = 1`
    );
    const total = countResult[0].total;

    // Get instructors with course stats
    const [instructors] = await db.pool.execute(
        `SELECT u.id, u.uuid, u.first_name, u.last_name, u.avatar_url, u.bio,
                COUNT(c.id) as total_courses,
                COALESCE(SUM(c.total_enrollments), 0) as total_students,
                COALESCE(AVG(c.average_rating), 0) as average_rating
         FROM users u
         LEFT JOIN courses c ON u.id = c.instructor_id AND c.is_published = 1
         WHERE u.role = 'instructor' AND u.is_active = 1
         GROUP BY u.id
         ORDER BY total_students DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
    );

    const pagination = createPaginationMeta(total, page, limit);

    res.json({
        success: true,
        data: instructors,
        pagination,
    });
});

module.exports = {
    getAllUsers,
    getUserById,
    updateProfile,
    updateAvatar,
    updateUser,
    deleteUser,
    getInstructors,
};
