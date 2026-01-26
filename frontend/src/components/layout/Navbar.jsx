/**
 * Navbar Component
 * Main navigation with user menu and responsive design
 */

import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiUser, FiLogOut, FiBookOpen, FiSettings, FiGrid } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import './Navbar.css';

const Navbar = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const { isAuthenticated, user, logout } = useAuthStore();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        setUserMenuOpen(false);
        navigate('/');
    };

    const getInitials = (firstName, lastName) => {
        return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
    };

    const getDashboardLink = () => {
        if (user?.role === 'admin') return '/admin';
        if (user?.role === 'instructor') return '/instructor';
        return '/my-learning';
    };

    return (
        <nav className="navbar">
            <div className="container navbar-container">
                {/* Logo */}
                <Link to="/" className="navbar-logo">
                    <div className="logo-icon">
                        <FiBookOpen />
                    </div>
                    <span className="logo-text">EduPlatform</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="navbar-links">
                    <NavLink to="/courses" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                        Courses
                    </NavLink>
                    {isAuthenticated && user?.role !== 'admin' && (
                        <NavLink to="/my-learning" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                            My Learning
                        </NavLink>
                    )}
                </div>

                {/* Right Section */}
                <div className="navbar-right">
                    {isAuthenticated ? (
                        <div className="user-menu-wrapper">
                            <button
                                className="user-menu-trigger"
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                            >
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt={user.first_name} className="avatar" />
                                ) : (
                                    <div className="avatar">
                                        {getInitials(user?.first_name, user?.last_name)}
                                    </div>
                                )}
                            </button>

                            {userMenuOpen && (
                                <>
                                    <div className="user-menu-overlay" onClick={() => setUserMenuOpen(false)} />
                                    <div className="user-menu">
                                        <div className="user-menu-header">
                                            <p className="user-name">{user?.first_name} {user?.last_name}</p>
                                            <p className="user-email">{user?.email}</p>
                                            <span className="badge badge-primary">{user?.role}</span>
                                        </div>
                                        <div className="user-menu-divider" />
                                        <Link to="/profile" className="user-menu-item" onClick={() => setUserMenuOpen(false)}>
                                            <FiUser /> Profile
                                        </Link>
                                        <Link to={getDashboardLink()} className="user-menu-item" onClick={() => setUserMenuOpen(false)}>
                                            <FiGrid /> Dashboard
                                        </Link>
                                        {user?.role === 'admin' && (
                                            <Link to="/admin" className="user-menu-item" onClick={() => setUserMenuOpen(false)}>
                                                <FiSettings /> Admin Panel
                                            </Link>
                                        )}
                                        <div className="user-menu-divider" />
                                        <button className="user-menu-item logout" onClick={handleLogout}>
                                            <FiLogOut /> Logout
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="navbar-auth">
                            <Link to="/login" className="btn btn-secondary btn-sm">
                                Login
                            </Link>
                            <Link to="/register" className="btn btn-primary btn-sm">
                                Sign Up
                            </Link>
                        </div>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button
                        className="mobile-menu-toggle"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <FiX /> : <FiMenu />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="mobile-menu">
                        <NavLink to="/courses" onClick={() => setMobileMenuOpen(false)}>
                            Courses
                        </NavLink>
                        {isAuthenticated && (
                            <>
                                <NavLink to="/my-learning" onClick={() => setMobileMenuOpen(false)}>
                                    My Learning
                                </NavLink>
                                <NavLink to="/profile" onClick={() => setMobileMenuOpen(false)}>
                                    Profile
                                </NavLink>
                                <button onClick={handleLogout}>Logout</button>
                            </>
                        )}
                        {!isAuthenticated && (
                            <>
                                <NavLink to="/login" onClick={() => setMobileMenuOpen(false)}>
                                    Login
                                </NavLink>
                                <NavLink to="/register" onClick={() => setMobileMenuOpen(false)}>
                                    Sign Up
                                </NavLink>
                            </>
                        )}
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
