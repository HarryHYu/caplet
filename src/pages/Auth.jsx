import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from '../components/LoginForm';

const Auth = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/courses" replace />;
  }

  return (
    <section className="min-h-[calc(100vh-9rem)] px-4 py-10 sm:py-14 flex items-center justify-center bg-white dark:bg-black">
      <div className="w-full max-w-lg">
        <LoginForm
          onSuccess={() => {
            navigate('/courses');
          }}
        />
      </div>
    </section>
  );
};

export default Auth;
