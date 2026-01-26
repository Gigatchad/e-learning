/**
 * Swagger/OpenAPI Configuration
 */

const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'E-Learning Platform API',
            version: '1.0.0',
            description: `
## E-Learning Platform Backend API

A secure, production-ready REST API for an e-learning platform built with Node.js, Express, and MySQL.

### Features
- 🔐 JWT Authentication with refresh tokens
- 👥 Role-Based Access Control (Admin, Instructor, Student)
- 📚 Course Management
- 🎓 Lesson & Enrollment Management
- ☁️ Cloudinary Integration for media uploads
- 📊 Pagination & Filtering
- 🛡️ Security Best Practices

### Authentication
Most endpoints require authentication via Bearer token in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`
            `,
            contact: {
                name: 'API Support',
                email: 'support@elearning.com',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development Server',
            },
            {
                url: 'https://api.elearning.com',
                description: 'Production Server',
            },
        ],
        tags: [
            { name: 'Auth', description: 'Authentication & Authorization' },
            { name: 'Users', description: 'User management operations' },
            { name: 'Courses', description: 'Course management operations' },
            { name: 'Lessons', description: 'Lesson management operations' },
            { name: 'Enrollments', description: 'Enrollment management' },
            { name: 'Categories', description: 'Category management' },
            { name: 'Upload', description: 'File upload operations' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        uuid: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        first_name: { type: 'string', example: 'John' },
                        last_name: { type: 'string', example: 'Doe' },
                        role: { type: 'string', enum: ['admin', 'instructor', 'student'] },
                        avatar_url: { type: 'string', nullable: true },
                        bio: { type: 'string', nullable: true },
                        is_active: { type: 'boolean' },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                Course: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        uuid: { type: 'string', format: 'uuid' },
                        title: { type: 'string', example: 'Complete JavaScript Course' },
                        slug: { type: 'string', example: 'complete-javascript-course' },
                        description: { type: 'string' },
                        instructor_id: { type: 'integer' },
                        category_id: { type: 'integer', nullable: true },
                        thumbnail_url: { type: 'string', nullable: true },
                        price: { type: 'number', example: 99.99 },
                        level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced', 'all_levels'] },
                        is_published: { type: 'boolean' },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                Lesson: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        uuid: { type: 'string', format: 'uuid' },
                        course_id: { type: 'integer' },
                        title: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        content_type: { type: 'string', enum: ['video', 'article', 'quiz', 'assignment'] },
                        video_url: { type: 'string', nullable: true },
                        order_index: { type: 'integer' },
                        is_preview: { type: 'boolean' },
                        is_published: { type: 'boolean' },
                    },
                },
                Enrollment: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        user_id: { type: 'integer' },
                        course_id: { type: 'integer' },
                        progress: { type: 'number', example: 45.5 },
                        status: { type: 'string', enum: ['active', 'completed', 'cancelled'] },
                        enrolled_at: { type: 'string', format: 'date-time' },
                    },
                },
                Category: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string', example: 'Web Development' },
                        slug: { type: 'string', example: 'web-development' },
                        description: { type: 'string', nullable: true },
                        is_active: { type: 'boolean' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                        errors: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    field: { type: 'string' },
                                    message: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                PaginationMeta: {
                    type: 'object',
                    properties: {
                        currentPage: { type: 'integer', example: 1 },
                        totalPages: { type: 'integer', example: 10 },
                        totalItems: { type: 'integer', example: 100 },
                        itemsPerPage: { type: 'integer', example: 10 },
                        hasNextPage: { type: 'boolean' },
                        hasPrevPage: { type: 'boolean' },
                    },
                },
            },
            responses: {
                UnauthorizedError: {
                    description: 'Access token is missing or invalid',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                            example: {
                                success: false,
                                message: 'Authentication required. Please log in.',
                            },
                        },
                    },
                },
                ForbiddenError: {
                    description: 'Insufficient permissions',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                            example: {
                                success: false,
                                message: 'Access denied. You do not have permission to perform this action.',
                            },
                        },
                    },
                },
                NotFoundError: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                            example: {
                                success: false,
                                message: 'Resource not found',
                            },
                        },
                    },
                },
                ValidationError: {
                    description: 'Validation error',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error',
                            },
                        },
                    },
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

const setupSwagger = (app) => {
    // Swagger UI
    app.use(
        '/api-docs',
        swaggerUi.serve,
        swaggerUi.setup(swaggerSpec, {
            explorer: true,
            customCss: `
                .swagger-ui .topbar { display: none }
                .swagger-ui .info .title { color: #3b82f6 }
            `,
            customSiteTitle: 'E-Learning API Docs',
            swaggerOptions: {
                persistAuthorization: true,
                docExpansion: 'list',
                filter: true,
                showRequestDuration: true,
            },
        })
    );

    // Serve raw OpenAPI spec
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
};

module.exports = setupSwagger;
