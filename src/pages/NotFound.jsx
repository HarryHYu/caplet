import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NotFound = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-body selection:bg-accent selection:text-white">
      <div className="text-center max-w-md mx-auto reveal-text">
        <span className="section-kicker !text-red-500 mb-6">Protocol Error</span>
        <h1 className="text-[80px] md:text-[120px] font-serif italic text-text-primary leading-none mb-4">
          404
        </h1>
        <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.4em] mb-8">
          Page not found. The requested node does not exist within this registry.
        </p>
        <p className="text-sm text-text-muted font-medium leading-relaxed mb-12">
          The page you're looking for doesn't exist or has been moved. Try navigating back to the home page or courses.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to={isAuthenticated ? '/courses' : '/'}
            className="btn-primary text-[10px] px-10 py-5"
          >
            {isAuthenticated ? 'Return to Curriculum' : 'Return to Index'}
          </Link>
          {isAuthenticated && (
            <Link
              to="/classes"
              className="btn-secondary text-[10px] px-10 py-5"
            >
              Academy
            </Link>
          )}
          {!isAuthenticated && (
            <Link
              to="/courses"
              className="btn-secondary text-[10px] px-10 py-5"
            >
              Browse Curriculum
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
