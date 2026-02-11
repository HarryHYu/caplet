import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NotFound = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-blue-600 dark:text-blue-400">404</h1>
        <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mt-4 mb-2">
          Page Not Found
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
          Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to={isAuthenticated ? '/courses' : '/'}
            className="btn-primary text-lg px-8 py-3"
          >
            {isAuthenticated ? 'Go to Courses' : 'Go Home'}
          </Link>
          {isAuthenticated && (
            <Link
              to="/classes"
              className="btn-secondary text-lg px-8 py-3"
            >
              Classes
            </Link>
          )}
          {!isAuthenticated && (
            <Link
              to="/courses"
              className="btn-secondary text-lg px-8 py-3"
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
