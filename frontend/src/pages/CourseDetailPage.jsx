/**
 * Course Detail Page
 * Full course information with curriculum, reviews, and enrollment
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    FiClock, FiUsers, FiStar, FiBookOpen, FiCheck, FiPlay,
    FiGlobe, FiAward, FiBarChart2, FiLock, FiShoppingCart
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { courseAPI, enrollmentAPI, lessonAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './CourseDetailPage.css';

const CourseDetailPage = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuthStore();

    const [course, setCourse] = useState(null);
    const [enrollmentStatus, setEnrollmentStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedSections, setExpandedSections] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const courseRes = await courseAPI.getById(slug);
                setCourse(courseRes.data.data);

                // Check enrollment if authenticated
                if (isAuthenticated) {
                    try {
                        const enrollRes = await enrollmentAPI.checkStatus(courseRes.data.data.id);
                        setEnrollmentStatus(enrollRes.data.data);
                    } catch (error) {
                        // Not enrolled
                    }
                }
            } catch (error) {
                console.error('Error fetching course:', error);
                toast.error('Course not found');
                navigate('/courses');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [slug, isAuthenticated, navigate]);

    const handleEnroll = async () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: `/courses/${slug}` } });
            return;
        }

        setEnrolling(true);
        try {
            await enrollmentAPI.enroll(course.id);
            toast.success('Successfully enrolled!');
            setEnrollmentStatus({ is_enrolled: true, status: 'active', progress: 0 });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to enroll');
        } finally {
            setEnrolling(false);
        }
    };

    const toggleSection = (sectionName) => {
        setExpandedSections((prev) => ({
            ...prev,
            [sectionName]: !prev[sectionName],
        }));
    };

    const formatPrice = (price, discountPrice) => {
        if (!price || price === 0) return 'Free';
        if (discountPrice && discountPrice < price) {
            return (
                <>
                    <span className="price-current">${discountPrice.toFixed(2)}</span>
                    <span className="price-original">${price.toFixed(2)}</span>
                </>
            );
        }
        return <span className="price-current">${price.toFixed(2)}</span>;
    };

    const isOwner = user?.id === course?.instructor?.id || user?.role === 'admin';
    const isEnrolled = enrollmentStatus?.is_enrolled;

    if (loading) {
        return (
            <div className="page flex items-center justify-center">
                <LoadingSpinner size="lg" text="Loading course..." />
            </div>
        );
    }

    if (!course) return null;

    return (
        <div className="course-detail-page">
            {/* Hero Section */}
            <section className="course-hero">
                <div className="container">
                    <div className="course-hero-content">
                        <div className="course-hero-info">
                            {course.category && (
                                <Link to={`/courses?category=${course.category.slug}`} className="course-category-link">
                                    {course.category.name}
                                </Link>
                            )}
                            <h1>{course.title}</h1>
                            <p className="course-description">{course.short_description || course.description?.substring(0, 200)}</p>

                            <div className="course-meta">
                                <div className="course-rating">
                                    <FiStar className="star-icon" />
                                    <span className="rating-value">{course.average_rating?.toFixed(1) || '0.0'}</span>
                                    <span className="rating-count">({course.total_reviews || 0} reviews)</span>
                                </div>
                                <div className="course-stat">
                                    <FiUsers /> {course.total_enrollments || 0} students
                                </div>
                                <div className="course-stat">
                                    <FiClock /> {course.duration_hours?.toFixed(1) || 0} hours
                                </div>
                                <div className="course-stat">
                                    <FiGlobe /> {course.language || 'English'}
                                </div>
                            </div>

                            <div className="course-instructor">
                                <div className="instructor-avatar">
                                    {course.instructor?.avatar_url ? (
                                        <img src={course.instructor.avatar_url} alt={course.instructor.first_name} />
                                    ) : (
                                        <span>{course.instructor?.first_name?.charAt(0)}{course.instructor?.last_name?.charAt(0)}</span>
                                    )}
                                </div>
                                <div className="instructor-info">
                                    <span className="instructor-label">Created by</span>
                                    <span className="instructor-name">{course.instructor?.first_name} {course.instructor?.last_name}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <div className="course-content">
                <div className="container">
                    <div className="course-layout">
                        {/* Main Column */}
                        <div className="course-main">
                            {/* Tabs */}
                            <div className="tabs">
                                <button
                                    className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('overview')}
                                >
                                    Overview
                                </button>
                                <button
                                    className={`tab ${activeTab === 'curriculum' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('curriculum')}
                                >
                                    Curriculum
                                </button>
                                <button
                                    className={`tab ${activeTab === 'reviews' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('reviews')}
                                >
                                    Reviews
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="tab-content">
                                {activeTab === 'overview' && (
                                    <div className="overview-tab">
                                        {/* What you'll learn */}
                                        {course.what_you_learn?.length > 0 && (
                                            <div className="course-section">
                                                <h3>What you'll learn</h3>
                                                <ul className="learn-list">
                                                    {course.what_you_learn.map((item, index) => (
                                                        <li key={index}>
                                                            <FiCheck className="check-icon" />
                                                            <span>{item}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Description */}
                                        <div className="course-section">
                                            <h3>Description</h3>
                                            <div className="course-full-description">
                                                {course.description}
                                            </div>
                                        </div>

                                        {/* Requirements */}
                                        {course.requirements?.length > 0 && (
                                            <div className="course-section">
                                                <h3>Requirements</h3>
                                                <ul className="requirements-list">
                                                    {course.requirements.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Instructor */}
                                        <div className="course-section">
                                            <h3>Your Instructor</h3>
                                            <div className="instructor-card">
                                                <div className="instructor-avatar avatar-xl">
                                                    {course.instructor?.avatar_url ? (
                                                        <img src={course.instructor.avatar_url} alt={course.instructor.first_name} />
                                                    ) : (
                                                        <span>{course.instructor?.first_name?.charAt(0)}{course.instructor?.last_name?.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div className="instructor-details">
                                                    <h4>{course.instructor?.first_name} {course.instructor?.last_name}</h4>
                                                    <p className="instructor-bio">{course.instructor?.bio || 'Experienced instructor passionate about teaching.'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'curriculum' && (
                                    <div className="curriculum-tab">
                                        <div className="curriculum-header">
                                            <span>{course.sections?.length || 0} sections</span>
                                            <span>•</span>
                                            <span>{course.total_lessons || 0} lessons</span>
                                            <span>•</span>
                                            <span>{course.duration_hours?.toFixed(1) || 0} hours</span>
                                        </div>

                                        <div className="curriculum-sections">
                                            {course.sections?.map((section, index) => (
                                                <div key={index} className="curriculum-section">
                                                    <button
                                                        className="section-header"
                                                        onClick={() => toggleSection(section.name)}
                                                    >
                                                        <div className="section-info">
                                                            <span className="section-toggle">
                                                                {expandedSections[section.name] ? '−' : '+'}
                                                            </span>
                                                            <span className="section-name">{section.name}</span>
                                                        </div>
                                                        <span className="section-count">{section.lessons.length} lessons</span>
                                                    </button>

                                                    {expandedSections[section.name] && (
                                                        <div className="section-lessons">
                                                            {section.lessons.map((lesson) => (
                                                                <div key={lesson.id} className="lesson-item">
                                                                    <div className="lesson-icon">
                                                                        {lesson.is_preview || isEnrolled ? (
                                                                            <FiPlay />
                                                                        ) : (
                                                                            <FiLock />
                                                                        )}
                                                                    </div>
                                                                    <div className="lesson-info">
                                                                        <span className="lesson-title">{lesson.title}</span>
                                                                        {lesson.is_preview && (
                                                                            <span className="lesson-preview-badge">Preview</span>
                                                                        )}
                                                                    </div>
                                                                    {lesson.video_duration && (
                                                                        <span className="lesson-duration">
                                                                            {Math.floor(lesson.video_duration / 60)}:{String(lesson.video_duration % 60).padStart(2, '0')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'reviews' && (
                                    <div className="reviews-tab">
                                        <div className="reviews-summary">
                                            <div className="rating-big">
                                                <span className="rating-number">{course.average_rating?.toFixed(1) || '0.0'}</span>
                                                <div className="rating-stars">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <FiStar
                                                            key={star}
                                                            className={star <= Math.round(course.average_rating || 0) ? 'star filled' : 'star'}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="rating-label">{course.total_reviews || 0} reviews</span>
                                            </div>
                                        </div>

                                        {course.recent_reviews?.length > 0 ? (
                                            <div className="reviews-list">
                                                {course.recent_reviews.map((review) => (
                                                    <div key={review.id} className="review-card">
                                                        <div className="review-header">
                                                            <div className="reviewer-avatar avatar">
                                                                {review.avatar_url ? (
                                                                    <img src={review.avatar_url} alt={review.first_name} />
                                                                ) : (
                                                                    <span>{review.first_name?.charAt(0)}{review.last_name?.charAt(0)}</span>
                                                                )}
                                                            </div>
                                                            <div className="reviewer-info">
                                                                <span className="reviewer-name">{review.first_name} {review.last_name}</span>
                                                                <div className="review-rating">
                                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                                        <FiStar
                                                                            key={star}
                                                                            className={star <= review.rating ? 'star filled' : 'star'}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {review.comment && (
                                                            <p className="review-comment">{review.comment}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="no-reviews">No reviews yet. Be the first to review!</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar */}
                        <aside className="course-sidebar">
                            <div className="sidebar-card">
                                {course.thumbnail_url ? (
                                    <img src={course.thumbnail_url} alt={course.title} className="sidebar-thumbnail" />
                                ) : (
                                    <div className="sidebar-thumbnail-placeholder">
                                        <FiBookOpen />
                                    </div>
                                )}

                                <div className="sidebar-body">
                                    <div className="sidebar-price">
                                        {formatPrice(course.price, course.discount_price)}
                                    </div>

                                    {isOwner ? (
                                        <Link to={`/instructor/courses/${course.id}/edit`} className="btn btn-primary w-full">
                                            Edit Course
                                        </Link>
                                    ) : isEnrolled ? (
                                        <Link
                                            to={course.sections?.[0]?.lessons?.[0] ? `/courses/${course.id}/lessons/${course.sections[0].lessons[0].id}` : '#'}
                                            className="btn btn-success w-full"
                                        >
                                            <FiPlay /> Continue Learning
                                        </Link>
                                    ) : (
                                        <button
                                            className="btn btn-primary w-full"
                                            onClick={handleEnroll}
                                            disabled={enrolling}
                                        >
                                            <FiShoppingCart /> {enrolling ? 'Enrolling...' : 'Enroll Now'}
                                        </button>
                                    )}

                                    <div className="sidebar-features">
                                        <div className="feature-item">
                                            <FiClock />
                                            <span>{course.duration_hours?.toFixed(1) || 0} hours of content</span>
                                        </div>
                                        <div className="feature-item">
                                            <FiBookOpen />
                                            <span>{course.total_lessons || 0} lessons</span>
                                        </div>
                                        <div className="feature-item">
                                            <FiBarChart2 />
                                            <span>{course.level?.replace('_', ' ') || 'All Levels'}</span>
                                        </div>
                                        <div className="feature-item">
                                            <FiGlobe />
                                            <span>{course.language || 'English'}</span>
                                        </div>
                                        <div className="feature-item">
                                            <FiAward />
                                            <span>Certificate of completion</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseDetailPage;
