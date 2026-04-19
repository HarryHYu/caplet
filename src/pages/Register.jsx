import { Navigate } from 'react-router-dom';

/** Email/password registration was removed; sign-in is via Google on /login. */
const Register = () => <Navigate to="/login" replace />;

export default Register;
