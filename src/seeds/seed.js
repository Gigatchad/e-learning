/**
 * Database Seeder
 * Creates initial data for testing and development
 * 
 * Run: node src/seeds/seed.js
 */

require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateUUID, generateSlug, generateUniqueSlug } = require('../utils/helpers');

const seedUsers = async () => {
    console.log('🌱 Seeding users...');

    const hashedPassword = await bcrypt.hash('Admin123!', 12);

    const users = [
        {
            uuid: generateUUID(),
            email: 'admin@elearning.com',
            password: hashedPassword,
            first_name: 'Admin',
            last_name: 'User',
            role: 'admin',
            bio: 'System administrator',
            is_active: true,
            email_verified: true,
        },
        {
            uuid: generateUUID(),
            email: 'instructor@elearning.com',
            password: hashedPassword,
            first_name: 'John',
            last_name: 'Instructor',
            role: 'instructor',
            bio: 'Experienced web development instructor with 10+ years of industry experience.',
            is_active: true,
            email_verified: true,
        },
        {
            uuid: generateUUID(),
            email: 'instructor2@elearning.com',
            password: hashedPassword,
            first_name: 'Jane',
            last_name: 'Teacher',
            role: 'instructor',
            bio: 'Data science expert and machine learning enthusiast.',
            is_active: true,
            email_verified: true,
        },
        {
            uuid: generateUUID(),
            email: 'student@elearning.com',
            password: hashedPassword,
            first_name: 'Alice',
            last_name: 'Student',
            role: 'student',
            bio: 'Aspiring developer eager to learn new technologies.',
            is_active: true,
            email_verified: true,
        },
        {
            uuid: generateUUID(),
            email: 'student2@elearning.com',
            password: hashedPassword,
            first_name: 'Bob',
            last_name: 'Learner',
            role: 'student',
            bio: 'Career switcher learning programming.',
            is_active: true,
            email_verified: true,
        },
    ];

    for (const user of users) {
        try {
            await db.query(
                `INSERT INTO users (uuid, email, password, first_name, last_name, role, bio, is_active, email_verified)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE first_name = VALUES(first_name)`,
                [user.uuid, user.email, user.password, user.first_name, user.last_name,
                user.role, user.bio, user.is_active, user.email_verified]
            );
        } catch (error) {
            console.log(`  User ${user.email} already exists or error:`, error.message);
        }
    }

    console.log('  ✅ Users seeded');
    return users;
};

const seedCategories = async () => {
    console.log('🌱 Seeding categories...');

    const categories = [
        { name: 'Web Development', description: 'Learn to build modern web applications', slug: 'web-development' },
        { name: 'Mobile Development', description: 'Build native and cross-platform mobile apps', slug: 'mobile-development' },
        { name: 'Data Science', description: 'Analyze data and build ML models', slug: 'data-science' },
        { name: 'Programming Languages', description: 'Master programming languages', slug: 'programming-languages' },
        { name: 'Cloud Computing', description: 'AWS, Azure, GCP and more', slug: 'cloud-computing' },
        { name: 'DevOps', description: 'CI/CD, containers, and infrastructure', slug: 'devops' },
        { name: 'Cybersecurity', description: 'Secure systems and networks', slug: 'cybersecurity' },
        { name: 'Database', description: 'SQL, NoSQL and database design', slug: 'database' },
    ];

    for (const category of categories) {
        try {
            await db.query(
                `INSERT INTO categories (name, slug, description, is_active)
                 VALUES (?, ?, ?, 1)
                 ON DUPLICATE KEY UPDATE description = VALUES(description)`,
                [category.name, category.slug, category.description]
            );
        } catch (error) {
            console.log(`  Category ${category.name} error:`, error.message);
        }
    }

    console.log('  ✅ Categories seeded');
};

