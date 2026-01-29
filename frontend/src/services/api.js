/**
 * API Service Layer
 * Axios instance with interceptors for auth and error handling
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken,
                    });

                    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', newRefreshToken);

                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed, clear tokens and redirect to login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// ==================== AUTH API ====================
export const authAPI = {
    register: (data) => api.post('auth/register', data),
    login: (data) => api.post('auth/login', data),
    logout: () => api.post('auth/logout'),
    getMe: () => api.get('auth/me'),
    changePassword: (data) => api.post('auth/change-password', data),
    refreshToken: (refreshToken) => api.post('auth/refresh', { refreshToken }),
};

// ==================== USER API ====================
export const userAPI = {
    getInstructors: (params) => api.get('users/instructors', { params }),
    updateProfile: (data) => api.put('users/profile', data),
    uploadAvatar: (formData) => api.post('users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    // Admin only
    getAllUsers: (params) => api.get('users', { params }),
    getUserById: (id) => api.get(`users/${id}`),
    updateUser: (id, data) => api.put(`users/${id}`, data),
    deleteUser: (id) => api.delete(`users/${id}`),
};

// ==================== COURSE API ====================
export const courseAPI = {
    getAll: (params) => api.get('courses', { params }),
    getById: (id) => api.get(`courses/${id}`),
    create: (data) => api.post('courses', data),
    update: (id, data) => api.put(`courses/${id}`, data),
    delete: (id) => api.delete(`courses/${id}`),
    uploadThumbnail: (id, formData) => api.post(`courses/${id}/thumbnail`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    getReviews: (id, params) => api.get(`courses/${id}/reviews`, { params }),
    addReview: (id, data) => api.post(`courses/${id}/reviews`, data),
    getInstructorCourses: (params) => api.get('courses/instructor/my-courses', { params }),
};

// ==================== LESSON API ====================
export const lessonAPI = {
    getCourseLessons: (courseId) => api.get(`lessons/course/${courseId}`),
    getById: (id) => api.get(`lessons/${id}`),
    create: (courseId, data) => api.post(`lessons/course/${courseId}`, data),
    update: (id, data) => api.put(`lessons/${id}`, data),
    delete: (id) => api.delete(`lessons/${id}`),
    uploadVideo: (id, formData) => api.post(`lessons/${id}/video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    updateProgress: (id, data) => api.post(`lessons/${id}/progress`, data),
    complete: (id) => api.post(`lessons/${id}/complete`),
};

// ==================== ENROLLMENT API ====================
export const enrollmentAPI = {
    getMyEnrollments: (params) => api.get('enrollments', { params }),
    enroll: (courseId) => api.post(`enrollments/${courseId}`),
    cancel: (courseId) => api.delete(`enrollments/${courseId}`),
    checkStatus: (courseId) => api.get(`enrollments/${courseId}/status`),
    getProgress: (courseId) => api.get(`enrollments/${courseId}/progress`),
    getCourseStudents: (courseId, params) => api.get(`enrollments/course/${courseId}/students`, { params }),
};

// ==================== CATEGORY API ====================
export const categoryAPI = {
    getAll: () => api.get('categories'),
    getById: (id) => api.get(`categories/${id}`),
    getCourses: (id, params) => api.get(`categories/${id}/courses`, { params }),
    create: (data) => api.post('categories', data),
    update: (id, data) => api.put(`categories/${id}`, data),
    delete: (id) => api.delete(`categories/${id}`),
};

// ==================== UPLOAD API ====================
export const uploadAPI = {
    uploadImage: (formData) => api.post('upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    uploadVideo: (formData) => api.post('upload/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    deleteFile: (publicId, resourceType) => api.delete('upload/delete', {
        data: { public_id: publicId, resource_type: resourceType },
    }),
};

export default api;
