/**
 * Admin Users List
 */

import { useState, useEffect } from 'react';
import { FiTrash2, FiEdit2, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { userAPI } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const AdminAttendants = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await userAPI.getAllUsers({ page, search, limit: 10 });
            setUsers(response.data.data);
            setPagination(response.data.pagination);
        } catch (error) {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page, search]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await userAPI.deleteUser(id);
            setUsers(users.filter((u) => u.id !== id));
            toast.success('User deleted');
        } catch (error) {
            toast.error('Failed to delete user');
        }
    };

    const handleRoleChange = async (user, newRole) => {
        try {
            await userAPI.updateUser(user.id, { role: newRole });
            setUsers(users.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
            toast.success('Role updated');
        } catch (error) {
            toast.error('Failed to update role');
        }
    };

    return (
        <div className="admin-card">
            <div className="admin-card-header">
                <h2>Users Management</h2>
                <div className="search-bar" style={{ maxWidth: '300px' }}>
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <>
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="avatar avatar-sm">
                                                    {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt={user.first_name} />
                                                    ) : (
                                                        <span>{user.first_name[0]}</span>
                                                    )}
                                                </div>
                                                <span className="font-semibold">
                                                    {user.first_name} {user.last_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{user.email}</td>
                                        <td>
                                            <select
                                                className="form-input"
                                                style={{ padding: '0.25rem 0.5rem', width: 'auto' }}
                                                value={user.role}
                                                onChange={(e) => handleRoleChange(user, e.target.value)}
                                            >
                                                <option value="student">Student</option>
                                                <option value="instructor">Instructor</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </td>
                                        <td>{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td>
                                            <button
                                                className="action-btn delete"
                                                onClick={() => handleDelete(user.id)}
                                                disabled={user.role === 'admin'} // Prevent deleting admins easily
                                            >
                                                <FiTrash2 />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="pagination">
                            <button
                                className="btn btn-secondary btn-sm"
                                disabled={!pagination.hasPrevPage}
                                onClick={() => setPage(page - 1)}
                            >
                                Previous
                            </button>
                            <span className="text-sm">
                                Page {pagination.currentPage} of {pagination.totalPages}
                            </span>
                            <button
                                className="btn btn-secondary btn-sm"
                                disabled={!pagination.hasNextPage}
                                onClick={() => setPage(page + 1)}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default AdminAttendants;
