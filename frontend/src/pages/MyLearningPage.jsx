/**
 * My Learning Page
 * Student's enrolled courses and progress
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiBookOpen, FiClock, FiPlay, FiCheckCircle } from 'react-icons/fi';
import { enrollmentAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './MyLearningPage.css';

const MyLearningPage = () => {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        const fetchEnrollments = async () => {
            try {
                const params = activeFilter !== 'all' ? { status: activeFilter } : {};
                const response = await enrollmentAPI.getMyEnrollments(params);
                setEnrollments(response.data.data);
            } catch (error) {
                console.error('Error fetching enrollments:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEnrollments();
    }, [activeFilter]);

    const filters = [
        { value: 'all', label: 'All Courses' },
        { value: 'active', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
    ];

    if (loading) {
        return (
            <div className="page flex items-center justify-center">
                <LoadingSpinner size="lg" text="Loading your courses..." />
            </div>
        );
    }

    return (
        <div className="my-learning-page page">
            <div className="container">
                <div className="my-learning-header">
                    <h1>My Learning</h1>
                    <p>Track your progress and continue learning</p>
                </div>

                {/* Filters */}
                <div className="learning-filters">
                    {filters.map((filter) => (
                        <button
                            key={filter.value}
                            className={`filter-btn ${activeFilter === filter.value ? 'active' : ''}`}
                            onClick={() => setActiveFilter(filter.value)}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {/* Course Grid */}
                {enrollments.length === 0 ? (
                    <div className="no-enrollments">
                        <FiBookOpen className="no-enrollments-icon" />
                        <h3>No courses yet</h3>
                        <p>You haven't enrolled in any courses yet. Start exploring!</p>
                        <Link to="/courses" className="btn btn-primary">
                            Browse Courses
                        </Link>
                    </div>
                ) : (
                    <div className="enrollments-grid">
                        {enrollments.map((enrollment) => (
                            <div key={enrollment.id} className="enrollment-card">
                                <div className="enrollment-thumbnail">
                                    {enrollment.thumbnail_url ? (
                                        <img src={enrollment.thumbnail_url} alt={enrollment.title} />
                                    ) : (
                                        <div className="thumbnail-placeholder">
                                            <FiBookOpen />
                                        </div>
                                    )}
                                    {enrollment.status === 'completed' && (
                                        <div className="completed-badge">
                                            <FiCheckCircle /> Completed
                                        </div>
                                    )}
                                </div>

                                <div className="enrollment-body">
                                    <h3 className="enrollment-title">{enrollment.title}</h3>
                                    <p className="enrollment-instructor">
                                        {enrollment.instructor_first_name} {enrollment.instructor_last_name}
                                    </p>

                                    {/* Progress Bar */}
                                    <div className="enrollment-progress">
                                        <div className="progress-header">
                                            <span>{Math.round(enrollment.progress || 0)}% complete</span>
                                            <span>{enrollment.completed_lessons || 0}/{enrollment.total_lessons} lessons</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className="progress-bar-fill"
                                                style={{ width: `${enrollment.progress || 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="enrollment-footer">
                                        <span className="enrollment-duration">
                                            <FiClock /> {enrollment.duration_hours?.toFixed(1) || 0} hours
                                        </span>
                                        <Link
                                            to={`/courses/${enrollment.course_uuid}`}
                                            className="btn btn-primary btn-sm"
                                        >
                                            <FiPlay /> {enrollment.progress > 0 ? 'Continue' : 'Start'}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyLearningPage;
