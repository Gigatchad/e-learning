/**
 * Register Page
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiBookOpen } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import './AuthPages.css';

const registerSchema = z.object({
    first_name: z.string().min(2, 'First name must be at least 2 characters'),
    last_name: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirm_password: z.string(),
    role: z.enum(['student', 'instructor']),
}).refine((data) => data.password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
});

const RegisterPage = () => {
    const navigate = useNavigate();
    const { register: registerUser, isLoading } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: 'student',
        },
    });

    const onSubmit = async (data) => {
        const { confirm_password, ...userData } = data;
        const result = await registerUser(userData);
        if (result.success) {
            toast.success('Account created successfully!');
            navigate('/');
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                {/* Left Side - Branding */}
                <div className="auth-branding">
                    <div className="auth-branding-content">
                        <div className="auth-logo">
                            <FiBookOpen />
                        </div>
                        <h1>Start Learning Today</h1>
                        <p>Join thousands of learners and start your journey to mastery.</p>
                        <div className="auth-features">
                            <div className="auth-feature">
                                <span className="feature-icon">🚀</span>
                                <span>Learn at your own pace</span>
                            </div>
                            <div className="auth-feature">
                                <span className="feature-icon">👨‍🏫</span>
                                <span>Expert instructors</span>
                            </div>
                            <div className="auth-feature">
                                <span className="feature-icon">💼</span>
                                <span>Career-ready skills</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="auth-form-container">
                    <div className="auth-form-wrapper">
                        <div className="auth-form-header">
                            <h2>Create Account</h2>
                            <p>Fill in your details to get started</p>
                        </div>

                        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">First Name</label>
                                    <div className="input-with-icon">
                                        <FiUser className="input-icon" />
                                        <input
                                            type="text"
                                            className={`form-input ${errors.first_name ? 'error' : ''}`}
                                            placeholder="John"
                                            {...register('first_name')}
                                        />
                                    </div>
                                    {errors.first_name && <p className="form-error">{errors.first_name.message}</p>}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Last Name</label>
                                    <div className="input-with-icon">
                                        <FiUser className="input-icon" />
                                        <input
                                            type="text"
                                            className={`form-input ${errors.last_name ? 'error' : ''}`}
                                            placeholder="Doe"
                                            {...register('last_name')}
                                        />
                                    </div>
                                    {errors.last_name && <p className="form-error">{errors.last_name.message}</p>}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <div className="input-with-icon">
                                    <FiMail className="input-icon" />
                                    <input
                                        type="email"
                                        className={`form-input ${errors.email ? 'error' : ''}`}
                                        placeholder="you@example.com"
                                        {...register('email')}
                                    />
                                </div>
                                {errors.email && <p className="form-error">{errors.email.message}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">I want to</label>
                                <div className="role-selector">
                                    <label className="role-option">
                                        <input type="radio" value="student" {...register('role')} />
                                        <div className="role-card">
                                            <span className="role-emoji">📚</span>
                                            <span className="role-title">Learn</span>
                                            <span className="role-desc">Access courses and learn new skills</span>
                                        </div>
                                    </label>
                                    <label className="role-option">
                                        <input type="radio" value="instructor" {...register('role')} />
                                        <div className="role-card">
                                            <span className="role-emoji">🎓</span>
                                            <span className="role-title">Teach</span>
                                            <span className="role-desc">Create and sell your own courses</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <div className="input-with-icon">
                                    <FiLock className="input-icon" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className={`form-input ${errors.password ? 'error' : ''}`}
                                        placeholder="••••••••"
                                        {...register('password')}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <FiEyeOff /> : <FiEye />}
                                    </button>
                                </div>
                                {errors.password && <p className="form-error">{errors.password.message}</p>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Confirm Password</label>
                                <div className="input-with-icon">
                                    <FiLock className="input-icon" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className={`form-input ${errors.confirm_password ? 'error' : ''}`}
                                        placeholder="••••••••"
                                        {...register('confirm_password')}
                                    />
                                </div>
                                {errors.confirm_password && <p className="form-error">{errors.confirm_password.message}</p>}
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={isLoading}>
                                {isLoading ? 'Creating account...' : 'Create Account'}
                            </button>
                        </form>

                        <div className="auth-footer">
                            <p>
                                Already have an account?{' '}
                                <Link to="/login">Sign in</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
