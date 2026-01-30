const wishlistController = require('../src/controllers/wishlist.controller');
const db = require('../src/config/database');

// Mock dependencies
jest.mock('../src/config/database', () => ({
    pool: {
        execute: jest.fn(),
    },
}));

jest.mock('../src/middleware/errorHandler', () => ({
    catchAsync: (fn) => (req, res, next) => fn(req, res, next),
    AppError: class AppError extends Error {
        constructor(message, statusCode) {
            super(message);
            this.statusCode = statusCode;
        }
    }
}));

describe('Wishlist Controller - Unit Tests (TDD)', () => {
    let req, res, next;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            user: { id: 1 },
            body: { course_id: 101 },
            params: { course_id: 101 }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
    });

    it('should add a course to wishlist successfully', async () => {
        db.pool.execute.mockResolvedValueOnce([[]]); // No duplicate check
        db.pool.execute.mockResolvedValueOnce([{ insertId: 1 }]); // Insert

        await wishlistController.addToWishlist(req, res, next);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: 'Course added to wishlist'
        }));
    });

    it('should throw error if course already in wishlist', async () => {
        db.pool.execute.mockResolvedValueOnce([[{ id: 1 }]]); // Duplicate found

        await expect(wishlistController.addToWishlist(req, res, next))
            .rejects
            .toThrow('Course already in your wishlist');
    });

    it('should get wishlist items', async () => {
        const mockList = [{ id: 1, title: 'Course 1' }];
        db.pool.execute.mockResolvedValueOnce([mockList]);

        await wishlistController.getWishlist(req, res, next);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            data: mockList
        }));
    });

    it('should remove from wishlist', async () => {
        db.pool.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

        await wishlistController.removeFromWishlist(req, res, next);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            message: 'Course removed from wishlist'
        }));
    });
});
