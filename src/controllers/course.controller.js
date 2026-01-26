/**
 * Course Controller
 * Handles course CRUD operations with filtering, pagination, and reviews
 */

const db = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const { generateUUID, generateUniqueSlug, parseJSONFields, pick } = require('../utils/helpers');
const { getPaginationParams, createPaginationMeta, parseSortParam } = require('../utils/pagination');
const { uploadThumbnail, uploadVideo, deleteFile } = require('../config/cloudinary');

/**
 * @swagger
 * /api/courses:
 *   get:
 *     summary: Get all published courses
 *     tags: [Courses]
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
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [beginner, intermediate, advanced, all_levels]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           example: created_at:desc
 *     responses:
 *       200:
 *         description: List of courses with pagination
 */
const getAllCourses = catchAsync(async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { category, level, search, minPrice, maxPrice, instructor, is_featured, language } = req.query;
    const allowedSortFields = ['created_at', 'price', 'average_rating', 'total_enrollments', 'title'];
    const { sql: sortSQL } = parseSortParam(req.query.sort, allowedSortFields);

    let whereConditions = ['c.is_published = 1'];
    let params = [];

    if (category) {
        whereConditions.push('(cat.slug = ? OR cat.id = ?)');
        params.push(category, category);
    }

    if (level) {
        whereConditions.push('c.level = ?');
        params.push(level);
    }

    if (language) {
        whereConditions.push('c.language = ?');
        params.push(language);
    }

    if (search) {
        whereConditions.push('(c.title LIKE ? OR c.description LIKE ? OR c.tags LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }

    if (minPrice !== undefined) {
        whereConditions.push('COALESCE(c.discount_price, c.price) >= ?');
        params.push(parseFloat(minPrice));
    }

    if (maxPrice !== undefined) {
        whereConditions.push('COALESCE(c.discount_price, c.price) <= ?');
        params.push(parseFloat(maxPrice));
    }

    if (instructor) {
        whereConditions.push('(u.id = ? OR u.uuid = ?)');
        params.push(instructor, instructor);
    }

    if (is_featured === 'true') {
        whereConditions.push('c.is_featured = 1');
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get total count
    const [countResult] = await db.pool.execute(
        `SELECT COUNT(DISTINCT c.id) as total 
         FROM courses c
         LEFT JOIN categories cat ON c.category_id = cat.id
         LEFT JOIN users u ON c.instructor_id = u.id
         ${whereClause}`,
        params
    );
    const total = countResult[0].total;

    // Get paginated courses
    const [courses] = await db.pool.execute(
        `SELECT c.id, c.uuid, c.title, c.slug, c.short_description, c.thumbnail_url,
                c.price, c.discount_price, c.level, c.language, c.duration_hours,
                c.total_lessons, c.total_enrollments, c.average_rating, c.total_reviews,
                c.is_featured, c.created_at,
                cat.id as category_id, cat.name as category_name, cat.slug as category_slug,
                u.id as instructor_id, u.uuid as instructor_uuid, u.first_name as instructor_first_name, 
                u.last_name as instructor_last_name, u.avatar_url as instructor_avatar
         FROM courses c
         LEFT JOIN categories cat ON c.category_id = cat.id
         LEFT JOIN users u ON c.instructor_id = u.id
         ${whereClause}
         ORDER BY c.${sortSQL}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    // Format response
    const formattedCourses = courses.map(course => ({
        id: course.id,
        uuid: course.uuid,
        title: course.title,
        slug: course.slug,
        short_description: course.short_description,
        thumbnail_url: course.thumbnail_url,
        price: course.price,
        discount_price: course.discount_price,
        level: course.level,
        language: course.language,
        duration_hours: course.duration_hours,
        total_lessons: course.total_lessons,
        total_enrollments: course.total_enrollments,
        average_rating: course.average_rating,
        total_reviews: course.total_reviews,
        is_featured: course.is_featured,
        created_at: course.created_at,
        category: course.category_id ? {
            id: course.category_id,
            name: course.category_name,
            slug: course.category_slug,
        } : null,
        instructor: {
            id: course.instructor_id,
            uuid: course.instructor_uuid,
            first_name: course.instructor_first_name,
            last_name: course.instructor_last_name,
            avatar_url: course.instructor_avatar,
        },
    }));

    const pagination = createPaginationMeta(total, page, limit);

    res.json({
        success: true,
        data: formattedCourses,
        pagination,
    });
});

/**
 * @swagger
 * /api/courses/{id}:
 *   get:
 *     summary: Get course by ID or slug
 *     tags: [Courses]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course details
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
const getCourseById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const [courses] = await db.pool.execute(
        `SELECT c.*, 
                cat.id as category_id, cat.name as category_name, cat.slug as category_slug,
                u.id as instructor_id, u.uuid as instructor_uuid, u.first_name, u.last_name, 
                u.avatar_url as instructor_avatar, u.bio as instructor_bio
         FROM courses c
         LEFT JOIN categories cat ON c.category_id = cat.id
         LEFT JOIN users u ON c.instructor_id = u.id
         WHERE c.id = ? OR c.uuid = ? OR c.slug = ?`,
        [id, id, id]
    );

    if (courses.length === 0) {
        throw new AppError('Course not found', 404);
    }

    let course = courses[0];

    // Check if user is authorized to view unpublished course
    if (!course.is_published) {
        if (!req.user || (req.user.id !== course.instructor_id && req.user.role !== 'admin')) {
            throw new AppError('Course not found', 404);
        }
    }

    // Parse JSON fields
    course = parseJSONFields(course, ['requirements', 'what_you_learn', 'tags', 'resources']);

    // Get lessons (only preview for non-enrolled users)
    const [lessons] = await db.pool.execute(
        `SELECT id, uuid, section_name, section_order, title, description, content_type, 
                video_duration, order_index, is_preview, is_published
         FROM lessons
         WHERE course_id = ? AND is_published = 1
         ORDER BY section_order, order_index`,
        [course.id]
    );

    // Group lessons by sections
    const sections = {};
    lessons.forEach(lesson => {
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

    // Get recent reviews
    const [reviews] = await db.pool.execute(
        `SELECT r.id, r.rating, r.comment, r.created_at,
                u.first_name, u.last_name, u.avatar_url
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.course_id = ? AND r.is_approved = 1
         ORDER BY r.created_at DESC
         LIMIT 5`,
        [course.id]
    );

    // Format response
    const response = {
        id: course.id,
        uuid: course.uuid,
        title: course.title,
        slug: course.slug,
        description: course.description,
        short_description: course.short_description,
        thumbnail_url: course.thumbnail_url,
        preview_video_url: course.preview_video_url,
        price: course.price,
        discount_price: course.discount_price,
        level: course.level,
        language: course.language,
        duration_hours: course.duration_hours,
        total_lessons: course.total_lessons,
        total_enrollments: course.total_enrollments,
        average_rating: course.average_rating,
        total_reviews: course.total_reviews,
        is_published: course.is_published,
        is_featured: course.is_featured,
        requirements: course.requirements || [],
        what_you_learn: course.what_you_learn || [],
        tags: course.tags || [],
        created_at: course.created_at,
        updated_at: course.updated_at,
        category: course.category_id ? {
            id: course.category_id,
            name: course.category_name,
            slug: course.category_slug,
        } : null,
        instructor: {
            id: course.instructor_id,
            uuid: course.instructor_uuid,
            first_name: course.first_name,
            last_name: course.last_name,
            avatar_url: course.instructor_avatar,
            bio: course.instructor_bio,
        },
        sections: sectionsArray,
        recent_reviews: reviews,
    };

    res.json({
        success: true,
        data: response,
    });
});

/**
 * @swagger
 * /api/courses:
 *   post:
 *     summary: Create a new course (Instructor/Admin only)
 *     tags: [Courses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               short_description:
 *                 type: string
 *               category_id:
 *                 type: integer
 *               price:
 *                 type: number
 *               level:
 *                 type: string
 *                 enum: [beginner, intermediate, advanced, all_levels]
 *               language:
 *                 type: string
 *               requirements:
 *                 type: array
 *                 items:
 *                   type: string
 *               what_you_learn:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Course created successfully
 */
const createCourse = catchAsync(async (req, res) => {
    const {
        title, description, short_description, category_id, price = 0,
        discount_price, level = 'all_levels', language = 'English',
        requirements, what_you_learn, tags
    } = req.body;

    const uuid = generateUUID();
    const slug = generateUniqueSlug(title);

    const [result] = await db.pool.execute(
        `INSERT INTO courses (uuid, title, slug, description, short_description, instructor_id,
                             category_id, price, discount_price, level, language, 
                             requirements, what_you_learn, tags)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            uuid, title, slug, description, short_description || null, req.user.id,
            category_id || null, price, discount_price || null, level, language,
            requirements ? JSON.stringify(requirements) : null,
            what_you_learn ? JSON.stringify(what_you_learn) : null,
            tags ? JSON.stringify(tags) : null
        ]
    );

    // Get created course
    const [courses] = await db.pool.execute(
        'SELECT * FROM courses WHERE id = ?',
        [result.insertId]
    );

    let course = parseJSONFields(courses[0], ['requirements', 'what_you_learn', 'tags']);

    res.status(201).json({
        success: true,
        message: 'Course created successfully',
        data: course,
    });
});

/**
 * @swagger
 * /api/courses/{id}:
 *   put:
 *     summary: Update a course (Owner/Admin only)
 *     tags: [Courses]
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
 *             $ref: '#/components/schemas/Course'
 *     responses:
 *       200:
 *         description: Course updated successfully
 */
const updateCourse = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Check if course exists
    const [existingCourses] = await db.pool.execute(
        'SELECT id, instructor_id FROM courses WHERE id = ? OR uuid = ?',
        [id, id]
    );

    if (existingCourses.length === 0) {
        throw new AppError('Course not found', 404);
    }

    const course = existingCourses[0];

    // Check ownership (unless admin)
    if (req.user.role !== 'admin' && course.instructor_id !== req.user.id) {
        throw new AppError('You are not authorized to update this course', 403);
    }

    const allowedFields = [
        'title', 'description', 'short_description', 'category_id', 'price',
        'discount_price', 'level', 'language', 'requirements', 'what_you_learn',
        'tags', 'is_published', 'is_featured'
    ];
    const updates = pick(req.body, allowedFields);

    if (Object.keys(updates).length === 0) {
        throw new AppError('No valid fields to update', 400);
    }

    // Handle JSON fields
    ['requirements', 'what_you_learn', 'tags'].forEach(field => {
        if (updates[field] && Array.isArray(updates[field])) {
            updates[field] = JSON.stringify(updates[field]);
        }
    });

    // If title is updated, update slug too
    if (updates.title) {
        updates.slug = generateUniqueSlug(updates.title);
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    await db.pool.execute(
        `UPDATE courses SET ${setClause}, updated_at = NOW() WHERE id = ?`,
        [...values, course.id]
    );

    // Get updated course
    const [updatedCourses] = await db.pool.execute(
        'SELECT * FROM courses WHERE id = ?',
        [course.id]
    );

    let updatedCourse = parseJSONFields(updatedCourses[0], ['requirements', 'what_you_learn', 'tags']);

    res.json({
        success: true,
        message: 'Course updated successfully',
        data: updatedCourse,
    });
});

