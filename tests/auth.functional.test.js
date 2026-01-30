const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

// Mock Database
jest.mock('../src/config/database', () => ({
    pool: {
        execute: jest.fn(),
    },
    testConnection: jest.fn().mockResolvedValue(true),
    initializeTables: jest.fn().mockResolvedValue(true),
}));

// Mock Bcrypt
jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
}));

describe('Auth Functional Tests', () => {
    it('should login successfully', async () => {
        const mockUser = { id: 1, email: 'test@example.com', password: 'hashed', is_active: 1 };
        db.pool.execute.mockResolvedValueOnce([[mockUser]]);
        bcrypt.compare.mockResolvedValueOnce(true);
        db.pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'password123' });

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