const seedCourses = async () => {
    console.log('🌱 Seeding courses...');

    // Get instructor IDs
    const [instructors] = await db.pool.execute(
        "SELECT id FROM users WHERE role = 'instructor' LIMIT 2"
    );

    if (instructors.length < 1) {
        console.log('  ⚠️ No instructors found, skipping courses');
        return;
    }

    const [categories] = await db.pool.execute('SELECT id, slug FROM categories LIMIT 4');

    const courses = [
        {
            title: 'Complete JavaScript Course 2024',
            description: 'Master JavaScript from basics to advanced concepts. Learn ES6+, async/await, OOP, and build real-world projects. This comprehensive course covers everything you need to become a professional JavaScript developer.',
            short_description: 'Master JavaScript from basics to advanced with real projects',
            instructor_id: instructors[0].id,
            category_id: categories.find(c => c.slug === 'web-development')?.id || categories[0].id,
            price: 99.99,
            discount_price: 49.99,
            level: 'all_levels',
            language: 'English',
            is_published: true,
            is_featured: true,
            requirements: JSON.stringify(['Basic computer skills', 'No prior programming experience needed']),
            what_you_learn: JSON.stringify([
                'Write clean, modern JavaScript code',
                'Understand async programming with Promises and async/await',
                'Build real-world applications',
                'Master ES6+ features'
            ]),
            tags: JSON.stringify(['javascript', 'es6', 'web development', 'programming']),
        },
        {
            title: 'React - The Complete Guide',
            description: 'Build powerful, fast, user-friendly and reactive web apps with React.js. Learn Hooks, Redux, React Router, and Next.js. This course covers both class-based and functional components.',
            short_description: 'Build modern single-page applications with React',
            instructor_id: instructors[0].id,
            category_id: categories.find(c => c.slug === 'web-development')?.id || categories[0].id,
            price: 129.99,
            discount_price: 79.99,
            level: 'intermediate',
            language: 'English',
            is_published: true,
            is_featured: true,
            requirements: JSON.stringify(['JavaScript fundamentals', 'HTML and CSS basics']),
            what_you_learn: JSON.stringify([
                'Build powerful SPAs with React',
                'Use React Hooks effectively',
                'Manage state with Redux',
                'Implement routing with React Router'
            ]),
            tags: JSON.stringify(['react', 'frontend', 'javascript', 'spa']),
        },
        {
            title: 'Node.js & Express Complete Course',
            description: 'Learn to build fast, scalable backend services with Node.js and Express. Cover REST APIs, authentication, databases, and deployment.',
            short_description: 'Build scalable backend APIs with Node.js and Express',
            instructor_id: instructors[0].id,
            category_id: categories.find(c => c.slug === 'web-development')?.id || categories[0].id,
            price: 89.99,
            level: 'intermediate',
            language: 'English',
            is_published: true,
            requirements: JSON.stringify(['JavaScript knowledge', 'Command line basics']),
            what_you_learn: JSON.stringify([
                'Build REST APIs from scratch',
                'Implement JWT authentication',
                'Work with databases',
                'Deploy to production'
            ]),
            tags: JSON.stringify(['nodejs', 'express', 'backend', 'api']),
        },
        {
            title: 'Python for Data Science and AI',
            description: 'Comprehensive Python course for data science. Learn NumPy, Pandas, Matplotlib, Scikit-learn, and build machine learning models.',
            short_description: 'Master Python for data science and machine learning',
            instructor_id: instructors[1]?.id || instructors[0].id,
            category_id: categories.find(c => c.slug === 'data-science')?.id || categories[0].id,
            price: 149.99,
            discount_price: 99.99,
            level: 'beginner',
            language: 'English',
            is_published: true,
            is_featured: true,
            requirements: JSON.stringify(['No programming experience required', 'Basic math knowledge helpful']),
            what_you_learn: JSON.stringify([
                'Write Python code proficiently',
                'Analyze data with Pandas',
                'Create visualizations',
                'Build machine learning models'
            ]),
            tags: JSON.stringify(['python', 'data science', 'machine learning', 'ai']),
        },
    ];

    for (const course of courses) {
        const uuid = generateUUID();
        const slug = generateUniqueSlug(course.title);

        try {
            await db.query(
                `INSERT INTO courses (uuid, title, slug, description, short_description, instructor_id,
                                     category_id, price, discount_price, level, language, is_published,
                                     is_featured, requirements, what_you_learn, tags)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [uuid, course.title, slug, course.description, course.short_description,
                    course.instructor_id, course.category_id, course.price, course.discount_price,
                    course.level, course.language, course.is_published, course.is_featured,
                    course.requirements, course.what_you_learn, course.tags]
            );
        } catch (error) {
            console.log(`  Course "${course.title.substring(0, 30)}..." error:`, error.message);
        }
    }

    console.log('  ✅ Courses seeded');
};

const seedLessons = async () => {
    console.log('🌱 Seeding lessons...');

    const [courses] = await db.pool.execute('SELECT id FROM courses LIMIT 2');

    if (courses.length < 1) {
        console.log('  ⚠️ No courses found, skipping lessons');
        return;
    }

    const lessonsData = [
        // Course 1 - JavaScript
        { course_id: courses[0].id, section_name: 'Getting Started', section_order: 1, title: 'Course Introduction', order_index: 1, is_preview: true, is_published: true },
        { course_id: courses[0].id, section_name: 'Getting Started', section_order: 1, title: 'Setting Up Your Development Environment', order_index: 2, is_preview: true, is_published: true },
        { course_id: courses[0].id, section_name: 'JavaScript Fundamentals', section_order: 2, title: 'Variables and Data Types', order_index: 3, is_published: true },
        { course_id: courses[0].id, section_name: 'JavaScript Fundamentals', section_order: 2, title: 'Operators and Expressions', order_index: 4, is_published: true },
        { course_id: courses[0].id, section_name: 'JavaScript Fundamentals', section_order: 2, title: 'Control Flow - if/else', order_index: 5, is_published: true },
        { course_id: courses[0].id, section_name: 'Functions', section_order: 3, title: 'Introduction to Functions', order_index: 6, is_published: true },
        { course_id: courses[0].id, section_name: 'Functions', section_order: 3, title: 'Arrow Functions', order_index: 7, is_published: true },
        { course_id: courses[0].id, section_name: 'Functions', section_order: 3, title: 'Closures and Scope', order_index: 8, is_published: true },
    ];

    if (courses.length > 1) {
        // Course 2 - React
        lessonsData.push(
            { course_id: courses[1].id, section_name: 'React Basics', section_order: 1, title: 'What is React?', order_index: 1, is_preview: true, is_published: true },
            { course_id: courses[1].id, section_name: 'React Basics', section_order: 1, title: 'Creating Your First Component', order_index: 2, is_preview: true, is_published: true },
            { course_id: courses[1].id, section_name: 'React Basics', section_order: 1, title: 'JSX Deep Dive', order_index: 3, is_published: true },
            { course_id: courses[1].id, section_name: 'State Management', section_order: 2, title: 'useState Hook', order_index: 4, is_published: true },
            { course_id: courses[1].id, section_name: 'State Management', section_order: 2, title: 'useEffect Hook', order_index: 5, is_published: true },
        );
    }

    for (const lesson of lessonsData) {
        const uuid = generateUUID();

        try {
            await db.query(
                `INSERT INTO lessons (uuid, course_id, section_name, section_order, title, 
                                     content_type, order_index, is_preview, is_published)
                 VALUES (?, ?, ?, ?, ?, 'video', ?, ?, ?)`,
                [uuid, lesson.course_id, lesson.section_name, lesson.section_order,
                    lesson.title, lesson.order_index, lesson.is_preview ? 1 : 0, lesson.is_published ? 1 : 0]
            );
        } catch (error) {
            console.log(`  Lesson "${lesson.title.substring(0, 30)}..." error:`, error.message);
        }
    }

    // Update course lesson counts
    await db.query(`
        UPDATE courses c 
        SET total_lessons = (SELECT COUNT(*) FROM lessons WHERE course_id = c.id AND is_published = 1)
    `);

    console.log('  ✅ Lessons seeded');
};

const seedEnrollments = async () => {
    console.log('🌱 Seeding enrollments...');

    const [students] = await db.pool.execute("SELECT id FROM users WHERE role = 'student' LIMIT 2");
    const [courses] = await db.pool.execute('SELECT id, price FROM courses WHERE is_published = 1 LIMIT 4');

    if (students.length < 1 || courses.length < 1) {
        console.log('  ⚠️ Not enough data for enrollments');
        return;
    }

    // Enroll first student in first 2 courses
    for (let i = 0; i < Math.min(2, courses.length); i++) {
        try {
            await db.query(
                `INSERT INTO enrollments (user_id, course_id, payment_status, payment_amount, progress)
                 VALUES (?, ?, 'paid', ?, ?)`,
                [students[0].id, courses[i].id, courses[i].price, Math.random() * 50]
            );
        } catch (error) {
            // Ignore duplicate key errors
        }
    }

    // Enroll second student in first course if exists
    if (students.length > 1) {
        try {
            await db.query(
                `INSERT INTO enrollments (user_id, course_id, payment_status, payment_amount, progress)
                 VALUES (?, ?, 'paid', ?, ?)`,
                [students[1].id, courses[0].id, courses[0].price, Math.random() * 30]
            );
        } catch (error) {
            // Ignore duplicate key errors
        }
    }

    // Update enrollment counts
    await db.query(`
        UPDATE courses c
        SET total_enrollments = (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'active')
    `);

    console.log('  ✅ Enrollments seeded');
};

const runSeeder = async () => {
    console.log('\n🚀 Starting database seeder...\n');

    try {
        // Test connection
        await db.testConnection();

        // Initialize tables
        await db.initializeTables();
        console.log('✅ Tables initialized\n');

        // Run seeders
        await seedUsers();
        await seedCategories();
        await seedCourses();
        await seedLessons();
        await seedEnrollments();

        console.log('\n✅ All seeds completed successfully!');
        console.log('\n📝 Test Credentials:');
        console.log('   Admin:      admin@elearning.com / Admin123!');
        console.log('   Instructor: instructor@elearning.com / Admin123!');
        console.log('   Student:    student@elearning.com / Admin123!\n');

    } catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
        console.error(error);
    } finally {
        process.exit(0);
    }
};

runSeeder();
