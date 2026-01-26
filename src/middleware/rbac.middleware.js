/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access based on user roles
 */

// Define role hierarchy
const ROLES = {
    ADMIN: 'admin',
    INSTRUCTOR: 'instructor',
    STUDENT: 'student',
};

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY = {
    student: 1,
    instructor: 2,
    admin: 3,
};

/**
 * Check if user has one of the required roles
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.',
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
            });
        }

        next();
    };
};

/**
 * Check if user has minimum role level
 * @param {string} minRole - Minimum required role
 */
const authorizeMinRole = (minRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.',
            });
        }

        const userRoleLevel = ROLE_HIERARCHY[req.user.role] || 0;
        const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

        if (userRoleLevel < requiredLevel) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Insufficient permissions.',
            });
        }

        next();
    };
};

/**
 * Admin only access
 */
const adminOnly = authorize(ROLES.ADMIN);

/**
 * Instructor and admin access
 */
const instructorAndAbove = authorize(ROLES.ADMIN, ROLES.INSTRUCTOR);

/**
 * Check if user owns the resource or is admin
 * @param {Function} getResourceUserId - Function to extract user ID from resource
 */
const ownerOrAdmin = (getResourceUserId) => {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.',
            });
        }

        // Admins can access everything
        if (req.user.role === ROLES.ADMIN) {
            return next();
        }

        try {
            const resourceUserId = await getResourceUserId(req);

            if (resourceUserId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only access your own resources.',
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error checking resource ownership.',
            });
        }
    };
};

/**
 * Check if instructor owns the course or is admin
 */
const courseOwnerOrAdmin = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.',
        });
    }

    // Admins can access everything
    if (req.user.role === ROLES.ADMIN) {
        return next();
    }

    // Must be instructor
    if (req.user.role !== ROLES.INSTRUCTOR) {
        return res.status(403).json({
            success: false,
            message: 'Only instructors and admins can perform this action.',
        });
    }

    // Check course ownership
    const courseId = req.params.courseId || req.params.id || req.body.course_id;

    if (!courseId) {
        return res.status(400).json({
            success: false,
            message: 'Course ID is required.',
        });
    }

    const db = require('../config/database');

    try {
        const [courses] = await db.pool.execute(
            'SELECT instructor_id FROM courses WHERE id = ? OR uuid = ?',
            [courseId, courseId]
        );

        if (courses.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Course not found.',
            });
        }

        if (courses[0].instructor_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only modify your own courses.',
            });
        }

        next();
    } catch (error) {
        console.error('Course ownership check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking course ownership.',
        });
    }
};

/**
 * Check if user is enrolled in course or is instructor/admin
 */
const enrolledOrInstructor = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.',
        });
    }

    // Admins can access everything
    if (req.user.role === ROLES.ADMIN) {
        return next();
    }

    const courseId = req.params.courseId || req.params.id;

    if (!courseId) {
        return res.status(400).json({
            success: false,
            message: 'Course ID is required.',
        });
    }

    const db = require('../config/database');

    try {
        // Check if instructor
        const [courses] = await db.pool.execute(
            'SELECT instructor_id FROM courses WHERE id = ? OR uuid = ?',
            [courseId, courseId]
        );

        if (courses.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Course not found.',
            });
        }

        if (courses[0].instructor_id === req.user.id) {
            req.isInstructor = true;
            return next();
        }

        // Check if enrolled
        const [enrollments] = await db.pool.execute(
            `SELECT e.id FROM enrollments e 
             INNER JOIN courses c ON e.course_id = c.id 
             WHERE e.user_id = ? AND (c.id = ? OR c.uuid = ?) AND e.status = 'active'`,
            [req.user.id, courseId, courseId]
        );

        if (enrollments.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You must be enrolled in this course.',
            });
        }

        req.isEnrolled = true;
        next();
    } catch (error) {
        console.error('Enrollment check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error checking enrollment status.',
        });
    }
};

module.exports = {
    ROLES,
    ROLE_HIERARCHY,
    authorize,
    authorizeMinRole,
    adminOnly,
    instructorAndAbove,
    ownerOrAdmin,
    courseOwnerOrAdmin,
    enrolledOrInstructor,
};
