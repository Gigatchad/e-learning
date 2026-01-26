/**
 * Protected Route Component
 * Handles authentication and role-based access
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

const ProtectedRoute = ({ allowedRoles = null }) => {
    const { isAuthenticated, user, isLoading } = useAuthStore();
    const location = useLocation();

    // Show loading while checking auth
    if (isLoading) {
        return (
            <div className="page flex items-center justify-center">
                <div className="skeleton" style={{ width: '60px', height: '60px', borderRadius: '50%' }} />
            </div>
        );
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check role-based access
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        // Redirect to appropriate dashboard or home
        if (user.role === 'admin') {
            return <Navigate to="/admin" replace />;
        } else if (user.role === 'instructor') {
            return <Navigate to="/instructor" replace />;
        }
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
