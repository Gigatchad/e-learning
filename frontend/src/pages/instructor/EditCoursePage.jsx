/**
 * Edit Course Page
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { courseAPI } from '../../services/api';
import CourseForm from './CourseForm';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const EditCoursePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const response = await courseAPI.getById(id);
                setCourse(response.data.data);
            } catch (error) {
                console.error('Error fetching course:', error);
                toast.error('Failed to load course');
                navigate('/instructor');
            } finally {
                setLoading(false);
            }
        };

        fetchCourse();
    }, [id, navigate]);

    const handleSubmit = async (formData, thumbnailFile) => {
        try {
            // 1. Update course details
            await courseAPI.update(id, formData);

            // 2. Upload thumbnail if changed
            if (thumbnailFile) {
                const thumbFormData = new FormData();
                thumbFormData.append('thumbnail', thumbnailFile);
                await courseAPI.uploadThumbnail(id, thumbFormData);
            }

            toast.success('Course updated successfully');
            navigate('/instructor');
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to update course';
            toast.error(message);
            throw error;
        }
    };

    if (loading) {
        return (
            <div className="page flex items-center justify-center">
                <LoadingSpinner size="lg" text="Loading course details..." />
            </div>
        );
    }

    return (
        <div className="page">
            <div className="container">
                <div className="mb-6">
                    <h1>Edit Course: {course.title}</h1>
                    <p className="text-muted">Update course information and settings</p>
                </div>

                <CourseForm
                    initialData={course}
                    onSubmit={handleSubmit}
                    isEditing={true}
                />
            </div>
        </div>
    );
};

export default EditCoursePage;
