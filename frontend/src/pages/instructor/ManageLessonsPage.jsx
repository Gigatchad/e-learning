/**
 * Manage Lessons Page
 * Interface for instructors to manage course curriculum
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    FiPlus, FiEdit2, FiTrash2, FiVideo, FiFileText, FiMove,
    FiChevronDown, FiChevronUp, FiCheck, FiX, FiUpload
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { lessonAPI, courseAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './ManageLessonsPage.css';

const lessonSchema = z.object({
    title: z.string().min(3, 'Title is required'),
    description: z.string().optional(),
    section_name: z.string().min(1, 'Section is required'),
    content_type: z.enum(['video', 'article']),
    article_content: z.string().optional(),
    is_preview: z.boolean().default(false),
    video_duration: z.number().optional(),
});

const ManageLessonsPage = () => {
    const { id: courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState(null);
    const [videoFile, setVideoFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(lessonSchema),
        defaultValues: {
            content_type: 'video',
            is_preview: false,
        },
    });

    const contentType = watch('content_type');

    useEffect(() => {
        fetchCourseAndLessons();
    }, [courseId]);

    const fetchCourseAndLessons = async () => {
        try {
            const [courseRes, lessonsRes] = await Promise.all([
                courseAPI.getById(courseId),
                lessonAPI.getCourseLessons(courseId),
            ]);
            setCourse(courseRes.data.data);
            setSections(lessonsRes.data.data.sections || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load lessons');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (lesson = null) => {
        if (lesson) {
            setEditingLesson(lesson);
            reset({
                title: lesson.title,
                description: lesson.description || '',
                section_name: lesson.section_name,
                content_type: lesson.content_type,
                article_content: lesson.article_content || '',
                is_preview: lesson.is_preview,
                video_duration: lesson.video_duration || 0,
            });
        } else {
            setEditingLesson(null);
            reset({
                title: '',
                description: '',
                section_name: '',
                content_type: 'video',
                article_content: '',
                is_preview: false,
                video_duration: 0,
            });
        }
        setVideoFile(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingLesson(null);
        setVideoFile(null);
    };

    const onSubmit = async (data) => {
        setUploading(true);
        try {
            let lessonId;

            if (editingLesson) {
                // Update
                const response = await lessonAPI.update(editingLesson.id, data);
                lessonId = response.data.data.id;
                toast.success('Lesson updated');
            } else {
                // Create
                const response = await lessonAPI.create(courseId, data);
                lessonId = response.data.data.id;
                toast.success('Lesson created');
            }

            // Upload video if selected
            if (videoFile && data.content_type === 'video') {
                const formData = new FormData();
                formData.append('video', videoFile);
                await lessonAPI.uploadVideo(lessonId, formData);
                toast.success('Video uploaded successfully');
            }

            closeModal();
            fetchCourseAndLessons();
        } catch (error) {
            console.error('Submission error:', error);
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (lessonId) => {
        if (!window.confirm('Are you sure you want to delete this lesson?')) return;
        try {
            await lessonAPI.delete(lessonId);
            toast.success('Lesson deleted');
            fetchCourseAndLessons();
        } catch (error) {
            toast.error('Failed to delete lesson');
        }
    };

    if (loading) {
        return (
            <div className="page flex items-center justify-center">
                <LoadingSpinner size="lg" text="Loading lessons..." />
            </div>
        );
    }

    return (
        <div className="manage-lessons-page page">
            <div className="container">
                <div className="page-header">
                    <div>
                        <h1>Curriculum: {course.title}</h1>
                        <p className="text-muted">Desgin your course structure and add content</p>
                    </div>
                    <div className="header-actions">
                        <Link to="/instructor" className="btn btn-secondary">
                            Back to Dashboard
                        </Link>
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            <FiPlus /> Add New Lesson
                        </button>
                    </div>
                </div>

                {sections.length === 0 ? (
                    <div className="empty-state">
                        <FiFileText />
                        <h3>No lessons yet</h3>
                        <p>Start building your course curriculum by adding your first lesson.</p>
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            <FiPlus /> Add First Lesson
                        </button>
                    </div>
                ) : (
                    <div className="curriculum-list">
                        {sections.map((section, sIndex) => (
                            <div key={sIndex} className="section-card">
                                <div className="section-header">
                                    <h3>Section: {section.name}</h3>
                                    <span className="lesson-count">{section.lessons.length} lessons</span>
                                </div>

                                <div className="lessons-list">
                                    {section.lessons.map((lesson) => (
                                        <div key={lesson.id} className="lesson-row">
                                            <div className="lesson-info">
                                                <span className="lesson-icon">
                                                    {lesson.content_type === 'video' ? <FiVideo /> : <FiFileText />}
                                                </span>
                                                <div>
                                                    <span className="lesson-title">{lesson.title}</span>
                                                    {lesson.is_preview && <span className="preview-badge">Preview</span>}
                                                </div>
                                            </div>

                                            <div className="lesson-actions">
                                                <button
                                                    className="action-btn edit"
                                                    onClick={() => openModal(lesson)}
                                                    title="Edit Lesson"
                                                >
                                                    <FiEdit2 />
                                                </button>
                                                <button
                                                    className="action-btn delete"
                                                    onClick={() => handleDelete(lesson.id)}
                                                    title="Delete Lesson"
                                                >
                                                    <FiTrash2 />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button
                                        className="add-lesson-btn"
                                        onClick={() => {
                                            setEditingLesson(null);
                                            reset({
                                                section_name: section.name,
                                                content_type: 'video',
                                                is_preview: false,
                                                title: '',
                                                description: ''
                                            });
                                            setIsModalOpen(true);
                                        }}
                                    >
                                        <FiPlus /> Add lesson to this section
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h2 className="modal-title">
                                    {editingLesson ? 'Edit Lesson' : 'Add New Lesson'}
                                </h2>
                                <button className="modal-close" onClick={closeModal}>
                                    <FiX />
                                </button>
                            </div>

                            <div className="modal-body">
                                <form id="lessonForm" onSubmit={handleSubmit(onSubmit)}>
                                    <div className="form-group">
                                        <label className="form-label">Lesson Title</label>
                                        <input
                                            type="text"
                                            className={`form-input ${errors.title ? 'error' : ''}`}
                                            {...register('title')}
                                            placeholder="e.g. Introduction to React"
                                        />
                                        {errors.title && <p className="form-error">{errors.title.message}</p>}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Section</label>
                                        <input
                                            type="text"
                                            className={`form-input ${errors.section_name ? 'error' : ''}`}
                                            {...register('section_name')}
                                            placeholder="e.g. Getting Started"
                                            list="sections-list"
                                        />
                                        <datalist id="sections-list">
                                            {sections.map((s, i) => (
                                                <option key={i} value={s.name} />
                                            ))}
                                        </datalist>
                                        {errors.section_name && <p className="form-error">{errors.section_name.message}</p>}
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Content Type</label>
                                            <select
                                                className="form-input form-select"
                                                {...register('content_type')}
                                            >
                                                <option value="video">Video</option>
                                                <option value="article">Article/Text</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Options</label>
                                            <div className="checkbox-wrapper">
                                                <label className="checkbox-label">
                                                    <input type="checkbox" {...register('is_preview')} />
                                                    <span className="checkbox-text">Free Preview</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {contentType === 'video' ? (
                                        <div className="form-group">
                                            <label className="form-label">Video File</label>
                                            <input
                                                type="file"
                                                className="form-input"
                                                accept="video/*"
                                                onChange={(e) => setVideoFile(e.target.files?.[0])}
                                            />
                                            <p className="form-hint">
                                                {editingLesson?.video_url
                                                    ? 'Upload new video to replace existing one'
                                                    : 'Upload mp4, mov, or avi file'}
                                            </p>

                                            <div className="form-group mt-2">
                                                <label className="form-label">Duration (seconds)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    {...register('video_duration', { valueAsNumber: true })}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="form-group">
                                            <label className="form-label">Article Content</label>
                                            <textarea
                                                className="form-input"
                                                rows="6"
                                                {...register('article_content')}
                                                placeholder="Write your lesson content here..."
                                            />
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label className="form-label">Description (Optional)</label>
                                        <textarea
                                            className="form-input"
                                            rows="2"
                                            {...register('description')}
                                        />
                                    </div>
                                </form>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={closeModal}
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="lessonForm"
                                    className="btn btn-primary"
                                    disabled={uploading}
                                >
                                    {uploading ? 'Saving...' : 'Save Lesson'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageLessonsPage;
