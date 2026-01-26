const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

// Mock Database
jest.mock('../src/config/database', () => ({
    pool: {
        execute: jest.fn(),
    },
    // Mock other DB functions used in app startup or middleware
    testConnection: jest.fn().mockResolvedValue(true),
    initializeTables: jest.fn().mockResolvedValue(true),
}));

// Mock Bcrypt
jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
    genSalt: jest.fn(),
    hash: jest.fn(),
}));

describe('Functional Test - POST /api/auth/login', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should login successfully with valid credentials', async () => {
        // 1. Mock finding user by email
        const mockUser = {
            id: 1,
            uuid: 'user-uuid',
            email: 'test@example.com',
            password: 'hashedpassword',
            first_name: 'John',
            last_name: 'Doe',
            role: 'student',
            is_active: 1,
        };

        // First call: SELECT * FROM users WHERE email = ?
        db.pool.execute.mockResolvedValueOnce([[mockUser]]);

        // 2. Mock password verification
        bcrypt.compare.mockResolvedValue(true);

        // 3. Mock updating refresh token (UPDATE users SET refresh_token = ? ...)
        db.pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

        // Execute Request
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123',
            });

        // Assertions
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Login successful');
        expect(res.body.data).toHaveProperty('accessToken');
        expect(res.body.data.user.email).toBe('test@example.com');

        // Check Cookies
        const cookies = res.headers['set-cookie'];
        expect(cookies).toBeDefined();
        expect(cookies.some(c => c.includes('accessToken'))).toBe(true);
        expect(cookies.some(c => c.includes('refreshToken'))).toBe(true);
    });

    it('should fail with invalid credentials', async () => {
        // Mock user found
        db.pool.execute.mockResolvedValueOnce([[{
            id: 1,
            email: 'test@example.com',
            password: 'hashedpassword',
            is_active: 1
        }]]);

        // Mock password mismatch
        bcrypt.compare.mockResolvedValue(false);

        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'wrongpassword',
            });

        expect(res.statusCode).toEqual(401);
        expect(res.body.message).toBe('Invalid email or password');
    });
});
