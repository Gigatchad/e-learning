/**
 * Create Course Page
 */

import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { courseAPI } from '../../services/api';
import CourseForm from './CourseForm';

const CreateCoursePage = () => {
    const navigate = useNavigate();

    const handleSubmit = async (formData, thumbnailFile) => {
        try {
            // 1. Create course
            const response = await courseAPI.create(formData);
            const newCourse = response.data.data;

            // 2. Upload thumbnail if provided
            if (thumbnailFile) {
                const thumbFormData = new FormData();
                thumbFormData.append('thumbnail', thumbnailFile);
                await courseAPI.uploadThumbnail(newCourse.id, thumbFormData);
            }

            toast.success('Course created successfully');
            navigate(`/instructor/courses/${newCourse.id}/lessons`);
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to create course';
            toast.error(message);
            throw error;
        }
    };

    return (
        <div className="page">
            <div className="container">
                <div className="mb-6">
                    <h1>Create New Course</h1>
                    <p className="text-muted">Start building your new course</p>
                </div>

                <CourseForm onSubmit={handleSubmit} />
            </div>
        </div>
    );
};

export default CreateCoursePage;
