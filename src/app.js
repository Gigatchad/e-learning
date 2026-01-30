/**
 * E-Learning Platform - Main Application Entry Point
 * A secure, production-ready Node.js + Express + MySQL backend
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const db = require('./config/database');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const swaggerSetup = require('./config/swagger');

// Import Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const courseRoutes = require('./routes/course.routes');
const lessonRoutes = require('./routes/lesson.routes');
const enrollmentRoutes = require('./routes/enrollment.routes');
const categoryRoutes = require('./routes/category.routes');
const uploadRoutes = require('./routes/upload.routes');
const wishlistRoutes = require('./routes/wishlist.routes');

const app = express();

// Trust proxy for Render/Cloud environments (needed for rate limiting)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// ==================== SECURITY MIDDLEWARE ====================

// Helmet - Set security HTTP headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
}));

// CORS Configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Load-Test-Secret'],
};
app.use(cors(corsOptions));

// Bypass logic for Load Testing
const skipLoadTest = (req) => {
    const secret = req.headers['x-load-test-secret'];
    return secret && secret === process.env.LOAD_TEST_SECRET;
};

// Rate Limiting - Prevent brute force attacks
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    skip: skipLoadTest,
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skip: skipLoadTest,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
    },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ==================== GENERAL MIDDLEWARE ====================

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser(process.env.COOKIE_SECRET));

// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// ==================== SWAGGER DOCUMENTATION ====================
swaggerSetup(app);

// ==================== HEALTH CHECK ====================
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'E-Learning API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});

// ==================== API ROUTES ====================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/wishlist', wishlistRoutes);

// ==================== STATIC FILES (FRONTEND) ====================
// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(frontendPath));

    // Handle SPA routing - return index.html for all non-API routes
    app.get(/^\/(?!api).*/, (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// ==================== 404 HANDLER ====================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
});

// ==================== ERROR HANDLER ====================
app.use(errorHandler);

// ==================== DATABASE CONNECTION & SERVER START ====================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Start server
        const server = app.listen(PORT, () => {
            console.log(`\n🚀 Server bound to port ${PORT} - initializing database...`);
            console.log(`❤️  Health Check: http://localhost:${PORT}/health\n`);
        });

        // Test database connection with retries
        await db.testConnection();
        console.log('✅ Database connected successfully');

        // Initialize database tables
        await db.initializeTables();
        console.log('✅ Database tables initialized');

        console.log(`🚀 API Ready in ${process.env.NODE_ENV} mode`);
        console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    } catch (error) {
        console.error('❌ Failed to initialize database:', error.message);
    }
};

if (require.main === module) {
    startServer();
}

module.exports = app;
