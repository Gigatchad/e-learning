/**
 * Courses Page
 * Browse all courses with filtering, search, and pagination
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiSearch, FiFilter, FiX, FiGrid, FiList } from 'react-icons/fi';
import { courseAPI, categoryAPI } from '../services/api';
import CourseCard from '../components/courses/CourseCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './CoursesPage.css';

const CoursesPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [courses, setCourses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState(null);
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Filter state
    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        category: searchParams.get('category') || '',
        level: searchParams.get('level') || '',
        minPrice: searchParams.get('minPrice') || '',
        maxPrice: searchParams.get('maxPrice') || '',
        sort: searchParams.get('sort') || 'created_at:desc',
    });

    const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);

    // Fetch categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await categoryAPI.getAll();
                setCategories(response.data.data);
            } catch (error) {
                console.error('Error fetching categories:', error);
            }
        };
        fetchCategories();
    }, []);

    // Fetch courses when filters change
    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true);
            try {
                const params = {
                    page,
                    limit: 12,
                    ...Object.fromEntries(
                        Object.entries(filters).filter(([_, v]) => v !== '')
                    ),
                };

                const response = await courseAPI.getAll(params);
                setCourses(response.data.data);
                setPagination(response.data.pagination);

                // Update URL
                const newParams = new URLSearchParams();
                Object.entries({ ...filters, page }).forEach(([key, value]) => {
                    if (value) newParams.set(key, value);
                });
                setSearchParams(newParams);
            } catch (error) {
                console.error('Error fetching courses:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, [filters, page]);

    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        // Trigger search by updating filters
        setFilters((prev) => ({ ...prev }));
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            category: '',
            level: '',
            minPrice: '',
            maxPrice: '',
            sort: 'created_at:desc',
        });
        setPage(1);
    };

    const levels = [
        { value: '', label: 'All Levels' },
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' },
        { value: 'all_levels', label: 'All Levels' },
    ];

    const sortOptions = [
        { value: 'created_at:desc', label: 'Newest' },
        { value: 'created_at:asc', label: 'Oldest' },
        { value: 'price:asc', label: 'Price: Low to High' },
        { value: 'price:desc', label: 'Price: High to Low' },
        { value: 'average_rating:desc', label: 'Highest Rated' },
        { value: 'total_enrollments:desc', label: 'Most Popular' },
    ];

    const hasActiveFilters = filters.category || filters.level || filters.minPrice || filters.maxPrice || filters.search;

    return (
        <div className="courses-page">
            <div className="container">
                {/* Header */}
                <div className="courses-header">
                    <div className="courses-header-content">
                        <h1>Explore Courses</h1>
                        <p>Discover courses that match your interests and goals</p>
                    </div>

                    {/* Search Bar */}
                    <form className="search-bar" onSubmit={handleSearch}>
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search courses..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                        {filters.search && (
                            <button type="button" className="search-clear" onClick={() => handleFilterChange('search', '')}>
                                <FiX />
                            </button>
                        )}
                    </form>
                </div>

                <div className="courses-layout">
                    {/* Sidebar Filters */}
                    <aside className={`courses-sidebar ${filtersOpen ? 'open' : ''}`}>
                        <div className="sidebar-header">
                            <h3>Filters</h3>
                            {hasActiveFilters && (
                                <button className="clear-filters" onClick={clearFilters}>
                                    Clear All
                                </button>
                            )}
                            <button className="close-sidebar" onClick={() => setFiltersOpen(false)}>
                                <FiX />
                            </button>
                        </div>

                        {/* Category Filter */}
                        <div className="filter-group">
                            <label className="filter-label">Category</label>
                            <select
                                className="form-input form-select"
                                value={filters.category}
                                onChange={(e) => handleFilterChange('category', e.target.value)}
                            >
                                <option value="">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.slug}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Level Filter */}
                        <div className="filter-group">
                            <label className="filter-label">Level</label>
                            <select
                                className="form-input form-select"
                                value={filters.level}
                                onChange={(e) => handleFilterChange('level', e.target.value)}
                            >
                                {levels.map((level) => (
                                    <option key={level.value} value={level.value}>
                                        {level.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Price Filter */}
                        <div className="filter-group">
                            <label className="filter-label">Price Range</label>
                            <div className="price-inputs">
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="Min"
                                    value={filters.minPrice}
                                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                                />
                                <span>to</span>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="Max"
                                    value={filters.maxPrice}
                                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                                />
                            </div>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className="courses-main">
                        {/* Toolbar */}
                        <div className="courses-toolbar">
                            <div className="courses-count">
                                {pagination && (
                                    <span>
                                        Showing {courses.length} of {pagination.totalItems} courses
                                    </span>
                                )}
                            </div>
                            <div className="courses-toolbar-right">
                                <button
                                    className="btn btn-secondary btn-sm filter-toggle"
                                    onClick={() => setFiltersOpen(true)}
                                >
                                    <FiFilter /> Filters
                                </button>
                                <select
                                    className="form-input form-select sort-select"
                                    value={filters.sort}
                                    onChange={(e) => handleFilterChange('sort', e.target.value)}
                                >
                                    {sortOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Course Grid */}
                        {loading ? (
                            <LoadingSpinner />
                        ) : courses.length === 0 ? (
                            <div className="no-courses">
                                <h3>No courses found</h3>
                                <p>Try adjusting your filters or search terms</p>
                                <button className="btn btn-primary" onClick={clearFilters}>
                                    Clear Filters
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="courses-grid grid grid-3">
                                    {courses.map((course) => (
                                        <CourseCard key={course.id} course={course} />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {pagination && pagination.totalPages > 1 && (
                                    <div className="pagination">
                                        <button
                                            className="btn btn-secondary"
                                            disabled={!pagination.hasPrevPage}
                                            onClick={() => setPage(page - 1)}
                                        >
                                            Previous
                                        </button>
                                        <div className="pagination-info">
                                            Page {pagination.currentPage} of {pagination.totalPages}
                                        </div>
                                        <button
                                            className="btn btn-secondary"
                                            disabled={!pagination.hasNextPage}
                                            onClick={() => setPage(page + 1)}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>

            {/* Overlay for mobile filters */}
            {filtersOpen && <div className="sidebar-overlay" onClick={() => setFiltersOpen(false)} />}
        </div>
    );
};

export default CoursesPage;
