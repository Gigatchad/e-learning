/**
 * Lesson Controller
 * Handles lesson CRUD operations and progress tracking
 */

const db = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { generateUUID, parseJSONFields, pick } = require('../utils/helpers');
const { getPaginationParams, createPaginationMeta } = require('../utils/pagination');
const { uploadVideo, deleteFile } = require('../config/cloudinary');
const fs = require('fs').promises;

/**
 * @swagger
 * /api/courses/{courseId}/lessons:
 *   get:
 *     summary: Get all lessons for a course
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of lessons grouped by sections
 */
const getCourseLessons = catchAsync(async (req, res) => {
    const { courseId } = req.params;

    // Get course
    const [courses] = await db.pool.execute(
        'SELECT id, instructor_id, is_published FROM courses WHERE id = ? OR uuid = ?',
        [courseId, courseId]
    );

    if (courses.length === 0) {
        throw new AppError('Course not found', 404);
    }

    const course = courses[0];

    // Check if user can view all lessons
    const isOwnerOrAdmin = req.user && (req.user.role === 'admin' || course.instructor_id === req.user.id);
    let isEnrolled = false;

    if (req.user && !isOwnerOrAdmin) {
        const [enrollments] = await db.pool.execute(
            'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = "active"',
            [req.user.id, course.id]
        );
        isEnrolled = enrollments.length > 0;
    }

    // Build query based on access
    let whereClause = 'WHERE course_id = ?';
    if (!isOwnerOrAdmin) {
        whereClause += ' AND is_published = 1';
    }

    const [lessons] = await db.pool.execute(
        `SELECT id, uuid, section_name, section_order, title, description, content_type,
                video_url, video_duration, article_content, resources, order_index, 
                is_preview, is_published
         FROM lessons
         ${whereClause}
         ORDER BY section_order, order_index`,
        [course.id]
    );

    // Parse JSON and filter content based on access
    const processedLessons = lessons.map(lesson => {
        const processed = parseJSONFields(lesson, ['resources']);

        // Hide video URL and article content unless user has access
        if (!isOwnerOrAdmin && !isEnrolled && !lesson.is_preview) {
            processed.video_url = null;
            processed.article_content = null;
        }

        return processed;
    });

    // Group by sections
    const sections = {};
    processedLessons.forEach(lesson => {
        const sectionName = lesson.section_name || 'Default Section';
        if (!sections[sectionName]) {
            sections[sectionName] = {
                name: sectionName,
                order: lesson.section_order,
                lessons: [],
            };
        }
        sections[sectionName].lessons.push(lesson);
    });

    const sectionsArray = Object.values(sections).sort((a, b) => a.order - b.order);

    res.json({
        success: true,
        data: {
            course_id: course.id,
            is_enrolled: isEnrolled,
            is_owner: isOwnerOrAdmin,
            sections: sectionsArray,
            total_lessons: processedLessons.length,
        },
    });
});

/**
 * @swagger
 * /api/lessons/{id}:
 *   get:
 *     summary: Get lesson by ID
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson details
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
const getLessonById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const [lessons] = await db.pool.execute(
        `SELECT l.*, c.instructor_id, c.is_published as course_published
         FROM lessons l
         JOIN courses c ON l.course_id = c.id
         WHERE l.id = ? OR l.uuid = ?`,
        [id, id]
    );

    if (lessons.length === 0) {
        throw new AppError('Lesson not found', 404);
    }

    let lesson = lessons[0];

    // Check access
    const isOwnerOrAdmin = req.user && (req.user.role === 'admin' || lesson.instructor_id === req.user.id);
    let isEnrolled = false;
    let progress = null;

    if (req.user && !isOwnerOrAdmin) {
        const [enrollments] = await db.pool.execute(
            'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = "active"',
            [req.user.id, lesson.course_id]
        );
        isEnrolled = enrollments.length > 0;

        // Get progress
        const [progressResult] = await db.pool.execute(
            'SELECT is_completed, watch_time, last_position FROM lesson_progress WHERE user_id = ? AND lesson_id = ?',
            [req.user.id, lesson.id]
        );
        if (progressResult.length > 0) {
            progress = progressResult[0];
        }
    }

    // Check if user can view this lesson
    if (!isOwnerOrAdmin && !isEnrolled && !lesson.is_preview) {
        throw new AppError('You must be enrolled to access this lesson', 403);
    }

    lesson = parseJSONFields(lesson, ['resources']);

    // Remove sensitive fields
    delete lesson.instructor_id;
    delete lesson.course_published;

    res.json({
        success: true,
        data: {
            ...lesson,
            progress,
            is_enrolled: isEnrolled,
            is_owner: isOwnerOrAdmin,
        },
    });
});

/**
 * @swagger
 * /api/courses/{courseId}/lessons:
 *   post:
 *     summary: Create a new lesson
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               section_name:
 *                 type: string
 *               content_type:
 *                 type: string
 *                 enum: [video, article, quiz, assignment]
 *               order_index:
 *                 type: integer
 *               is_preview:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Lesson created successfully
 */
