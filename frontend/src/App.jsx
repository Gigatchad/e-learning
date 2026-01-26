/**
 * Main App Component
 * Sets up routing and global providers
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';

// Layout
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import LessonPage from './pages/LessonPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import MyLearningPage from './pages/MyLearningPage';
import InstructorDashboard from './pages/instructor/InstructorDashboard';
import CreateCoursePage from './pages/instructor/CreateCoursePage';
import EditCoursePage from './pages/instructor/EditCoursePage';
import ManageLessonsPage from './pages/instructor/ManageLessonsPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import NotFoundPage from './pages/NotFoundPage';

// Store
import useAuthStore from './store/authStore';

function App() {
  const fetchUser = useAuthStore((state) => state.fetchUser);

  useEffect(() => {
    // Fetch user on app load if token exists
    fetchUser();
  }, [fetchUser]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:slug" element={<CourseDetailPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />

          {/* Protected Routes - Any authenticated user */}
          <Route element={<ProtectedRoute />}>
            <Route path="profile" element={<ProfilePage />} />
            <Route path="my-learning" element={<MyLearningPage />} />
            <Route path="courses/:courseId/lessons/:lessonId" element={<LessonPage />} />
          </Route>

          {/* Instructor Routes */}
          <Route element={<ProtectedRoute allowedRoles={['instructor', 'admin']} />}>
            <Route path="instructor" element={<InstructorDashboard />} />
            <Route path="instructor/courses/new" element={<CreateCoursePage />} />
            <Route path="instructor/courses/:id/edit" element={<EditCoursePage />} />
            <Route path="instructor/courses/:id/lessons" element={<ManageLessonsPage />} />
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="admin/*" element={<AdminDashboard />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
