import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NotFound = () => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-24 pb-16 bg-surface-body selection:bg-accent selection:text-white">
      <div className="text-center max-w-md mx-auto">
        <p className="font-hand text-2xl text-accent mb-1 -rotate-2">well, this is awkward</p>
        <h1 className="font-display font-extrabold text-text-primary text-[clamp(5rem,18vw,10rem)] leading-none tracking-[-0.04em]">
          404
        </h1>
        <p className="text-base text-text-muted leading-relaxed mt-4 mb-10">
          This page does not exist, or it may have moved. Head back home, or browse the courses.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="btn-primary">
            {isAuthenticated ? 'Go to dashboard' : 'Go home'}
          </Link>
          <Link to="/courses" className="btn-secondary">
            Browse courses
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
