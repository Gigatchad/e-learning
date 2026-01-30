/**
 * Wishlist Controller
 * Handles adding/removing courses from user wishlist
 */

const db = require('../config/database');
const { catchAsync, AppError } = require('../middleware/errorHandler');

/**
 * Add a course to wishlist
 */
exports.addToWishlist = catchAsync(async (req, res, next) => {
    const { course_id } = req.body;
    const user_id = req.user.id;

    // 1. Check if course already in wishlist
    const [check] = await db.pool.execute(
        'SELECT id FROM wishlists WHERE user_id = ? AND course_id = ?',
        [user_id, course_id]
    );

    if (check.length > 0) {
        throw new AppError('Course already in your wishlist', 400);
    }

    // 2. Insert into wishlist
    await db.pool.execute(
        'INSERT INTO wishlists (user_id, course_id) VALUES (?, ?)',
        [user_id, course_id]
    );

    res.status(201).json({
        success: true,
        message: 'Course added to wishlist'
    });
});

/**
 * Get user's wishlist
 */
exports.getWishlist = catchAsync(async (req, res, next) => {
    const user_id = req.user.id;

    const [wishlist] = await db.pool.execute(
        `SELECT w.id, w.course_id, c.title, c.slug, c.thumbnail_url, c.price, c.discount_price 
         FROM wishlists w
         JOIN courses c ON w.course_id = c.id
         WHERE w.user_id = ?
         ORDER BY w.created_at DESC`,
        [user_id]
    );

    res.json({
        success: true,
        data: wishlist
    });
});

/**
 * Remove course from wishlist
 */
exports.removeFromWishlist = catchAsync(async (req, res, next) => {
    const { course_id } = req.params;
    const user_id = req.user.id;

    await db.pool.execute(
        'DELETE FROM wishlists WHERE user_id = ? AND course_id = ?',
        [user_id, course_id]
    );

    res.json({
        success: true,
        message: 'Course removed from wishlist'
    });
});
