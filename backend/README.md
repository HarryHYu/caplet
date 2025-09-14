# Caplet Backend API

Backend API for the Caplet financial education platform.

## 🚀 Features

- **User Authentication** - JWT-based auth with registration/login
- **Course Management** - CRUD operations for courses and lessons
- **Progress Tracking** - Track user progress through courses
- **User Profiles** - User management and preferences
- **RESTful API** - Clean API endpoints

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Sequelize** - ORM for database operations
- **SQLite** - Development database
- **PostgreSQL** - Production database
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing

## 📦 Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Start production server:
```bash
npm start
```

## 🗄️ Database

The API uses SQLite for development and PostgreSQL for production.

### Models

- **User** - User accounts and profiles
- **Course** - Educational courses
- **Lesson** - Individual lessons within courses
- **UserProgress** - User progress tracking

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Courses
- `GET /api/courses` - Get all published courses
- `GET /api/courses/:id` - Get single course with lessons
- `GET /api/courses/categories/list` - Get course categories
- `GET /api/courses/featured/list` - Get featured courses

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/courses` - Get user's enrolled courses
- `POST /api/users/courses/:courseId/enroll` - Enroll in course
- `GET /api/users/dashboard` - Get user dashboard data

### Progress
- `PUT /api/progress/lesson/:lessonId` - Update lesson progress
- `GET /api/progress/course/:courseId` - Get course progress
- `GET /api/progress` - Get all user progress
- `POST /api/progress/bookmark/:lessonId` - Bookmark lesson
- `DELETE /api/progress/bookmark/:lessonId` - Remove bookmark

## 🔧 Environment Variables

Create a `.env` file with:

```env
DATABASE_URL=sqlite://caplet.db
JWT_SECRET=your-secret-key
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## 🚀 Deployment

For production deployment on Railway:

1. Set up PostgreSQL database
2. Update `DATABASE_URL` environment variable
3. Set `NODE_ENV=production`
4. Deploy to Railway

## 📝 Development

The API runs on `http://localhost:5000` by default.

Use `npm run dev` for development with auto-reload.
