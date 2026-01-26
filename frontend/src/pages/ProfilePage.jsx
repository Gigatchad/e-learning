/**
 * Profile Page
 * User profile management
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiUser, FiMail, FiCamera, FiLock, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { userAPI, authAPI } from '../services/api';
import './ProfilePage.css';

const profileSchema = z.object({
    first_name: z.string().min(2, 'First name must be at least 2 characters'),
    last_name: z.string().min(2, 'Last name must be at least 2 characters'),
    bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

const ProfilePage = () => {
    const { user, updateUser } = useAuthStore();
    const [activeTab, setActiveTab] = useState('profile');
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const {
        register: registerProfile,
        handleSubmit: handleProfileSubmit,
        formState: { errors: profileErrors },
    } = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
            bio: user?.bio || '',
        },
    });

    const {
        register: registerPassword,
        handleSubmit: handlePasswordSubmit,
        formState: { errors: passwordErrors },
        reset: resetPassword,
    } = useForm({
        resolver: zodResolver(passwordSchema),
    });

    const onProfileSubmit = async (data) => {
        setSavingProfile(true);
        try {
            const response = await userAPI.updateProfile(data);
            updateUser(response.data.data);
            toast.success('Profile updated successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setSavingProfile(false);
        }
    };

    const onPasswordSubmit = async (data) => {
        setSavingPassword(true);
        try {
            await authAPI.changePassword(data);
            toast.success('Password changed successfully');
            resetPassword();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setSavingPassword(false);
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            const response = await userAPI.uploadAvatar(formData);
            updateUser({ avatar_url: response.data.data.avatar_url });
            toast.success('Avatar updated successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to upload avatar');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const getInitials = () => {
        return `${user?.first_name?.charAt(0) || ''}${user?.last_name?.charAt(0) || ''}`.toUpperCase();
    };

    return (
        <div className="profile-page page">
            <div className="container">
                <div className="profile-header">
                    <h1>My Profile</h1>
                    <p>Manage your account settings and preferences</p>
                </div>

                <div className="profile-layout">
                    {/* Sidebar */}
                    <aside className="profile-sidebar">
                        <div className="profile-avatar-section">
                            <div className="profile-avatar">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt={user.first_name} />
                                ) : (
                                    <span>{getInitials()}</span>
                                )}
                                <label className="avatar-upload-btn">
                                    <FiCamera />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        disabled={uploadingAvatar}
                                    />
                                </label>
                            </div>
                            <h3>{user?.first_name} {user?.last_name}</h3>
                            <p className="profile-email">{user?.email}</p>
                            <span className="badge badge-primary">{user?.role}</span>
                        </div>

                        <nav className="profile-nav">
                            <button
                                className={`profile-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                                onClick={() => setActiveTab('profile')}
                            >
                                <FiUser /> Profile Settings
                            </button>
                            <button
                                className={`profile-nav-item ${activeTab === 'password' ? 'active' : ''}`}
                                onClick={() => setActiveTab('password')}
                            >
                                <FiLock /> Change Password
                            </button>
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="profile-main">
                        {activeTab === 'profile' && (
                            <div className="profile-card">
                                <div className="profile-card-header">
                                    <h2>Profile Settings</h2>
                                    <p>Update your personal information</p>
                                </div>
                                <form onSubmit={handleProfileSubmit(onProfileSubmit)}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">First Name</label>
                                            <input
                                                type="text"
                                                className={`form-input ${profileErrors.first_name ? 'error' : ''}`}
                                                {...registerProfile('first_name')}
                                            />
                                            {profileErrors.first_name && (
                                                <p className="form-error">{profileErrors.first_name.message}</p>
                                            )}
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Last Name</label>
                                            <input
                                                type="text"
                                                className={`form-input ${profileErrors.last_name ? 'error' : ''}`}
                                                {...registerProfile('last_name')}
                                            />
                                            {profileErrors.last_name && (
                                                <p className="form-error">{profileErrors.last_name.message}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <div className="input-with-icon">
                                            <FiMail className="input-icon" />
                                            <input
                                                type="email"
                                                className="form-input"
                                                value={user?.email || ''}
                                                disabled
                                                style={{ paddingLeft: '2.75rem' }}
                                            />
                                        </div>
                                        <p className="form-hint">Email cannot be changed</p>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Bio</label>
                                        <textarea
                                            className={`form-input ${profileErrors.bio ? 'error' : ''}`}
                                            rows="4"
                                            placeholder="Tell us about yourself..."
                                            {...registerProfile('bio')}
                                        />
                                        {profileErrors.bio && (
                                            <p className="form-error">{profileErrors.bio.message}</p>
                                        )}
                                    </div>

                                    <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                                        <FiSave /> {savingProfile ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'password' && (
                            <div className="profile-card">
                                <div className="profile-card-header">
                                    <h2>Change Password</h2>
                                    <p>Update your password to keep your account secure</p>
                                </div>
                                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
                                    <div className="form-group">
                                        <label className="form-label">Current Password</label>
                                        <input
                                            type="password"
                                            className={`form-input ${passwordErrors.currentPassword ? 'error' : ''}`}
                                            {...registerPassword('currentPassword')}
                                        />
                                        {passwordErrors.currentPassword && (
                                            <p className="form-error">{passwordErrors.currentPassword.message}</p>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">New Password</label>
                                        <input
                                            type="password"
                                            className={`form-input ${passwordErrors.newPassword ? 'error' : ''}`}
                                            {...registerPassword('newPassword')}
                                        />
                                        {passwordErrors.newPassword && (
                                            <p className="form-error">{passwordErrors.newPassword.message}</p>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Confirm New Password</label>
                                        <input
                                            type="password"
                                            className={`form-input ${passwordErrors.confirmPassword ? 'error' : ''}`}
                                            {...registerPassword('confirmPassword')}
                                        />
                                        {passwordErrors.confirmPassword && (
                                            <p className="form-error">{passwordErrors.confirmPassword.message}</p>
                                        )}
                                    </div>

                                    <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                                        <FiLock /> {savingPassword ? 'Changing...' : 'Change Password'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
