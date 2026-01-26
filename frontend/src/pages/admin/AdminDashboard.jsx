/**
 * Admin Dashboard Page
 * Basic admin with routing to sub-pages (Users, Categories)
 */

import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { FiUsers, FiLayers, FiGrid } from 'react-icons/fi';
import './AdminDashboard.css';

// Sub-components
import AdminOverview from './AdminOverview';
import AdminAttendants from './AdminAttendants';
import AdminCategories from './AdminCategories';

const AdminDashboard = () => {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname.endsWith(path);
    };

    return (
        <div className="admin-dashboard page">
            <div className="container">
                <div className="admin-layout">
                    {/* Sidebar */}
                    <aside className="admin-sidebar">
                        <div className="sidebar-title">Admin Panel</div>
                        <nav className="admin-nav">
                            <Link
                                to="/admin"
                                className={`admin-nav-item ${location.pathname === '/admin' ? 'active' : ''}`}
                            >
                                <FiGrid /> Overview
                            </Link>
                            <Link
                                to="/admin/users"
                                className={`admin-nav-item ${isActive('users') ? 'active' : ''}`}
                            >
                                <FiUsers /> Users
                            </Link>
                            <Link
                                to="/admin/categories"
                                className={`admin-nav-item ${isActive('categories') ? 'active' : ''}`}
                            >
                                <FiLayers /> Categories
                            </Link>
                        </nav>
                    </aside>

                    {/* Content */}
                    <main className="admin-content">
                        <Routes>
                            <Route index element={<AdminOverview />} />
                            <Route path="users" element={<AdminAttendants />} />
                            <Route path="categories" element={<AdminCategories />} />
                        </Routes>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
