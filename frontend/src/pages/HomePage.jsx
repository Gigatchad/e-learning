/**
 * Home Page
 * Landing page with hero, featured courses, and categories
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiPlay, FiUsers, FiBookOpen, FiAward, FiTrendingUp } from 'react-icons/fi';
import { courseAPI, categoryAPI } from '../services/api';
import CourseCard from '../components/courses/CourseCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './HomePage.css';

const HomePage = () => {
    const [featuredCourses, setFeaturedCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [coursesRes, categoriesRes] = await Promise.all([
                    courseAPI.getAll({ limit: 8, is_featured: true }),
                    categoryAPI.getAll(),
                ]);
                setFeaturedCourses(coursesRes.data.data);
                setCategories(categoriesRes.data.data.slice(0, 8));
            } catch (error) {
                console.error('Error fetching home data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const stats = [
        { icon: <FiUsers />, value: '50,000+', label: 'Active Students' },
        { icon: <FiBookOpen />, value: '1,200+', label: 'Courses' },
        { icon: <FiAward />, value: '500+', label: 'Expert Instructors' },
        { icon: <FiTrendingUp />, value: '95%', label: 'Success Rate' },
    ];

    return (
        <div className="home-page">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-background">
                    <div className="hero-shape hero-shape-1"></div>
                    <div className="hero-shape hero-shape-2"></div>
                    <div className="hero-shape hero-shape-3"></div>
                </div>
                <div className="container hero-container">
                    <div className="hero-content">
                        <span className="hero-badge">
                            <FiPlay /> New courses added weekly
                        </span>
                        <h1 className="hero-title">
                            Unlock Your Potential with
                            <span className="text-gradient"> Expert-Led Courses</span>
                        </h1>
                        <p className="hero-description">
                            Join thousands of learners and advance your career with our comprehensive,
                            hands-on courses taught by industry professionals.
                        </p>
                        <div className="hero-actions">
                            <Link to="/courses" className="btn btn-primary btn-lg">
                                Explore Courses <FiArrowRight />
                            </Link>
                            <Link to="/register" className="btn btn-outline btn-lg">
                                Start Free Trial
                            </Link>
                        </div>
                    </div>
                    <div className="hero-visual">
                        <div className="hero-card hero-card-1">
                            <FiBookOpen />
                            <span>1,200+ Courses</span>
                        </div>
                        <div className="hero-card hero-card-2">
                            <FiUsers />
                            <span>50K+ Students</span>
                        </div>
                        <div className="hero-card hero-card-3">
                            <FiAward />
                            <span>Certificates</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="stats-section">
                <div className="container">
                    <div className="stats-grid">
                        {stats.map((stat, index) => (
                            <div key={index} className="stat-card">
                                <div className="stat-icon">{stat.icon}</div>
                                <div className="stat-value">{stat.value}</div>
                                <div className="stat-label">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Categories Section */}
            <section className="categories-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Browse Categories</h2>
                        <p>Choose from our wide variety of categories</p>
                    </div>
                    <div className="categories-grid">
                        {categories.map((category) => (
                            <Link
                                key={category.id}
                                to={`/courses?category=${category.slug}`}
                                className="category-card"
                            >
                                <div className="category-icon">
                                    <FiBookOpen />
                                </div>
                                <h3>{category.name}</h3>
                                <span className="category-count">{category.course_count || 0} courses</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Courses Section */}
            <section className="featured-section">
                <div className="container">
                    <div className="section-header">
                        <div>
                            <h2>Featured Courses</h2>
                            <p>Hand-picked courses to get you started</p>
                        </div>
                        <Link to="/courses" className="btn btn-outline">
                            View All Courses <FiArrowRight />
                        </Link>
                    </div>

                    {loading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="courses-grid grid grid-4">
                            {featuredCourses.map((course) => (
                                <CourseCard key={course.id} course={course} />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-card">
                        <div className="cta-content">
                            <h2>Ready to Start Learning?</h2>
                            <p>
                                Join our community of learners and get access to premium courses,
                                expert instructors, and a supportive community.
                            </p>
                            <div className="cta-actions">
                                <Link to="/register" className="btn btn-primary btn-lg">
                                    Get Started Free
                                </Link>
                                <Link to="/courses" className="btn btn-secondary btn-lg">
                                    Browse Courses
                                </Link>
                            </div>
                        </div>
                        <div className="cta-visual">
                            <div className="cta-image-placeholder">
                                <FiBookOpen />
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
