/**
 * Admin Overview
 * Stats and quick links
 */

import { useState, useEffect } from 'react';
import { FiUsers, FiBookOpen, FiLayers } from 'react-icons/fi';
import { userAPI, courseAPI, categoryAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminOverview = () => {
    const [stats, setStats] = useState({
        users: 0,
        courses: 0,
        categories: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [usersRes, coursesRes, categoriesRes] = await Promise.all([
                    userAPI.getAllUsers({ limit: 1 }),
                    courseAPI.getAll({ limit: 1 }),
                    categoryAPI.getAll(),
                ]);

                setStats({
                    users: usersRes.data.pagination?.totalItems || 0,
                    courses: coursesRes.data.pagination?.totalItems || 0,
                    categories: categoriesRes.data.data?.length || 0,
                });
            } catch (error) {
                console.error('Error fetching admin stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <LoadingSpinner />;

    return (
        <div>
            <div className="mb-6">
                <h1>Dashboard Overview</h1>
                <p className="text-muted">Platform statistics at a glance</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <FiUsers />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.users}</span>
                        <span className="stat-label">Total Users</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">
                        <FiBookOpen />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.courses}</span>
                        <span className="stat-label">Total Courses</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon purple">
                        <FiLayers />
                    </div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.categories}</span>
                        <span className="stat-label">Categories</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminOverview;
