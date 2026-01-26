/**
 * Enrollment Controller
 * Handles course enrollments and student progress
 */

const db = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { getPaginationParams, createPaginationMeta } = require('../utils/pagination');
const { parseJSONFields } = require('../utils/helpers');

/**
 * @swagger
 * /api/enrollments:
 *   get:
 *     summary: Get user's enrollments
 *     tags: [Enrollments]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, completed, cancelled]
 *     responses:
 *       200:
 *         description: List of enrollments
 */
const getMyEnrollments = catchAsync(async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { status } = req.query;

    let whereConditions = ['e.user_id = ?'];
    let params = [req.user.id];

    if (status) {
        whereConditions.push('e.status = ?');
        params.push(status);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get total count
    const [countResult] = await db.pool.execute(
        `SELECT COUNT(*) as total FROM enrollments e ${whereClause}`,
        params
    );
    const total = countResult[0].total;

    // Get enrollments with course details
    const [enrollments] = await db.pool.execute(
        `SELECT e.id, e.progress, e.status, e.enrolled_at, e.completed_at, e.last_accessed_at,
                c.id as course_id, c.uuid as course_uuid, c.title, c.slug, c.thumbnail_url,
                c.total_lessons, c.duration_hours,
                u.first_name as instructor_first_name, u.last_name as instructor_last_name
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         JOIN users u ON c.instructor_id = u.id
         ${whereClause}
         ORDER BY e.last_accessed_at DESC, e.enrolled_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    // Get lesson progress for each enrollment
    for (let enrollment of enrollments) {
        const [progressResult] = await db.pool.execute(
            `SELECT COUNT(*) as completed_lessons
             FROM lesson_progress
             WHERE user_id = ? AND course_id = ? AND is_completed = 1`,
            [req.user.id, enrollment.course_id]
        );
        enrollment.completed_lessons = progressResult[0].completed_lessons;
    }

    const pagination = createPaginationMeta(total, page, limit);

    res.json({
        success: true,
        data: enrollments,
        pagination,
    });
});

/**
 * @swagger
 * /api/enrollments/{courseId}:
 *   post:
 *     summary: Enroll in a course
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Enrolled successfully
 *       400:
 *         description: Already enrolled
 */
const enrollInCourse = catchAsync(async (req, res) => {
    const { courseId } = req.params;

    // Get course
    const [courses] = await db.pool.execute(
        'SELECT id, price, is_published, instructor_id FROM courses WHERE id = ? OR uuid = ?',
        [courseId, courseId]
    );

    if (courses.length === 0) {
        throw new AppError('Course not found', 404);
    }

    const course = courses[0];

    // Check if course is published
    if (!course.is_published) {
        throw new AppError('This course is not available for enrollment', 400);
    }

    // Instructors cannot enroll in their own courses
    if (course.instructor_id === req.user.id) {
        throw new AppError('You cannot enroll in your own course', 400);
    }

    // Check if already enrolled
    const [existingEnrollments] = await db.pool.execute(
        'SELECT id, status FROM enrollments WHERE user_id = ? AND course_id = ?',
        [req.user.id, course.id]
    );

    if (existingEnrollments.length > 0) {
        const existing = existingEnrollments[0];
        if (existing.status === 'active' || existing.status === 'completed') {
            throw new AppError('You are already enrolled in this course', 400);
        }

        // Reactivate cancelled enrollment
        if (existing.status === 'cancelled') {
            await db.pool.execute(
                `UPDATE enrollments SET status = 'active', enrolled_at = NOW(), 
                 progress = 0, completed_at = NULL WHERE id = ?`,
                [existing.id]
            );

            return res.json({
                success: true,
                message: 'Enrollment reactivated successfully',
            });
        }
    }

    // Create enrollment
    // Note: In a real app, you would integrate payment here for paid courses
    await db.pool.execute(
        `INSERT INTO enrollments (user_id, course_id, payment_status, payment_amount)
         VALUES (?, ?, 'paid', ?)`,
        [req.user.id, course.id, course.price]
    );

    // Update course enrollment count
    await db.pool.execute(
        'UPDATE courses SET total_enrollments = total_enrollments + 1 WHERE id = ?',
        [course.id]
    );

    res.status(201).json({
        success: true,
        message: 'Enrolled successfully',
    });
});

/**
 * @swagger
 * /api/enrollments/{courseId}:
 *   delete:
 *     summary: Cancel enrollment (unenroll)
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Enrollment cancelled
 */
const cancelEnrollment = catchAsync(async (req, res) => {
    const { courseId } = req.params;

    // Get course
    const [courses] = await db.pool.execute(
        'SELECT id FROM courses WHERE id = ? OR uuid = ?',
        [courseId, courseId]
    );

    if (courses.length === 0) {
        throw new AppError('Course not found', 404);
    }

    const course = courses[0];

    // Check if enrolled
    const [enrollments] = await db.pool.execute(
        'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = "active"',
        [req.user.id, course.id]
    );

    if (enrollments.length === 0) {
        throw new AppError('You are not enrolled in this course', 400);
    }

    // Cancel enrollment
    await db.pool.execute(
        'UPDATE enrollments SET status = "cancelled" WHERE id = ?',
        [enrollments[0].id]
    );

    // Update course enrollment count
    await db.pool.execute(
        'UPDATE courses SET total_enrollments = total_enrollments - 1 WHERE id = ? AND total_enrollments > 0',
        [course.id]
    );

    res.json({
        success: true,
        message: 'Enrollment cancelled successfully',
    });
});

/**
 * @swagger
 * /api/enrollments/{courseId}/status:
 *   get:
 *     summary: Check enrollment status for a course
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Enrollment status
 */
const checkEnrollmentStatus = catchAsync(async (req, res) => {
    const { courseId } = req.params;

    // Get course
    const [courses] = await db.pool.execute(
        'SELECT id FROM courses WHERE id = ? OR uuid = ?',
        [courseId, courseId]
    );

    if (courses.length === 0) {
        throw new AppError('Course not found', 404);
    }

    const course = courses[0];

    // Check enrollment
    const [enrollments] = await db.pool.execute(
        'SELECT id, status, progress, enrolled_at, completed_at FROM enrollments WHERE user_id = ? AND course_id = ?',
        [req.user.id, course.id]
    );

    if (enrollments.length === 0) {
        return res.json({
            success: true,
            data: {
                is_enrolled: false,
                status: null,
            },
        });
    }

    const enrollment = enrollments[0];

    // Get completed lessons count
    const [progressResult] = await db.pool.execute(
        'SELECT COUNT(*) as completed FROM lesson_progress WHERE user_id = ? AND course_id = ? AND is_completed = 1',
        [req.user.id, course.id]
    );

    res.json({
        success: true,
        data: {
            is_enrolled: enrollment.status === 'active' || enrollment.status === 'completed',
            status: enrollment.status,
            progress: enrollment.progress,
            completed_lessons: progressResult[0].completed,
            enrolled_at: enrollment.enrolled_at,
            completed_at: enrollment.completed_at,
        },
    });
});

/**
 * @swagger
 * /api/enrollments/{courseId}/progress:
 *   get:
 *     summary: Get detailed progress for a course
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detailed progress
 */
const getCourseProgress = catchAsync(async (req, res) => {
    const { courseId } = req.params;

    // Get course
    const [courses] = await db.pool.execute(
        'SELECT id, title, total_lessons FROM courses WHERE id = ? OR uuid = ?',
        [courseId, courseId]
    );

    if (courses.length === 0) {
        throw new AppError('Course not found', 404);
    }

    const course = courses[0];

    // Check if enrolled
    const [enrollments] = await db.pool.execute(
        'SELECT id, progress, status FROM enrollments WHERE user_id = ? AND course_id = ?',
        [req.user.id, course.id]
    );

    if (enrollments.length === 0 || enrollments[0].status === 'cancelled') {
        throw new AppError('You are not enrolled in this course', 403);
    }

    // Get all lessons with progress
    const [lessons] = await db.pool.execute(
        `SELECT l.id, l.uuid, l.title, l.section_name, l.order_index, l.video_duration,
                lp.is_completed, lp.watch_time, lp.last_position, lp.completed_at
         FROM lessons l
         LEFT JOIN lesson_progress lp ON l.id = lp.lesson_id AND lp.user_id = ?
         WHERE l.course_id = ? AND l.is_published = 1
         ORDER BY l.section_order, l.order_index`,
        [req.user.id, course.id]
    );

    // Calculate stats
    const completedLessons = lessons.filter(l => l.is_completed).length;
    const totalWatchTime = lessons.reduce((sum, l) => sum + (l.watch_time || 0), 0);

    // Group by sections
    const sections = {};
    lessons.forEach(lesson => {
        const sectionName = lesson.section_name || 'Default Section';
        if (!sections[sectionName]) {
            sections[sectionName] = {
                name: sectionName,
                lessons: [],
                completed: 0,
                total: 0,
            };
        }
        sections[sectionName].lessons.push(lesson);
        sections[sectionName].total++;
        if (lesson.is_completed) sections[sectionName].completed++;
    });

    const sectionsArray = Object.values(sections);

    res.json({
        success: true,
        data: {
            course_id: course.id,
            course_title: course.title,
            overall_progress: enrollments[0].progress,
            status: enrollments[0].status,
            total_lessons: course.total_lessons,
            completed_lessons: completedLessons,
            total_watch_time: totalWatchTime,
            sections: sectionsArray,
        },
    });
});

/**
 * @swagger
 * /api/courses/{courseId}/students:
 *   get:
 *     summary: Get enrolled students for a course (Instructor/Admin only)
 *     tags: [Enrollments]
 *     parameters:
 *       - in: path
 *         name: courseId
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
 *         description: List of enrolled students
 */
const getCourseStudents = catchAsync(async (req, res) => {
    const { courseId } = req.params;
    const { page, limit, offset } = getPaginationParams(req.query);

    // Get course
    const [courses] = await db.pool.execute(
        'SELECT id, instructor_id FROM courses WHERE id = ? OR uuid = ?',
        [courseId, courseId]
    );

    if (courses.length === 0) {
        throw new AppError('Course not found', 404);
    }

    const course = courses[0];

    // Check authorization
    if (req.user.role !== 'admin' && course.instructor_id !== req.user.id) {
        throw new AppError('You are not authorized to view this information', 403);
    }

    // Get total count
    const [countResult] = await db.pool.execute(
        'SELECT COUNT(*) as total FROM enrollments WHERE course_id = ?',
        [course.id]
    );
    const total = countResult[0].total;

    // Get students
    const [students] = await db.pool.execute(
        `SELECT e.id, e.progress, e.status, e.enrolled_at, e.completed_at, e.last_accessed_at,
                u.id as user_id, u.uuid as user_uuid, u.first_name, u.last_name, u.email, u.avatar_url
         FROM enrollments e
         JOIN users u ON e.user_id = u.id
         WHERE e.course_id = ?
         ORDER BY e.enrolled_at DESC
         LIMIT ? OFFSET ?`,
        [course.id, limit, offset]
    );

    const pagination = createPaginationMeta(total, page, limit);

    res.json({
        success: true,
        data: students,
        pagination,
    });
});

module.exports = {
    getMyEnrollments,
    enrollInCourse,
    cancelEnrollment,
    checkEnrollmentStatus,
    getCourseProgress,
    getCourseStudents,
};
