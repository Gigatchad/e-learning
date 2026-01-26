/**
 * Login Page
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiMail, FiLock, FiEye, FiEyeOff, FiBookOpen } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import './AuthPages.css';

const loginSchema = z.object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(1, 'Password is required'),
});

const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isLoading } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);

    const from = location.state?.from || '/';

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data) => {
        const result = await login(data);
        if (result.success) {
            toast.success(`Welcome back, ${result.user.first_name}!`);
            navigate(from, { replace: true });
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
                        <h1>Welcome Back!</h1>
                        <p>Sign in to continue your learning journey and access your courses.</p>
                        <div className="auth-features">
                            <div className="auth-feature">
                                <span className="feature-icon">📚</span>
                                <span>Access 1,200+ courses</span>
                            </div>
                            <div className="auth-feature">
                                <span className="feature-icon">🎯</span>
                                <span>Track your progress</span>
                            </div>
                            <div className="auth-feature">
                                <span className="feature-icon">🏆</span>
                                <span>Earn certificates</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="auth-form-container">
                    <div className="auth-form-wrapper">
                        <div className="auth-form-header">
                            <h2>Sign In</h2>
                            <p>Enter your credentials to access your account</p>
                        </div>

                        <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
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

                            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={isLoading}>
                                {isLoading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>

                        <div className="auth-footer">
                            <p>
                                Don't have an account?{' '}
                                <Link to="/register">Create account</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
