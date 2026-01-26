/**
 * Footer Component
 */

import { Link } from 'react-router-dom';
import { FiBookOpen, FiGithub, FiTwitter, FiLinkedin } from 'react-icons/fi';
import './Footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    {/* Brand */}
                    <div className="footer-brand">
                        <Link to="/" className="footer-logo">
                            <div className="logo-icon">
                                <FiBookOpen />
                            </div>
                            <span>EduPlatform</span>
                        </Link>
                        <p className="footer-description">
                            Empowering learners worldwide with high-quality courses from expert instructors.
                        </p>
                        <div className="footer-social">
                            <a href="#" aria-label="GitHub"><FiGithub /></a>
                            <a href="#" aria-label="Twitter"><FiTwitter /></a>
                            <a href="#" aria-label="LinkedIn"><FiLinkedin /></a>
                        </div>
                    </div>

                    {/* Links */}
                    <div className="footer-links">
                        <h4>Platform</h4>
                        <Link to="/courses">All Courses</Link>
                        <Link to="/courses?level=beginner">For Beginners</Link>
                        <a href="#">Become an Instructor</a>
                        <a href="#">Enterprise</a>
                    </div>

                    <div className="footer-links">
                        <h4>Resources</h4>
                        <a href="#">Blog</a>
                        <a href="#">Help Center</a>
                        <a href="#">Community</a>
                        <a href="#">API Documentation</a>
                    </div>

                    <div className="footer-links">
                        <h4>Company</h4>
                        <a href="#">About Us</a>
                        <a href="#">Careers</a>
                        <a href="#">Privacy Policy</a>
                        <a href="#">Terms of Service</a>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© {currentYear} EduPlatform. All rights reserved.</p>
                    <p className="footer-tagline">Made with ❤️ for learners everywhere</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
