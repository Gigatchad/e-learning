/**
 * Instructor Dashboard
 * Overview of instructor's courses and statistics
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiBookOpen, FiUsers, FiStar, FiDollarSign, FiEdit, FiTrash2, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { courseAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './InstructorDashboard.css';

const InstructorDashboard = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalCourses: 0,
        totalStudents: 0,
        averageRating: 0,
        totalRevenue: 0,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await courseAPI.getInstructorCourses({ limit: 100 });
                const coursesData = response.data.data || [];
                setCourses(coursesData);

                // Calculate stats
                const totalStudents = coursesData.reduce((sum, c) => sum + (c.total_enrollments || 0), 0);
                const totalRatings = coursesData.filter((c) => c.average_rating > 0);
                const avgRating = totalRatings.length > 0
                    ? totalRatings.reduce((sum, c) => sum + c.average_rating, 0) / totalRatings.length
                    : 0;
                const revenue = coursesData.reduce((sum, c) => {
                    const price = c.discount_price || c.price || 0;
                    return sum + price * (c.total_enrollments || 0);
                }, 0);

                setStats({
                    totalCourses: coursesData.length,
                    totalStudents,
                    averageRating: avgRating,
                    totalRevenue: revenue,
                });
            } catch (error) {
                console.error('Error fetching courses:', error);
                toast.error('Failed to load courses');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleDelete = async (courseId) => {
        if (!window.confirm('Are you sure you want to delete this course?')) return;

        try {
            await courseAPI.delete(courseId);
            setCourses((prev) => prev.filter((c) => c.id !== courseId));
            toast.success('Course deleted successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete course');
        }
    };

    if (loading) {
        return (
            <div className="page flex items-center justify-center">
                <LoadingSpinner size="lg" text="Loading dashboard..." />
            </div>
        );
    }

    return (
        <div className="instructor-dashboard page">
            <div className="container">
                <div className="dashboard-header">
                    <div>
                        <h1>Instructor Dashboard</h1>
                        <p>Manage your courses and track your performance</p>
                    </div>
                    <Link to="/instructor/courses/new" className="btn btn-primary">
                        <FiPlus /> Create Course
                    </Link>
                </div>

                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon blue">
                            <FiBookOpen />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{stats.totalCourses}</span>
                            <span className="stat-label">Courses</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green">
                            <FiUsers />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{stats.totalStudents}</span>
                            <span className="stat-label">Students</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon yellow">
                            <FiStar />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">{stats.averageRating.toFixed(1)}</span>
                            <span className="stat-label">Avg Rating</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon purple">
                            <FiDollarSign />
                        </div>
                        <div className="stat-content">
                            <span className="stat-value">${stats.totalRevenue.toFixed(0)}</span>
                            <span className="stat-label">Revenue</span>
                        </div>
                    </div>
                </div>

                {/* Courses Table */}
                <div className="courses-section">
                    <h2>Your Courses</h2>

                    {courses.length === 0 ? (
                        <div className="no-courses-card">
                            <FiBookOpen className="icon" />
                            <h3>No courses yet</h3>
                            <p>Create your first course and start teaching!</p>
                            <Link to="/instructor/courses/new" className="btn btn-primary">
                                <FiPlus /> Create Course
                            </Link>
                        </div>
                    ) : (
                        <div className="courses-table-wrapper">
                            <table className="courses-table">
                                <thead>
                                    <tr>
                                        <th>Course</th>
                                        <th>Status</th>
                                        <th>Students</th>
                                        <th>Rating</th>
                                        <th>Price</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {courses.map((course) => (
                                        <tr key={course.id}>
                                            <td>
                                                <div className="course-cell">
                                                    <div className="course-thumbnail">
                                                        {course.thumbnail_url ? (
                                                            <img src={course.thumbnail_url} alt={course.title} />
                                                        ) : (
                                                            <FiBookOpen />
                                                        )}
                                                    </div>
                                                    <div className="course-info">
                                                        <span className="course-title">{course.title}</span>
                                                        <span className="course-lessons">{course.total_lessons || 0} lessons</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-badge ${course.is_published ? 'published' : 'draft'}`}>
                                                    {course.is_published ? 'Published' : 'Draft'}
                                                </span>
                                            </td>
                                            <td>{course.total_enrollments || 0}</td>
                                            <td>
                                                <span className="rating">
                                                    <FiStar /> {course.average_rating?.toFixed(1) || '0.0'}
                                                </span>
                                            </td>
                                            <td>
                                                {course.price ? (
                                                    <>
                                                        ${course.discount_price || course.price}
                                                        {course.discount_price && (
                                                            <span className="original-price">${course.price}</span>
                                                        )}
                                                    </>
                                                ) : (
                                                    'Free'
                                                )}
                                            </td>
                                            <td>
                                                <div className="actions">
                                                    <Link
                                                        to={`/courses/${course.slug || course.uuid}`}
                                                        className="action-btn view"
                                                        title="View"
                                                    >
                                                        <FiEye />
                                                    </Link>
                                                    <Link
                                                        to={`/instructor/courses/${course.id}/edit`}
                                                        className="action-btn edit"
                                                        title="Edit"
                                                    >
                                                        <FiEdit />
                                                    </Link>
                                                    <Link
                                                        to={`/instructor/courses/${course.id}/lessons`}
                                                        className="action-btn lessons"
                                                        title="Manage Lessons"
                                                    >
                                                        <FiBookOpen />
                                                    </Link>
                                                    <button
                                                        className="action-btn delete"
                                                        title="Delete"
                                                        onClick={() => handleDelete(course.id)}
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InstructorDashboard;
