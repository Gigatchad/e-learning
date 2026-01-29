/**
 * Database Configuration - PostgreSQL Connection Pool with MySQL Compatibility Layer
 */

const { Pool } = require('pg');

const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};

const pool = new Pool(dbConfig);

/**
 * MySQL to Postgres Query Converter
 */
const formatQuery = (sql) => {
    if (typeof sql !== 'string') return sql;

    let pIndex = 1;
    let formattedSql = sql;

    // Replace MySQL style '?' with Postgres style '$n'
    let parts = formattedSql.split('?');
    if (parts.length > 1) {
        formattedSql = parts[0];
        for (let i = 1; i < parts.length; i++) {
            formattedSql += `$${pIndex++}${parts[i]}`;
        }
    }

    // Replace common MySQL specific functions/syntax
    formattedSql = formattedSql.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP');

    // Handle INSERT queries to return ID for insertId compatibility
    const trimmedSql = formattedSql.trim().toUpperCase();
    if (trimmedSql.startsWith('INSERT') && !trimmedSql.includes('RETURNING')) {
        formattedSql = formattedSql.trim().replace(/;$/, '') + ' RETURNING id';
    }

    return formattedSql;
};

/**
 * MySQL Compatibility: shim for pg result
 */
const executeShim = async (executor, sql, params = []) => {
    const formattedSql = formatQuery(sql);
    try {
        const res = await executor.query(formattedSql, params);

        const rows = res.rows.map(row => {
            const newRow = { ...row };
            for (const key in newRow) {
                // Convert stringified numbers back to numbers (common in PG for BIGINT/DECIMAL)
                if (typeof newRow[key] === 'string' && /^\d+$/.test(newRow[key]) &&
                    (key === 'total' || key.includes('count') || key === 'id' || key.includes('_id'))) {
                    newRow[key] = parseInt(newRow[key], 10);
                }
                if (typeof newRow[key] === 'string' && /^\d+\.\d+$/.test(newRow[key]) &&
                    (key.includes('price') || key.includes('rating') || key.includes('progress'))) {
                    newRow[key] = parseFloat(newRow[key]);
                }
            }
            return newRow;
        });

        const resultMetadata = {
            insertId: rows.length > 0 ? rows[0].id : null,
            affectedRows: res.rowCount,
            changedRows: res.rowCount
        };

        const isSelect = formattedSql.trim().toUpperCase().startsWith('SELECT');
        return [isSelect ? rows : resultMetadata, res.fields];
    } catch (error) {
        console.error('❌ SQL Error:', error.message);
        console.error('SQL:', formattedSql);
        throw error;
    }
};

pool.execute = (sql, params) => executeShim(pool, sql, params);

const testConnection = async (retries = 5) => {
    while (retries > 0) {
        try {
            const client = await pool.connect();
            console.log('✅ PostgreSQL Connected Successfully');
            client.release();
            return true;
        } catch (error) {
            retries -= 1;
            console.log(`⏳ Database connection failed. Retrying... (${retries} retries left)`);
            if (retries === 0) throw error;
            await new Promise(res => setTimeout(res, 3000)); // Wait 3s
        }
    }
};

const query = async (sql, params = []) => {
    const [result] = await pool.execute(sql, params);
    return result;
};

const getConnection = async () => {
    const client = await pool.connect();
    client.execute = (sql, params) => executeShim(client, sql, params);
    return client;
};

