const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

// Mock Database and external services
jest.mock('../src/config/database', () => ({
    pool: {
        execute: jest.fn(),
    },
    testConnection: jest.fn().mockResolvedValue(true),
    initializeTables: jest.fn().mockResolvedValue(true),
}));

jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
    genSalt: jest.fn(),
    hash: jest.fn(),
}));

describe('Complete Application Integration Test', () => {

    // Mock Data
    const mockStudent = { id: 10, email: 'student@test.com', role: 'student', is_active: 1 };
    const mockInstructor = { id: 20, email: 'instructor@test.com', role: 'instructor', is_active: 1 };
    const mockCourse = {
        id: 101, title: 'Mastering TDD with Node.js', slug: 'mastering-tdd-node',
        instructor_id: 20, price: 49.99, is_published: 1, category_id: 1
    };

    let studentToken, instructorToken;

    beforeAll(() => {
        process.env.JWT_SECRET = 'test_secret_key';
        studentToken = jwt.sign({ id: mockStudent.id }, process.env.JWT_SECRET);
        instructorToken = jwt.sign({ id: mockInstructor.id }, process.env.JWT_SECRET);
    });

    beforeEach(() => { jest.clearAllMocks(); });

    /**
     * 1. AUTHENTICATION
     */
    it('Flow 1: Login', async () => {
        db.pool.execute.mockResolvedValueOnce([[{ ...mockStudent, password: 'hashed' }]]);
        bcrypt.compare.mockResolvedValueOnce(true);
        db.pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app).post('/api/auth/login').send({ email: 'student@test.com', password: 'password123' });
        expect(res.statusCode).toBe(200);
    });

    /**
     * 2. EXPLORATION
     */
    it('Flow 2: Explore Categories and Courses', async () => {
        db.pool.execute.mockResolvedValueOnce([[{ id: 1, name: 'Development' }]]);
        const catRes = await request(app).get('/api/categories');
        expect(catRes.statusCode).toBe(200);

        db.pool.execute.mockResolvedValueOnce([[{ total: 1 }]]);
        db.pool.execute.mockResolvedValueOnce([[mockCourse]]);
        const courseRes = await request(app).get('/api/courses');
        expect(courseRes.statusCode).toBe(200);
    });

    /**
     * 3. WISHLIST & ENROLLMENT
     */
    it('Flow 3: Wishlist and Enrollment', async () => {
        // Wishlist
        db.pool.execute.mockResolvedValueOnce([[mockStudent]]); // Auth
        db.pool.execute.mockResolvedValueOnce([[]]); // Search
        db.pool.execute.mockResolvedValueOnce([{ insertId: 500 }]); // Insert
        const wishRes = await request(app).post('/api/wishlist').set('Authorization', `Bearer ${studentToken}`).send({ course_id: 101 });
        expect(wishRes.statusCode).toBe(201);

        // Enrollment
        db.pool.execute.mockResolvedValueOnce([[mockStudent]]); // Auth
        db.pool.execute.mockResolvedValueOnce([[mockCourse]]); // Course
        db.pool.execute.mockResolvedValueOnce([[]]); // Check existing
        db.pool.execute.mockResolvedValueOnce([{ insertId: 600 }]); // Insert
        db.pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]); // Update count
        const enrollRes = await request(app).post(`/api/enrollments/${mockCourse.id}`).set('Authorization', `Bearer ${studentToken}`);
        expect(enrollRes.statusCode).toBe(201);
    });

    /**
     * 4. INSTRUCTOR WORKFLOW
     */
    it('Flow 4: Course Creation', async () => {
        db.pool.execute.mockResolvedValueOnce([[mockInstructor]]); // Auth
        db.pool.execute.mockResolvedValueOnce([{ insertId: 102 }]); // Insert
        db.pool.execute.mockResolvedValueOnce([[{ id: 102, title: 'New Course', requirements: null, what_you_learn: null, tags: null }]]); // Get
        const res = await request(app).post('/api/courses').set('Authorization', `Bearer ${instructorToken}`).send({
            title: 'Advanced React Architecture',
            description: 'A very long description that is more than fifty characters long to pass the validation.',
            category_id: 1
        });
        expect(res.statusCode).toBe(201);
    });
});
