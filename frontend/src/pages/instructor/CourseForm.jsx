/**
 * Course Form Component
 * Reusable form for creating and editing courses
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiSave, FiUpload, FiTrash2, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { categoryAPI } from '../../services/api';
import './CourseForm.css';

const courseSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    short_description: z.string().max(150, 'Short description must be less than 150 characters').optional(),
    category_id: z.string().min(1, 'Category is required'),
    level: z.enum(['beginner', 'intermediate', 'advanced', 'all_levels']),
    language: z.string().default('English'),
    price: z.number().min(0, 'Price must be 0 or greater'),
    discount_price: z.number().min(0).optional(),
    is_published: z.boolean().default(false),
    requirements: z.array(z.string()).optional(),
    what_you_learn: z.array(z.string()).optional(),
});

const CourseForm = ({ initialData, onSubmit, isEditing = false }) => {
    const [categories, setCategories] = useState([]);
    const [thumbnailPreview, setThumbnailPreview] = useState(initialData?.thumbnail_url || null);
    const [thumbnailFile, setThumbnailFile] = useState(null);
    const [requirements, setRequirements] = useState(initialData?.requirements || ['']);
    const [whatYouLearn, setWhatYouLearn] = useState(initialData?.what_you_learn || ['']);
    const [submitting, setSubmitting] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
    } = useForm({
        resolver: zodResolver(courseSchema),
        defaultValues: {
            title: initialData?.title || '',
            description: initialData?.description || '',
            short_description: initialData?.short_description || '',
            category_id: initialData?.category_id?.toString() || '',
            level: initialData?.level || 'all_levels',
            language: initialData?.language || 'English',
            price: initialData?.price ? parseFloat(initialData.price) : 0,
            discount_price: initialData?.discount_price ? parseFloat(initialData.discount_price) : 0,
            is_published: initialData?.is_published || false,
        },
    });

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const response = await categoryAPI.getAll();
                setCategories(response.data.data);
            } catch (error) {
                console.error('Error fetching categories:', error);
                toast.error('Failed to load categories');
            }
        };
        fetchCategories();
    }, []);

    const handleThumbnailChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Image must be less than 5MB');
                return;
            }
            setThumbnailFile(file);
            setThumbnailPreview(URL.createObjectURL(file));
        }
    };

    const handleArrayChange = (setter, index, value) => {
        setter((prev) => {
            const newArray = [...prev];
            newArray[index] = value;
            return newArray;
        });
    };

    const addArrayItem = (setter) => {
        setter((prev) => [...prev, '']);
    };

    const removeArrayItem = (setter, index) => {
        setter((prev) => prev.filter((_, i) => i !== index));
    };

    const onFormSubmit = async (data) => {
        setSubmitting(true);
        try {
            // Clean up array fields
            const cleanRequirements = requirements.filter((item) => item.trim() !== '');
            const cleanWhatYouLearn = whatYouLearn.filter((item) => item.trim() !== '');

            const formData = {
                ...data,
                requirements: cleanRequirements,
                what_you_learn: cleanWhatYouLearn,
            };

            await onSubmit(formData, thumbnailFile);
        } catch (error) {
            console.error('Form submission error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="course-form" onSubmit={handleSubmit(onFormSubmit)}>
            <div className="form-section">
                <h3>Basic Information</h3>

                <div className="form-group">
                    <label className="form-label">Course Title</label>
                    <input
                        type="text"
                        className={`form-input ${errors.title ? 'error' : ''}`}
                        placeholder="e.g., Complete Web Development Bootcamp"
                        {...register('title')}
                    />
                    {errors.title && <p className="form-error">{errors.title.message}</p>}
                </div>

                <div className="form-group">
                    <label className="form-label">Short Description</label>
                    <input
                        type="text"
                        className={`form-input ${errors.short_description ? 'error' : ''}`}
                        placeholder="Brief summary of your course"
                        {...register('short_description')}
                    />
                    <p className="form-hint">Max 150 characters. Appears in course cards.</p>
                    {errors.short_description && <p className="form-error">{errors.short_description.message}</p>}
                </div>

                <div className="form-group">
                    <label className="form-label">Full Description</label>
                    <textarea
                        className={`form-input ${errors.description ? 'error' : ''}`}
                        rows="6"
                        placeholder="Detailed description of your course..."
                        {...register('description')}
                    />
                    {errors.description && <p className="form-error">{errors.description.message}</p>}
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Category</label>
                        <select
                            className={`form-input form-select ${errors.category_id ? 'error' : ''}`}
                            {...register('category_id')}
                        >
                            <option value="">Select Category</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                        {errors.category_id && <p className="form-error">{errors.category_id.message}</p>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Level</label>
                        <select
                            className="form-input form-select"
                            {...register('level')}
                        >
                            <option value="all_levels">All Levels</option>
                            <option value="beginner">Beginner</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="advanced">Advanced</option>
                        </select>
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Language</label>
                        <input
                            type="text"
                            className="form-input"
                            {...register('language')}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Status</label>
                        <div className="checkbox-wrapper">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    {...register('is_published')}
                                />
                                <span className="checkbox-text">Publish this course</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="form-section">
                <h3>Pricing</h3>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Price ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={`form-input ${errors.price ? 'error' : ''}`}
                            {...register('price', { valueAsNumber: true })}
                        />
                        {errors.price && <p className="form-error">{errors.price.message}</p>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Discount Price ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={`form-input ${errors.discount_price ? 'error' : ''}`}
                            {...register('discount_price', { valueAsNumber: true })}
                        />
                        {errors.discount_price && <p className="form-error">{errors.discount_price.message}</p>}
                    </div>
                </div>
            </div>

            <div className="form-section">
                <h3>Course Media</h3>
                <div className="form-group">
                    <label className="form-label">Course Thumbnail</label>
                    <div className="thumbnail-upload">
                        <div className="thumbnail-preview">
                            {thumbnailPreview ? (
                                <img src={thumbnailPreview} alt="Preview" />
                            ) : (
                                <div className="placeholder">No Image</div>
                            )}
                        </div>
                        <div className="upload-controls">
                            <label className="btn btn-secondary">
                                <FiUpload /> Upload Image
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleThumbnailChange}
                                    hidden
                                />
                            </label>
                            <p className="form-hint">Recommended size: 1280x720 (16:9). Max 5MB.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="form-section">
                <h3>What Students Will Learn</h3>
                <div className="dynamic-list">
                    {whatYouLearn.map((item, index) => (
                        <div key={index} className="dynamic-item">
                            <input
                                type="text"
                                className="form-input"
                                value={item}
                                onChange={(e) => handleArrayChange(setWhatYouLearn, index, e.target.value)}
                                placeholder="e.g., Build full-stack applications"
                            />
                            <button
                                type="button"
                                className="remove-btn"
                                onClick={() => removeArrayItem(setWhatYouLearn, index)}
                            >
                                <FiTrash2 />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => addArrayItem(setWhatYouLearn)}
                    >
                        <FiPlus /> Add Learning Objective
                    </button>
                </div>
            </div>

            <div className="form-section">
                <h3>Requirements</h3>
                <div className="dynamic-list">
                    {requirements.map((item, index) => (
                        <div key={index} className="dynamic-item">
                            <input
                                type="text"
                                className="form-input"
                                value={item}
                                onChange={(e) => handleArrayChange(setRequirements, index, e.target.value)}
                                placeholder="e.g., Basic JavaScript knowledge"
                            />
                            <button
                                type="button"
                                className="remove-btn"
                                onClick={() => removeArrayItem(setRequirements, index)}
                            >
                                <FiTrash2 />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => addArrayItem(setRequirements)}
                    >
                        <FiPlus /> Add Requirement
                    </button>
                </div>
            </div>

            <div className="form-actions">
                <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                    <FiSave /> {submitting ? 'Saving...' : isEditing ? 'Update Course' : 'Create Course'}
                </button>
            </div>
        </form>
    );
};

export default CourseForm;
