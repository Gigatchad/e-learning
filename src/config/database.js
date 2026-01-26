/**
 * Database Configuration - MySQL Connection Pool
 * Uses mysql2/promise for async/await support
 */

const mysql = require('mysql2/promise');

// Create connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'elearning_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
});

/**
 * Test database connection
 */
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('📦 MySQL Connected:', connection.config.host);
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database Connection Failed:', error.message);
        throw error;
    }
};

/**
 * Execute a query with parameters (prevents SQL injection)
 * @param {string} sql - SQL query string with placeholders
 * @param {array} params - Parameters to replace placeholders
 * @returns {Promise<array>} Query results
 */
const query = async (sql, params = []) => {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Query Error:', error.message);
        throw error;
    }
};

/**
 * Get a connection from the pool for transactions
 * @returns {Promise<Connection>}
 */
const getConnection = async () => {
    return await pool.getConnection();
};

/**
 * Initialize database tables
 */
const initializeTables = async () => {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            role ENUM('admin', 'instructor', 'student') DEFAULT 'student',
            avatar_url VARCHAR(500) DEFAULT NULL,
            bio TEXT DEFAULT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            email_verified BOOLEAN DEFAULT FALSE,
            refresh_token VARCHAR(500) DEFAULT NULL,
            password_reset_token VARCHAR(255) DEFAULT NULL,
            password_reset_expires DATETIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_email (email),
            INDEX idx_uuid (uuid),
            INDEX idx_role (role)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createCategoriesTable = `
        CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            slug VARCHAR(150) UNIQUE NOT NULL,
            description TEXT DEFAULT NULL,
            icon_url VARCHAR(500) DEFAULT NULL,
            parent_id INT DEFAULT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
            INDEX idx_slug (slug),
            INDEX idx_parent (parent_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createCoursesTable = `
        CREATE TABLE IF NOT EXISTS courses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            title VARCHAR(255) NOT NULL,
            slug VARCHAR(300) UNIQUE NOT NULL,
            description TEXT NOT NULL,
            short_description VARCHAR(500) DEFAULT NULL,
            instructor_id INT NOT NULL,
            category_id INT DEFAULT NULL,
            thumbnail_url VARCHAR(500) DEFAULT NULL,
            preview_video_url VARCHAR(500) DEFAULT NULL,
            price DECIMAL(10, 2) DEFAULT 0.00,
            discount_price DECIMAL(10, 2) DEFAULT NULL,
            level ENUM('beginner', 'intermediate', 'advanced', 'all_levels') DEFAULT 'all_levels',
            language VARCHAR(50) DEFAULT 'English',
            duration_hours DECIMAL(5, 2) DEFAULT 0,
            total_lessons INT DEFAULT 0,
            total_enrollments INT DEFAULT 0,
            average_rating DECIMAL(2, 1) DEFAULT 0.0,
            total_reviews INT DEFAULT 0,
            is_published BOOLEAN DEFAULT FALSE,
            is_featured BOOLEAN DEFAULT FALSE,
            requirements JSON DEFAULT NULL,
            what_you_learn JSON DEFAULT NULL,
            tags JSON DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
            INDEX idx_slug (slug),
            INDEX idx_uuid (uuid),
            INDEX idx_instructor (instructor_id),
            INDEX idx_category (category_id),
            INDEX idx_published (is_published),
            INDEX idx_featured (is_featured)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createLessonsTable = `
        CREATE TABLE IF NOT EXISTS lessons (
            id INT AUTO_INCREMENT PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            course_id INT NOT NULL,
            section_name VARCHAR(255) DEFAULT 'Default Section',
            section_order INT DEFAULT 1,
            title VARCHAR(255) NOT NULL,
            description TEXT DEFAULT NULL,
            content_type ENUM('video', 'article', 'quiz', 'assignment') DEFAULT 'video',
            video_url VARCHAR(500) DEFAULT NULL,
            video_duration INT DEFAULT 0,
            article_content LONGTEXT DEFAULT NULL,
            resources JSON DEFAULT NULL,
            order_index INT DEFAULT 0,
            is_preview BOOLEAN DEFAULT FALSE,
            is_published BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            INDEX idx_uuid (uuid),
            INDEX idx_course (course_id),
            INDEX idx_order (order_index)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createEnrollmentsTable = `
        CREATE TABLE IF NOT EXISTS enrollments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            course_id INT NOT NULL,
            enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            progress DECIMAL(5, 2) DEFAULT 0.00,
            completed_at TIMESTAMP NULL,
            last_accessed_at TIMESTAMP NULL,
            status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
            payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'paid',
            payment_amount DECIMAL(10, 2) DEFAULT 0.00,
            UNIQUE KEY unique_enrollment (user_id, course_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            INDEX idx_user (user_id),
            INDEX idx_course (course_id),
            INDEX idx_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createLessonProgressTable = `
        CREATE TABLE IF NOT EXISTS lesson_progress (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            lesson_id INT NOT NULL,
            course_id INT NOT NULL,
            is_completed BOOLEAN DEFAULT FALSE,
            watch_time INT DEFAULT 0,
            completed_at TIMESTAMP NULL,
            last_position INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_progress (user_id, lesson_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            INDEX idx_user_course (user_id, course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    const createReviewsTable = `
        CREATE TABLE IF NOT EXISTS reviews (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            course_id INT NOT NULL,
            rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT DEFAULT NULL,
            is_approved BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_review (user_id, course_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
            INDEX idx_course (course_id),
            INDEX idx_rating (rating)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    try {
        await query(createUsersTable);
        await query(createCategoriesTable);
        await query(createCoursesTable);
        await query(createLessonsTable);
        await query(createEnrollmentsTable);
        await query(createLessonProgressTable);
        await query(createReviewsTable);
        return true;
    } catch (error) {
        console.error('Error initializing tables:', error.message);
        throw error;
    }
};

module.exports = {
    pool,
    query,
    getConnection,
    testConnection,
    initializeTables,
};
