/**
 * Admin Categories Management
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FiTrash2, FiEdit2, FiPlus, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { categoryAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const { register, handleSubmit, reset, setValue } = useForm();

    const fetchCategories = async () => {
        try {
            const response = await categoryAPI.getAll();
            // Flatten categories for simpler display (handling children is complex for MVP)
            // For now, let's just show top-level or flattened list
            setCategories(response.data.data || []);
        } catch (error) {
            toast.error('Failed to load categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const openModal = (category = null) => {
        setEditingCategory(category);
        if (category) {
            setValue('name', category.name);
            setValue('slug', category.slug);
            setValue('parent_id', category.parent_id || '');
        } else {
            reset({ name: '', slug: '', parent_id: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
        reset();
    };

    const onSubmit = async (data) => {
        try {
            // Filter out empty parent_id
            const payload = { ...data };
            if (!payload.parent_id) delete payload.parent_id;

            if (editingCategory) {
                await categoryAPI.update(editingCategory.id, payload);
                toast.success('Category updated');
            } else {
                await categoryAPI.create(payload);
                toast.success('Category created');
            }
            closeModal();
            fetchCategories();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure? This might act weird if it has subcategories.')) return;
        try {
            await categoryAPI.delete(id);
            setCategories(categories.filter((c) => c.id !== id));
            toast.success('Category deleted');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete');
        }
    };

    return (
        <div className="admin-card">
            <div className="admin-card-header">
                <h2>Categories</h2>
                <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
                    <FiPlus /> Add Category
                </button>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Slug</th>
                                <th>Parent ID</th>
                                <th>Courses</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((cat) => (
                                <tr key={cat.id}>
                                    <td className="font-semibold">{cat.name}</td>
                                    <td>{cat.slug}</td>
                                    <td>{cat.parent_id || '-'}</td>
                                    <td>{cat.course_count || 0}</td>
                                    <td>
                                        <div className="actions">
                                            <button className="action-btn edit" onClick={() => openModal(cat)}>
                                                <FiEdit2 />
                                            </button>
                                            <button className="action-btn delete" onClick={() => handleDelete(cat.id)}>
                                                <FiTrash2 />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">
                                {editingCategory ? 'Edit Category' : 'New Category'}
                            </h2>
                            <button className="modal-close" onClick={closeModal}>
                                <FiX />
                            </button>
                        </div>
                        <div className="modal-body">
                            <form id="catForm" onSubmit={handleSubmit(onSubmit)}>
                                <div className="form-group">
                                    <label className="form-label">Name</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        {...register('name', { required: true })}
                                        placeholder="e.g. Web Development"
                                    />
                                </div>
                                {/* Slug is usually auto-generated on backend if omitted, but let's allow editing */}
                                {editingCategory && (
                                    <div className="form-group">
                                        <label className="form-label">Slug</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            {...register('slug')}
                                        />
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Parent Category</label>
                                    <select className="form-input form-select" {...register('parent_id')}>
                                        <option value="">None (Top Level)</option>
                                        {categories
                                            .filter((c) => c.id !== editingCategory?.id) // Prevent self-parenting loop in UI
                                            .map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                            <button type="submit" form="catForm" className="btn btn-primary">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCategories;
