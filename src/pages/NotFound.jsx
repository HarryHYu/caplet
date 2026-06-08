import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NotFound = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-16 bg-surface-body selection:bg-accent selection:text-white">
      <div className="text-center max-w-md mx-auto reveal-text">
        <span className="section-kicker mb-6">Page not found</span>
        <h1 className="text-[80px] md:text-[120px] font-serif italic text-text-primary leading-none mb-4">
          404
        </h1>
        <p className="text-sm text-text-muted leading-relaxed mb-12">
          This page doesn&apos;t exist or may have moved. Head back home or browse our courses.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="btn-primary text-sm px-10 py-5"
          >
            {isAuthenticated ? 'Go to dashboard' : 'Go home'}
          </Link>
          <Link
            to="/courses"
            className="btn-secondary text-sm px-10 py-5"
          >
            Browse courses
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
