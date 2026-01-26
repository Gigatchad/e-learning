/**
 * Lesson Page
 * Video/content player with progress tracking
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ReactPlayer from 'react-player';
import {
    FiChevronLeft, FiChevronRight, FiCheck, FiList, FiX,
    FiPlay, FiFileText, FiLock
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { lessonAPI, enrollmentAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import './LessonPage.css';

const LessonPage = () => {
    const { courseId, lessonId } = useParams();
    const navigate = useNavigate();

    const [lesson, setLesson] = useState(null);
    const [courseData, setCourseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [completing, setCompleting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [lessonRes, lessonsRes] = await Promise.all([
                    lessonAPI.getById(lessonId),
                    lessonAPI.getCourseLessons(courseId),
                ]);
                setLesson(lessonRes.data.data);
                setCourseData(lessonsRes.data.data);
            } catch (error) {
                console.error('Error fetching lesson:', error);
                toast.error('Failed to load lesson');
                navigate(`/courses/${courseId}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [courseId, lessonId, navigate]);

    const handleComplete = async () => {
        setCompleting(true);
        try {
            await lessonAPI.complete(lessonId);
            setLesson((prev) => ({ ...prev, progress: { ...prev.progress, is_completed: true } }));
            toast.success('Lesson completed!');
        } catch (error) {
            toast.error('Failed to mark as complete');
        } finally {
            setCompleting(false);
        }
    };

    const getAllLessons = () => {
        if (!courseData?.sections) return [];
        return courseData.sections.flatMap((section) => section.lessons);
    };

    const getCurrentLessonIndex = () => {
        const lessons = getAllLessons();
        return lessons.findIndex((l) => l.id === lesson?.id || l.uuid === lesson?.uuid);
    };

    const getNavigation = () => {
        const lessons = getAllLessons();
        const currentIndex = getCurrentLessonIndex();
        return {
            prev: currentIndex > 0 ? lessons[currentIndex - 1] : null,
            next: currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null,
        };
    };

    if (loading) {
        return (
            <div className="lesson-page loading">
                <LoadingSpinner size="lg" text="Loading lesson..." />
            </div>
        );
    }

    if (!lesson) return null;

    const { prev, next } = getNavigation();
    const isCompleted = lesson.progress?.is_completed;

    return (
        <div className="lesson-page">
            {/* Header */}
            <header className="lesson-header">
                <div className="lesson-header-left">
                    <Link to={`/courses/${courseId}`} className="back-link">
                        <FiChevronLeft /> Back to Course
                    </Link>
                </div>
                <div className="lesson-header-center">
                    <h1>{lesson.title}</h1>
                </div>
                <div className="lesson-header-right">
                    <button
                        className="sidebar-toggle"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <FiX /> : <FiList />}
                    </button>
                </div>
            </header>

            <div className="lesson-layout">
                {/* Main Content */}
                <main className="lesson-main">
                    {/* Video/Content */}
                    <div className="lesson-content">
                        {lesson.content_type === 'video' && lesson.video_url ? (
                            <div className="video-container">
                                <ReactPlayer
                                    url={lesson.video_url}
                                    width="100%"
                                    height="100%"
                                    controls
                                    playing={false}
                                    config={{
                                        file: {
                                            attributes: {
                                                controlsList: 'nodownload',
                                            },
                                        },
                                    }}
                                />
                            </div>
                        ) : lesson.content_type === 'article' ? (
                            <div className="article-content">
                                <div className="article-body">
                                    {lesson.article_content || 'No content available.'}
                                </div>
                            </div>
                        ) : (
                            <div className="content-placeholder">
                                <FiFileText />
                                <p>Content not available</p>
                            </div>
                        )}
                    </div>

                    {/* Lesson Info */}
                    <div className="lesson-info">
                        <div className="lesson-info-header">
                            <div>
                                <h2>{lesson.title}</h2>
                                {lesson.description && (
                                    <p className="lesson-description">{lesson.description}</p>
                                )}
                            </div>
                            {!isCompleted ? (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleComplete}
                                    disabled={completing}
                                >
                                    <FiCheck /> {completing ? 'Marking...' : 'Mark Complete'}
                                </button>
                            ) : (
                                <span className="completed-tag">
                                    <FiCheck /> Completed
                                </span>
                            )}
                        </div>

                        {/* Navigation */}
                        <div className="lesson-navigation">
                            {prev ? (
                                <Link
                                    to={`/courses/${courseId}/lessons/${prev.id || prev.uuid}`}
                                    className="nav-btn prev"
                                >
                                    <FiChevronLeft />
                                    <div>
                                        <span className="nav-label">Previous</span>
                                        <span className="nav-title">{prev.title}</span>
                                    </div>
                                </Link>
                            ) : (
                                <div />
                            )}
                            {next && (
                                <Link
                                    to={`/courses/${courseId}/lessons/${next.id || next.uuid}`}
                                    className="nav-btn next"
                                >
                                    <div>
                                        <span className="nav-label">Next</span>
                                        <span className="nav-title">{next.title}</span>
                                    </div>
                                    <FiChevronRight />
                                </Link>
                            )}
                        </div>
                    </div>
                </main>

                {/* Sidebar */}
                <aside className={`lesson-sidebar ${sidebarOpen ? 'open' : ''}`}>
                    <div className="sidebar-header">
                        <h3>Course Content</h3>
                    </div>
                    <div className="sidebar-content">
                        {courseData?.sections?.map((section, sIndex) => (
                            <div key={sIndex} className="sidebar-section">
                                <div className="section-header">
                                    <span>{section.name}</span>
                                    <span className="section-count">{section.lessons.length}</span>
                                </div>
                                <div className="section-lessons">
                                    {section.lessons.map((sLesson) => (
                                        <Link
                                            key={sLesson.id || sLesson.uuid}
                                            to={`/courses/${courseId}/lessons/${sLesson.id || sLesson.uuid}`}
                                            className={`sidebar-lesson ${(sLesson.id === lesson.id || sLesson.uuid === lesson.uuid) ? 'active' : ''
                                                }`}
                                        >
                                            <span className="lesson-icon">
                                                {sLesson.is_completed ? (
                                                    <FiCheck className="completed" />
                                                ) : (
                                                    <FiPlay />
                                                )}
                                            </span>
                                            <span className="lesson-title">{sLesson.title}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default LessonPage;
