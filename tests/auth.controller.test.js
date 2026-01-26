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

// IMPORTANT: Mock catchAsync so we can await the controller logic in tests
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

describe('Auth Controller - Register', () => {
    let req;
    let res;
    let next;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            body: {
                email: 'test@example.com',
                password: 'password123',
                first_name: 'John',
                last_name: 'Doe',
            },
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            cookie: jest.fn(),
        };

        next = jest.fn();
    });

    it('should register a new user successfully', async () => {
        // 1. Mock "check if email exists" -> returns empty array
        db.pool.execute.mockResolvedValueOnce([[]]);

        // 2. Mock bcrypt
        bcrypt.genSalt.mockResolvedValue('salt');
        bcrypt.hash.mockResolvedValue('hashed_password');

        // 3. Mock "insert user" -> returns insertId
        db.pool.execute.mockResolvedValueOnce([{ insertId: 1 }]);

        // 4. Mock "update refresh token"
        db.pool.execute.mockResolvedValueOnce([{}]);

        // 5. Mock "get created user"
        const mockUser = {
            id: 1,
            uuid: 'mock-uuid',
            email: 'test@example.com',
            first_name: 'John',
            last_name: 'Doe',
            role: 'student',
            created_at: new Date(),
        };
        db.pool.execute.mockResolvedValueOnce([[mockUser]]);

        await authController.register(req, res, next);

        // Assertions
        expect(db.pool.execute).toHaveBeenCalledTimes(4);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: expect.objectContaining({
                user: mockUser,
            }),
        }));
    });

    it('should throw AppError if email already exists', async () => {
        // 1. Mock "check if email exists" -> returns array with one user
        db.pool.execute.mockResolvedValueOnce([[{ id: 99 }]]);

        // Since we mocked catchAsync to NOT catch errors (it just passes through),
        // the async function will reject. We expect it to reject.
        await expect(authController.register(req, res, next))
            .rejects
            .toThrow('Email already registered');

        // Alternatively, if we wanted to test next(err), we would make our mock catchAsync call .catch(next)
        // But testing the rejection is cleaner here.
    });
});