const createLesson = catchAsync(async (req, res) => {
    const { courseId } = req.params;
    const {
        title, description, section_name = 'Default Section', section_order = 1,
        content_type = 'video', article_content, order_index, is_preview = false
    } = req.body;

    // Get course
    const [courses] = await db.pool.execute(
        'SELECT id, instructor_id FROM courses WHERE id = ? OR uuid = ?',
        [courseId, courseId]
    );

    if (courses.length === 0) {
        throw new AppError('Course not found', 404);
    }

    const course = courses[0];

    // Check ownership
    if (req.user.role !== 'admin' && course.instructor_id !== req.user.id) {
        throw new AppError('You are not authorized to add lessons to this course', 403);
    }

    // Get next order index if not provided
    let finalOrderIndex = order_index;
    if (finalOrderIndex === undefined) {
        const [maxOrder] = await db.pool.execute(
            'SELECT MAX(order_index) as max_order FROM lessons WHERE course_id = ?',
            [course.id]
        );
        finalOrderIndex = (maxOrder[0].max_order || 0) + 1;
    }

    const uuid = generateUUID();

    const [result] = await db.pool.execute(
        `INSERT INTO lessons (uuid, course_id, section_name, section_order, title, description,
                             content_type, article_content, order_index, is_preview)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid, course.id, section_name, section_order, title, description || null,
            content_type, article_content || null, finalOrderIndex, is_preview ? 1 : 0]
    );

    // Update course lesson count
    await db.pool.execute(
        'UPDATE courses SET total_lessons = total_lessons + 1 WHERE id = ?',
        [course.id]
    );

    // Get created lesson
    const [lessons] = await db.pool.execute(
        'SELECT * FROM lessons WHERE id = ?',
        [result.insertId]
    );

    res.status(201).json({
        success: true,
        message: 'Lesson created successfully',
        data: parseJSONFields(lessons[0], ['resources']),
    });
});

/**
 * @swagger
 * /api/lessons/{id}:
 *   put:
 *     summary: Update a lesson
 *     tags: [Lessons]
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
 *             $ref: '#/components/schemas/Lesson'
 *     responses:
 *       200:
 *         description: Lesson updated successfully
 */
const updateLesson = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Get lesson with course info
    const [lessons] = await db.pool.execute(
        `SELECT l.*, c.instructor_id FROM lessons l
         JOIN courses c ON l.course_id = c.id
         WHERE l.id = ? OR l.uuid = ?`,
        [id, id]
    );

    if (lessons.length === 0) {
        throw new AppError('Lesson not found', 404);
    }

    const lesson = lessons[0];

    // Check ownership
    if (req.user.role !== 'admin' && lesson.instructor_id !== req.user.id) {
        throw new AppError('You are not authorized to update this lesson', 403);
    }

    const allowedFields = [
        'title', 'description', 'section_name', 'section_order', 'content_type',
        'article_content', 'order_index', 'is_preview', 'is_published', 'resources'
    ];
    const updates = pick(req.body, allowedFields);

    if (Object.keys(updates).length === 0) {
        throw new AppError('No valid fields to update', 400);
    }

    // Handle resources JSON
    if (updates.resources && Array.isArray(updates.resources)) {
        updates.resources = JSON.stringify(updates.resources);
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    await db.pool.execute(
        `UPDATE lessons SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        [...values, lesson.id]
    );

    // Get updated lesson
    const [updatedLessons] = await db.pool.execute(
        'SELECT * FROM lessons WHERE id = ?',
        [lesson.id]
    );

    res.json({
        success: true,
        message: 'Lesson updated successfully',
        data: parseJSONFields(updatedLessons[0], ['resources']),
    });
});

/**
 * @swagger
 * /api/lessons/{id}:
 *   delete:
 *     summary: Delete a lesson
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson deleted successfully
 */
const deleteLesson = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Get lesson with course info
    const [lessons] = await db.pool.execute(
        `SELECT l.*, c.instructor_id FROM lessons l
         JOIN courses c ON l.course_id = c.id
         WHERE l.id = ? OR l.uuid = ?`,
        [id, id]
    );

    if (lessons.length === 0) {
        throw new AppError('Lesson not found', 404);
    }

    const lesson = lessons[0];

    // Check ownership
    if (req.user.role !== 'admin' && lesson.instructor_id !== req.user.id) {
        throw new AppError('You are not authorized to delete this lesson', 403);
    }

    // Delete lesson
    await db.pool.execute('DELETE FROM lessons WHERE id = ?', [lesson.id]);

    // Update course lesson count
    await db.pool.execute(
        'UPDATE courses SET total_lessons = total_lessons - 1 WHERE id = ? AND total_lessons > 0',
        [lesson.course_id]
    );

    res.json({
        success: true,
        message: 'Lesson deleted successfully',
    });
});

/**
 * @swagger
 * /api/lessons/{id}/video:
 *   post:
 *     summary: Upload lesson video
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Video uploaded successfully
 */
