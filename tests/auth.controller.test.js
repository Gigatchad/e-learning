const authController = require('../src/controllers/auth.controller');
const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

// Mock dependencies
jest.mock('../src/config/database', () => ({
    pool: {
        execute: jest.fn(),
    },
}));

jest.mock('bcryptjs', () => ({
    genSalt: jest.fn(),
    hash: jest.fn(),
    compare: jest.fn(),
}));

jest.mock('../src/utils/helpers', () => ({
    generateUUID: jest.fn().mockReturnValue('mock-uuid'),
    sanitizeOutput: jest.fn(user => user),
}));

// Mock catchAsync
jest.mock('../src/middleware/errorHandler', () => ({
    catchAsync: (fn) => (req, res, next) => fn(req, res, next),
    AppError: class AppError extends Error {
        constructor(message, statusCode) {
            super(message);
            this.statusCode = statusCode;
        }
    }
}));

// Mock environment variables
process.env.JWT_SECRET = 'test_secret';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

describe('Auth Controller - Unit Tests', () => {
    let req, res, next;

    beforeEach(() => {
        jest.resetAllMocks();
        db.testConnection.mockResolvedValue(true);
        db.initializeTables.mockResolvedValue(true);
        process.env.JWT_SECRET = 'test_secret';
        req = {
            body: { email: 'test@example.com', password: 'password123', first_name: 'John', last_name: 'Doe' },
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            cookie: jest.fn(),
        };
        next = jest.fn();
    });

    it('should register a new user successfully', async () => {
        db.pool.execute.mockResolvedValueOnce([[]]); // Email check
        bcrypt.hash.mockResolvedValue('hashed_pw');
        db.pool.execute.mockResolvedValueOnce([{ insertId: 1 }]); // Insert
        db.pool.execute.mockResolvedValueOnce([{}]); // Token update
        db.pool.execute.mockResolvedValueOnce([[{ id: 1, email: 'test@example.com' }]]); // Get user

        try {
            await authController.register(req, res, next);
        } catch (error) {
            console.error('Registration Error:', error);
            throw error;
        }
        expect(res.status).toHaveBeenCalledWith(201);
    });
});
