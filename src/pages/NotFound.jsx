import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NotFound = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center px-4 page-section-light">
      <div className="text-center max-w-md mx-auto">
        <span className="section-kicker mb-4 text-red-500">Page Not Found</span>
        <h1 className="text-[64px] md:text-[80px] font-black text-black dark:text-white leading-none mb-4">
          404
        </h1>
        <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.25em] mb-6">
          Page not found.
        </p>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-8 font-medium uppercase tracking-tight">
          The page you're looking for doesn't exist or has been moved. Try navigating back to the home page or courses.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={isAuthenticated ? '/courses' : '/'}
            className="btn-primary text-[10px] px-8 py-3"
          >
            {isAuthenticated ? 'Go to Courses' : 'Go Home'}
          </Link>
          {isAuthenticated && (
            <Link
              to="/classes"
              className="btn-secondary text-[10px] px-8 py-3"
            >
              Classes
            </Link>
          )}
          {!isAuthenticated && (
            <Link
              to="/courses"
              className="btn-secondary text-[10px] px-8 py-3"
            >
              Browse Courses
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
