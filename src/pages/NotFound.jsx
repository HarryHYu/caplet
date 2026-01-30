import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="card-fun text-center max-w-lg mx-auto p-10">
        <div className="text-8xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">404</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-2 mb-3">Page Not Found</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
          Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="btn-primary text-lg px-8 py-3 inline-flex items-center justify-center gap-2">🏠 Go Home</Link>
          <Link to="/courses" className="btn-secondary text-lg px-8 py-3 inline-flex items-center justify-center gap-2">📚 Browse Courses</Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

