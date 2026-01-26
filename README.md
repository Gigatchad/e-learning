# E-Learning Platform Backend API

A secure, production-ready Node.js + Express + MySQL backend for an e-learning platform with full REST APIs, JWT authentication, RBAC, Cloudinary integration, and comprehensive security features.

## 🚀 Features

### Core Functionality
- **User Management**: Registration, login, profile management for Students, Instructors, and Admins
- **Course Management**: Full CRUD for courses with categories, levels, and pricing
- **Lesson Management**: Video and article lessons with section grouping
- **Enrollment System**: Student enrollment, progress tracking, and course completion
- **Review System**: Course ratings and reviews with aggregation

### Security Features
- 🔐 **JWT Authentication** with access and refresh tokens
- 👥 **Role-Based Access Control (RBAC)** for Admin, Instructor, and Student roles
- 🛡️ **Helmet** for secure HTTP headers
- 🌐 **CORS** configuration
- ⏱️ **Rate Limiting** to prevent abuse (stricter for auth endpoints)
- 🔒 **bcrypt** for password hashing (12 salt rounds)
- ✅ **Input Validation** using express-validator
- 💉 **SQL Injection Protection** via parameterized queries
- 🍪 **Secure Cookies** (httpOnly, secure, sameSite)

### Additional Features
- ☁️ **Cloudinary Integration** for images and videos
- 📚 **Swagger/OpenAPI Documentation**
- 📊 **Pagination & Filtering** on all list endpoints
- 🔍 **Search** functionality
- ↕️ **Sorting** on multiple fields

## 📁 Project Structure

```
back-end/
├── src/
│   ├── app.js                 # Main application entry point
│   ├── config/
│   │   ├── database.js        # MySQL connection pool & schema
│   │   ├── cloudinary.js      # Cloudinary configuration
│   │   └── swagger.js         # Swagger/OpenAPI setup
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── course.controller.js
│   │   ├── lesson.controller.js
│   │   ├── enrollment.controller.js
│   │   ├── category.controller.js
│   │   └── upload.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js      # JWT verification
│   │   ├── rbac.middleware.js      # Role-based access control
│   │   ├── errorHandler.js         # Global error handling
│   │   ├── validation.middleware.js # Input validation
│   │   └── upload.middleware.js    # Multer file upload
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── course.routes.js
│   │   ├── lesson.routes.js
│   │   ├── enrollment.routes.js
│   │   ├── category.routes.js
│   │   └── upload.routes.js
│   └── utils/
│       ├── pagination.js       # Pagination helpers
│       ├── helpers.js          # General utilities
│       └── queryBuilder.js     # Dynamic SQL query builder
├── .env                        # Environment variables
├── .env.example               # Environment template
├── .gitignore
├── package.json
└── README.md
```

## 🛠️ Installation

### Prerequisites
- Node.js >= 18.0.0
- MySQL 8.0+
- Cloudinary account

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd back-end
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   # Database
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=elearning_db

   # JWT
   JWT_SECRET=your_super_secret_key
   JWT_REFRESH_SECRET=your_refresh_secret_key

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. **Create the database**
   ```sql
   CREATE DATABASE elearning_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

5. **Start the server**
   ```bash
   # Development (with auto-reload)
   npm run dev

   # Production
   npm start
   ```

6. **Access the API**
   - API: http://localhost:5000
   - Swagger Docs: http://localhost:5000/api-docs
   - Health Check: http://localhost:5000/health

## 📖 API Documentation

Full interactive API documentation is available at `/api-docs` when the server is running.

### Authentication Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/auth/change-password` | Change password |