const initializeTables = async () => {
    const triggerFunction = `
        CREATE OR REPLACE FUNCTION update_modified_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
    `;

    // Ensure users table exists first due to foreign keys
    const tableQueries = [
        `CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('admin', 'instructor', 'student')),
            avatar_url VARCHAR(500) DEFAULT NULL,
            bio TEXT DEFAULT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            email_verified BOOLEAN DEFAULT FALSE,
            refresh_token VARCHAR(500) DEFAULT NULL,
            password_reset_token VARCHAR(255) DEFAULT NULL,
            password_reset_expires TIMESTAMP DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            slug VARCHAR(150) UNIQUE NOT NULL,
            description TEXT DEFAULT NULL,
            icon_url VARCHAR(500) DEFAULT NULL,
            parent_id INT DEFAULT NULL REFERENCES categories(id) ON DELETE SET NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS courses (
            id SERIAL PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            title VARCHAR(255) NOT NULL,
            slug VARCHAR(300) UNIQUE NOT NULL,
            description TEXT NOT NULL,
            short_description VARCHAR(500) DEFAULT NULL,
            instructor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            category_id INT DEFAULT NULL REFERENCES categories(id) ON DELETE SET NULL,
            thumbnail_url VARCHAR(500) DEFAULT NULL,
            preview_video_url VARCHAR(500) DEFAULT NULL,
            price DECIMAL(10, 2) DEFAULT 0.00,
            discount_price DECIMAL(10, 2) DEFAULT NULL,
            level VARCHAR(20) DEFAULT 'all_levels' CHECK (level IN ('beginner', 'intermediate', 'advanced', 'all_levels')),
            language VARCHAR(50) DEFAULT 'English',
            duration_hours DECIMAL(5, 2) DEFAULT 0,
            total_lessons INT DEFAULT 0,
            total_enrollments INT DEFAULT 0,
            average_rating DECIMAL(2, 1) DEFAULT 0.0,
            total_reviews INT DEFAULT 0,
            is_published BOOLEAN DEFAULT FALSE,
            is_featured BOOLEAN DEFAULT FALSE,
            requirements JSONB DEFAULT NULL,
            what_you_learn JSONB DEFAULT NULL,
            tags JSONB DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS lessons (
            id SERIAL PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            section_name VARCHAR(255) DEFAULT 'Default Section',
            section_order INT DEFAULT 1,
            title VARCHAR(255) NOT NULL,
            description TEXT DEFAULT NULL,
            content_type VARCHAR(20) DEFAULT 'video' CHECK (content_type IN ('video', 'article', 'quiz', 'assignment')),
            video_url VARCHAR(500) DEFAULT NULL,
            video_duration INT DEFAULT 0,
            article_content TEXT DEFAULT NULL,
            resources JSONB DEFAULT NULL,
            order_index INT DEFAULT 0,
            is_preview BOOLEAN DEFAULT FALSE,
            is_published BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS enrollments (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            progress DECIMAL(5, 2) DEFAULT 0.00,
            completed_at TIMESTAMP NULL,
            last_accessed_at TIMESTAMP NULL,
            status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
            payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
            payment_amount DECIMAL(10, 2) DEFAULT 0.00,
            UNIQUE (user_id, course_id)
        )`,
        `CREATE TABLE IF NOT EXISTS lesson_progress (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            lesson_id INT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
            course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            is_completed BOOLEAN DEFAULT FALSE,
            watch_time INT DEFAULT 0,
            completed_at TIMESTAMP NULL,
            last_position INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, lesson_id)
        )`,
        `CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
            rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
            comment TEXT DEFAULT NULL,
            is_approved BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (user_id, course_id)
        )`
    ];

    try {
        await pool.query(triggerFunction);
        for (const sql of tableQueries) await pool.query(sql);

        await pool.query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_modtime') THEN
                    CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();
                    CREATE TRIGGER update_categories_modtime BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_modified_column();
                    CREATE TRIGGER update_courses_modtime BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_modified_column();
                    CREATE TRIGGER update_lessons_modtime BEFORE UPDATE ON lessons FOR EACH ROW EXECUTE FUNCTION update_modified_column();
                    CREATE TRIGGER update_lesson_progress_modtime BEFORE UPDATE ON lesson_progress FOR EACH ROW EXECUTE FUNCTION update_modified_column();
                    CREATE TRIGGER update_reviews_modtime BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_modified_column();
                END IF;
            END $$;
        `);

        console.log('✅ Postgres Tables & Triggers Initialized');
        return true;
    } catch (error) {
        console.error('Error initializing Postgres tables:', error.message);
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
