/**
 * Not Found Page
 */

import { Link } from 'react-router-dom';
import { FiAlertCircle } from 'react-icons/fi';

const NotFoundPage = () => {
    return (
        <div className="page flex items-center justify-center" style={{ minHeight: '70vh' }}>
            <div className="text-center">
                <FiAlertCircle style={{ fontSize: '4rem', color: 'var(--primary-500)', marginBottom: '1rem' }} />
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>404</h1>
                <h2 style={{ marginBottom: '1rem' }}>Page Not Found</h2>
                <p className="text-muted mb-6">The page you are looking for does not exist or has been moved.</p>
                <Link to="/" className="btn btn-primary">
                    Go Home
                </Link>
            </div>
        </div>
    );
};

export default NotFoundPage;