/**
 * @swagger
 * /api/courses/{id}:
 *   delete:
 *     summary: Delete a course (Owner/Admin only)
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course deleted successfully
 */
const deleteCourse = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Check if course exists
    const [existingCourses] = await db.pool.execute(
        'SELECT id, instructor_id FROM courses WHERE id = ? OR uuid = ?',
        [id, id]
    );

    if (existingCourses.length === 0) {
        throw new AppError('Course not found', 404);
    }

    const course = existingCourses[0];

    // Check ownership (unless admin)
    if (req.user.role !== 'admin' && course.instructor_id !== req.user.id) {
        throw new AppError('You are not authorized to delete this course', 403);
    }

    // Delete course (cascades to lessons, enrollments, etc.)
    await db.pool.execute('DELETE FROM courses WHERE id = ?', [course.id]);

    res.json({
        success: true,
        message: 'Course deleted successfully',
    });
});

/**
 * @swagger
 * /api/courses/{id}/thumbnail:
 *   post:
 *     summary: Upload course thumbnail
 *     tags: [Courses]
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
 *               thumbnail:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Thumbnail uploaded successfully
 */
const uploadCourseThumbnail = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!req.file) {
        throw new AppError('Please upload an image file', 400);
    }

    // Check if course exists and user is owner
    const [courses] = await db.pool.execute(
        'SELECT id, instructor_id, thumbnail_url FROM courses WHERE id = ? OR uuid = ?',
        [id, id]
    );

    if (courses.length === 0) {
        throw new AppError('Course not found', 404);
    }

    const course = courses[0];

    if (req.user.role !== 'admin' && course.instructor_id !== req.user.id) {
        throw new AppError('You are not authorized to update this course', 403);
    }

    // Convert buffer to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    // Upload to Cloudinary
    const result = await uploadThumbnail(base64Image);

    // Update course thumbnail URL
    await db.pool.execute(
        'UPDATE courses SET thumbnail_url = ?, updated_at = NOW() WHERE id = ?',
        [result.url, course.id]
    );

    res.json({
        success: true,
        message: 'Thumbnail uploaded successfully',
        data: {
            thumbnail_url: result.url,
        },
    });
});

