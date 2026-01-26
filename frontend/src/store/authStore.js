/**
 * Auth Store - Zustand state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';

const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,

            // Login action
            login: async (credentials) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authAPI.login(credentials);
                    const { user, accessToken, refreshToken } = response.data.data;

                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken);

                    set({
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null
                    });

                    return { success: true, user };
                } catch (error) {
                    const message = error.response?.data?.message || 'Login failed';
                    set({ isLoading: false, error: message });
                    return { success: false, error: message };
                }
            },

            // Register action
            register: async (userData) => {
                set({ isLoading: true, error: null });
                try {
                    const response = await authAPI.register(userData);
                    const { user, accessToken, refreshToken } = response.data.data;

                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken);

                    set({
                        user,
                        isAuthenticated: true,
                        isLoading: false,
                        error: null
                    });

                    return { success: true, user };
                } catch (error) {
                    const message = error.response?.data?.message || 'Registration failed';
                    set({ isLoading: false, error: message });
                    return { success: false, error: message };
                }
            },

            // Logout action
            logout: async () => {
                try {
                    await authAPI.logout();
                } catch (error) {
                    console.error('Logout error:', error);
                } finally {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    set({ user: null, isAuthenticated: false, error: null });
                }
            },

            // Fetch current user
            fetchUser: async () => {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    set({ user: null, isAuthenticated: false });
                    return null;
                }

                set({ isLoading: true });
                try {
                    const response = await authAPI.getMe();
                    const user = response.data.data;
                    set({ user, isAuthenticated: true, isLoading: false });
                    return user;
                } catch (error) {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    set({ user: null, isAuthenticated: false, isLoading: false });
                    return null;
                }
            },

            // Update user data locally
            updateUser: (userData) => {
                set((state) => ({
                    user: { ...state.user, ...userData },
                }));
            },

            // Clear error
            clearError: () => set({ error: null }),

            // Check if user has role
            hasRole: (roles) => {
                const user = get().user;
                if (!user) return false;
                if (typeof roles === 'string') return user.role === roles;
                return roles.includes(user.role);
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
);

export default useAuthStore;