const uploadLessonVideo = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!req.file) {
        throw new AppError('Please upload a video file', 400);
    }

    // Get lesson with course info
    const [lessons] = await db.pool.execute(
        `SELECT l.*, c.instructor_id FROM lessons l
         JOIN courses c ON l.course_id = c.id
         WHERE l.id = ? OR l.uuid = ?`,
        [id, id]
    );

    if (lessons.length === 0) {
        // Clean up uploaded file
        await fs.unlink(req.file.path).catch(() => { });
        throw new AppError('Lesson not found', 404);
    }

    const lesson = lessons[0];

    // Check ownership
    if (req.user.role !== 'admin' && lesson.instructor_id !== req.user.id) {
        await fs.unlink(req.file.path).catch(() => { });
        throw new AppError('You are not authorized to update this lesson', 403);
    }

    try {
        // Upload to Cloudinary
        const result = await uploadVideo(req.file.path, {
            public_id: `lesson_${lesson.uuid}`,
        });

        // Update lesson with video URL and duration
        await db.pool.execute(
            'UPDATE lessons SET video_url = ?, video_duration = ?, updated_at = NOW() WHERE id = ?',
            [result.url, result.duration || 0, lesson.id]
        );

        // Calculate and update course duration
        const [durationResult] = await db.pool.execute(
            'SELECT SUM(video_duration) as total_duration FROM lessons WHERE course_id = ?',
            [lesson.course_id]
        );
        const totalHours = (durationResult[0].total_duration || 0) / 3600;

        await db.pool.execute(
            'UPDATE courses SET duration_hours = ? WHERE id = ?',
            [totalHours, lesson.course_id]
        );

        // Clean up temp file
        await fs.unlink(req.file.path).catch(() => { });

        res.json({
            success: true,
            message: 'Video uploaded successfully',
            data: {
                video_url: result.url,
                duration: result.duration,
            },
        });
    } catch (error) {
        // Clean up temp file on error
        await fs.unlink(req.file.path).catch(() => { });
        throw error;
    }
});

/**
 * @swagger
 * /api/lessons/{id}/progress:
 *   post:
 *     summary: Update lesson progress
 *     tags: [Lessons]
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
 *               is_completed:
 *                 type: boolean
 *               watch_time:
 *                 type: integer
 *               last_position:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Progress updated successfully
 */
const updateLessonProgress = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { is_completed, watch_time, last_position } = req.body;

    // Get lesson
    const [lessons] = await db.pool.execute(
        'SELECT id, course_id FROM lessons WHERE id = ? OR uuid = ?',
        [id, id]
    );

    if (lessons.length === 0) {
        throw new AppError('Lesson not found', 404);
    }

    const lesson = lessons[0];

    // Check if user is enrolled
    const [enrollments] = await db.pool.execute(
        'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = "active"',
        [req.user.id, lesson.course_id]
    );

    if (enrollments.length === 0) {
        throw new AppError('You must be enrolled to track progress', 403);
    }

    // Upsert progress
    await db.pool.execute(
        `INSERT INTO lesson_progress (user_id, lesson_id, course_id, is_completed, watch_time, last_position, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         is_completed = VALUES(is_completed),
         watch_time = VALUES(watch_time),
         last_position = VALUES(last_position),
         completed_at = VALUES(completed_at),
         updated_at = NOW()`,
        [
            req.user.id, lesson.id, lesson.course_id,
            is_completed ? 1 : 0, watch_time || 0, last_position || 0,
            is_completed ? new Date() : null
        ]
    );

    // Calculate and update enrollment progress
    const [totalLessons] = await db.pool.execute(
        'SELECT COUNT(*) as total FROM lessons WHERE course_id = ? AND is_published = 1',
        [lesson.course_id]
    );

    const [completedLessons] = await db.pool.execute(
        'SELECT COUNT(*) as completed FROM lesson_progress WHERE user_id = ? AND course_id = ? AND is_completed = 1',
        [req.user.id, lesson.course_id]
    );

    const progress = totalLessons[0].total > 0
        ? (completedLessons[0].completed / totalLessons[0].total) * 100
        : 0;

    const isCompleted = progress >= 100;

    await db.pool.execute(
        `UPDATE enrollments SET progress = ?, last_accessed_at = NOW(),
         status = ?, completed_at = ?
         WHERE user_id = ? AND course_id = ?`,
        [
            progress,
            isCompleted ? 'completed' : 'active',
            isCompleted ? new Date() : null,
            req.user.id, lesson.course_id
        ]
    );

    res.json({
        success: true,
        message: 'Progress updated successfully',
        data: {
            lesson_completed: is_completed,
            course_progress: progress,
            course_completed: isCompleted,
        },
    });
});

/**
 * @swagger
 * /api/lessons/{id}/complete:
 *   post:
 *     summary: Mark lesson as complete
 *     tags: [Lessons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lesson marked as complete
 */
const completeLesson = catchAsync(async (req, res) => {
    req.body.is_completed = true;
    return updateLessonProgress(req, res);
});

module.exports = {
    getCourseLessons,
    getLessonById,
    createLesson,
    updateLesson,
    deleteLesson,
    uploadLessonVideo,
    updateLessonProgress,
    completeLesson,
};
