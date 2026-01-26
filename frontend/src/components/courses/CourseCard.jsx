/**
 * Course Card Component
 * Displays course preview in grid layouts
 */

import { Link } from 'react-router-dom';
import { FiClock, FiUsers, FiStar, FiBookOpen } from 'react-icons/fi';
import './CourseCard.css';

const CourseCard = ({ course }) => {
    const formatPrice = (price, discountPrice) => {
        if (!price || price === 0) {
            return <span className="price price-free">Free</span>;
        }

        if (discountPrice && discountPrice < price) {
            return (
                <>
                    <span className="price">${discountPrice.toFixed(2)}</span>
                    <span className="price-original">${price.toFixed(2)}</span>
                </>
            );
        }

        return <span className="price">${price.toFixed(2)}</span>;
    };

    const formatDuration = (hours) => {
        if (!hours) return '0h';
        if (hours < 1) return `${Math.round(hours * 60)}m`;
        return `${hours.toFixed(1)}h`;
    };

    return (
        <Link to={`/courses/${course.slug || course.uuid}`} className="course-card">
            <div className="course-card-image">
                {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} />
                ) : (
                    <div className="course-card-placeholder">
                        <FiBookOpen />
                    </div>
                )}
                {course.is_featured && (
                    <span className="course-card-badge">Featured</span>
                )}
                <div className="course-card-level">{course.level?.replace('_', ' ')}</div>
            </div>

            <div className="course-card-body">
                <div className="course-card-category">
                    {course.category?.name || 'Uncategorized'}
                </div>

                <h3 className="course-card-title">{course.title}</h3>

                <p className="course-card-instructor">
                    {course.instructor?.first_name} {course.instructor?.last_name}
                </p>

                <div className="course-card-meta">
                    <div className="course-card-rating">
                        <FiStar className="rating-star" />
                        <span className="rating-value">{course.average_rating?.toFixed(1) || '0.0'}</span>
                        <span className="rating-count">({course.total_reviews || 0})</span>
                    </div>
                    <div className="course-card-stats">
                        <span><FiClock /> {formatDuration(course.duration_hours)}</span>
                        <span><FiBookOpen /> {course.total_lessons || 0}</span>
                    </div>
                </div>

                <div className="course-card-footer">
                    <div className="course-card-price">
                        {formatPrice(course.price, course.discount_price)}
                    </div>
                    <div className="course-card-enrollments">
                        <FiUsers /> {course.total_enrollments || 0}
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default CourseCard;