/**
 * @swagger
 * /api/courses/{id}/reviews:
 *   get:
 *     summary: Get course reviews
 *     tags: [Courses]
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
 *         description: List of reviews
 */
const getCourseReviews = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { page, limit, offset } = getPaginationParams(req.query);

    // Get course
    const [courses] = await db.pool.execute(
        'SELECT id FROM courses WHERE id = ? OR uuid = ? OR slug = ?',
        [id, id, id]
    );

    if (courses.length === 0) {
        throw new AppError('Course not found', 404);
    }

    const courseId = courses[0].id;

    // Get total count
    const [countResult] = await db.pool.execute(
        'SELECT COUNT(*) as total FROM reviews WHERE course_id = ? AND is_approved = 1',
        [courseId]
    );
    const total = countResult[0].total;

    // Get reviews
    const [reviews] = await db.pool.execute(
        `SELECT r.id, r.rating, r.comment, r.created_at,
                u.id as user_id, u.first_name, u.last_name, u.avatar_url
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.course_id = ? AND r.is_approved = 1
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
        [courseId, limit, offset]
    );

    // Get rating distribution
    const [distribution] = await db.pool.execute(
        `SELECT rating, COUNT(*) as count
         FROM reviews
         WHERE course_id = ? AND is_approved = 1
         GROUP BY rating`,
        [courseId]
    );

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach(d => {
        ratingDistribution[d.rating] = d.count;
    });

    const pagination = createPaginationMeta(total, page, limit);

    res.json({
        success: true,
        data: {
            reviews,
            rating_distribution: ratingDistribution,
        },
        pagination,
    });
});

/**
 * @swagger
 * /api/courses/{id}/reviews:
 *   post:
 *     summary: Add course review
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
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
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review added successfully
 */
const addCourseReview = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;

    // Get course
    const [courses] = await db.pool.execute(
        'SELECT id FROM courses WHERE id = ? OR uuid = ?',
        [id, id]
    );

    if (courses.length === 0) {
        throw new AppError('Course not found', 404);
    }

    const courseId = courses[0].id;

    // Check if user is enrolled
    const [enrollments] = await db.pool.execute(
        'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
        [req.user.id, courseId]
    );

    if (enrollments.length === 0) {
        throw new AppError('You must be enrolled in this course to leave a review', 403);
    }

    // Check if user already reviewed
    const [existingReviews] = await db.pool.execute(
        'SELECT id FROM reviews WHERE user_id = ? AND course_id = ?',
        [req.user.id, courseId]
    );

    if (existingReviews.length > 0) {
        throw new AppError('You have already reviewed this course', 400);
    }

    // Create review
    await db.pool.execute(
        'INSERT INTO reviews (user_id, course_id, rating, comment) VALUES (?, ?, ?, ?)',
        [req.user.id, courseId, rating, comment || null]
    );

    // Update course rating
    const [ratingResult] = await db.pool.execute(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
         FROM reviews WHERE course_id = ? AND is_approved = 1`,
        [courseId]
    );

    await db.pool.execute(
        'UPDATE courses SET average_rating = ?, total_reviews = ? WHERE id = ?',
        [ratingResult[0].avg_rating || 0, ratingResult[0].total_reviews, courseId]
    );

    res.status(201).json({
        success: true,
        message: 'Review added successfully',
    });
});