### User Endpoints
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users/instructors` | List instructors | Public |
| PUT | `/api/users/profile` | Update own profile | Authenticated |
| POST | `/api/users/avatar` | Upload avatar | Authenticated |
| GET | `/api/users` | List all users | Admin |
| GET | `/api/users/:id` | Get user by ID | Admin |
| PUT | `/api/users/:id` | Update user | Admin |
| DELETE | `/api/users/:id` | Delete user | Admin |

### Course Endpoints
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/courses` | List courses with filters | Public |
| GET | `/api/courses/:id` | Get course details | Public |
| POST | `/api/courses` | Create course | Instructor/Admin |
| PUT | `/api/courses/:id` | Update course | Owner/Admin |
| DELETE | `/api/courses/:id` | Delete course | Owner/Admin |
| POST | `/api/courses/:id/thumbnail` | Upload thumbnail | Owner/Admin |
| GET | `/api/courses/:id/reviews` | Get reviews | Public |
| POST | `/api/courses/:id/reviews` | Add review | Enrolled User |

### Lesson Endpoints
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/lessons/course/:courseId` | Get course lessons | Public (preview only) |
| GET | `/api/lessons/:id` | Get lesson details | Enrolled/Owner |
| POST | `/api/lessons/course/:courseId` | Create lesson | Owner/Admin |
| PUT | `/api/lessons/:id` | Update lesson | Owner/Admin |
| DELETE | `/api/lessons/:id` | Delete lesson | Owner/Admin |
| POST | `/api/lessons/:id/video` | Upload video | Owner/Admin |
| POST | `/api/lessons/:id/progress` | Update progress | Enrolled User |
| POST | `/api/lessons/:id/complete` | Mark complete | Enrolled User |

### Enrollment Endpoints
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/enrollments` | Get my enrollments | Authenticated |
| POST | `/api/enrollments/:courseId` | Enroll in course | Authenticated |
| DELETE | `/api/enrollments/:courseId` | Cancel enrollment | Authenticated |
| GET | `/api/enrollments/:courseId/status` | Check enrollment | Authenticated |
| GET | `/api/enrollments/:courseId/progress` | Get progress | Enrolled User |
| GET | `/api/enrollments/course/:courseId/students` | Get students | Instructor/Admin |

### Category Endpoints
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/categories` | List categories | Public |
| GET | `/api/categories/:id` | Get category | Public |
| GET | `/api/categories/:id/courses` | Category courses | Public |
| POST | `/api/categories` | Create category | Admin |
| PUT | `/api/categories/:id` | Update category | Admin |
| DELETE | `/api/categories/:id` | Delete category | Admin |

### Upload Endpoints
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/upload/image` | Upload image | Authenticated |
| POST | `/api/upload/images` | Upload multiple images | Authenticated |
| POST | `/api/upload/video` | Upload video | Instructor/Admin |
| POST | `/api/upload/avatar` | Upload avatar | Authenticated |
| POST | `/api/upload/thumbnail` | Upload thumbnail | Instructor/Admin |
| DELETE | `/api/upload/delete` | Delete file | Instructor/Admin |

## 🔐 Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **Student** | Browse courses, enroll, track progress, write reviews |
| **Instructor** | All Student permissions + Create/manage own courses and lessons |
| **Admin** | Full access to all resources and user management |

## 📊 Query Parameters

### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)

### Filtering (Courses)
- `category` - Filter by category slug or ID
- `level` - beginner, intermediate, advanced, all_levels
- `language` - Filter by language
- `minPrice` / `maxPrice` - Price range
- `instructor` - Filter by instructor ID
- `is_featured` - Featured courses only
- `search` - Search in title, description, tags

### Sorting
- `sort` - Format: `field:direction` (e.g., `price:asc`, `created_at:desc`)

## 🧪 Testing

```bash
# Using curl
curl http://localhost:5000/health

# Register a user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234","first_name":"John","last_name":"Doe"}'
```

## 🔧 Configuration

### Rate Limiting
- General API: 100 requests per 15 minutes
- Auth endpoints: 10 requests per 15 minutes

### File Uploads
- Images: Max 10MB (JPEG, PNG, GIF, WebP)
- Videos: Max 500MB (MP4, WebM, MOV, AVI)
- Documents: Max 50MB (PDF, Word, PowerPoint)

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