/**
 * @swagger
 * /api/courses/instructor/my-courses:
 *   get:
 *     summary: Get instructor's own courses
 *     tags: [Courses]
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
 *         description: List of instructor's courses
 */
const getInstructorCourses = catchAsync(async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { is_published } = req.query;

    let whereConditions = ['instructor_id = ?'];
    let params = [req.user.id];

    if (is_published !== undefined) {
        whereConditions.push('is_published = ?');
        params.push(is_published === 'true' ? 1 : 0);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get total count
    const [countResult] = await db.pool.execute(
        `SELECT COUNT(*) as total FROM courses ${whereClause}`,
        params
    );
    const total = countResult[0].total;

    // Get courses
    const [courses] = await db.pool.execute(
        `SELECT c.*, cat.name as category_name
         FROM courses c
         LEFT JOIN categories cat ON c.category_id = cat.id
         ${whereClause}
         ORDER BY c.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    const formattedCourses = courses.map(course =>
        parseJSONFields(course, ['requirements', 'what_you_learn', 'tags'])
    );

    const pagination = createPaginationMeta(total, page, limit);

    res.json({
        success: true,
        data: formattedCourses,
        pagination,
    });
});

module.exports = {
    getAllCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    uploadCourseThumbnail,
    getCourseReviews,
    addCourseReview,
    getInstructorCourses,
};
