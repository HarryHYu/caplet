import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CoursesProvider } from './contexts/CoursesContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Contact from './pages/Contact';
import Tools from './pages/Tools';
import TaxCalculator from './pages/tools/TaxCalculator';
import BudgetPlanner from './pages/tools/BudgetPlanner';
import SavingsGoal from './pages/tools/SavingsGoal';
import LoanRepayment from './pages/tools/LoanRepayment';
import CompoundInterest from './pages/tools/CompoundInterest';
import MortgageCalculator from './pages/tools/MortgageCalculator';
import SuperContribution from './pages/tools/SuperContribution';
import GSTCalculator from './pages/tools/GSTCalculator';
import SalaryCalculator from './pages/tools/SalaryCalculator';
import EmergencyFund from './pages/tools/EmergencyFund';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import ModuleDetail from './pages/ModuleDetail';
import LessonPlayer from './pages/LessonPlayer';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Classes from './pages/Classes';
import ClassDetail from './pages/ClassDetail';
import Settings from './pages/Settings';
import SettingsProfile from './pages/SettingsProfile';
import SettingsAccount from './pages/SettingsAccount';
import UserProfile from './pages/UserProfile';
import Terms from './pages/Terms';
import Metrics from './pages/Metrics';
import NotFound from './pages/NotFound';

function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-surface-body flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-accent border-t-transparent animate-spin" />
    </div>
  );
}

function HomeOrRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Home />;
}

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CoursesProvider>
          <Router>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<HomeOrRedirect />} />
                  <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/tools" element={<Tools />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/tools/tax-calculator" element={<TaxCalculator />} />
                  <Route path="/tools/budget-planner" element={<BudgetPlanner />} />
                  <Route path="/tools/savings-goal" element={<SavingsGoal />} />
                  <Route path="/tools/loan-repayment" element={<LoanRepayment />} />
                  <Route path="/tools/compound-interest" element={<CompoundInterest />} />
                  <Route path="/tools/mortgage" element={<MortgageCalculator />} />
                  <Route path="/tools/super-contribution" element={<SuperContribution />} />
                  <Route path="/tools/gst" element={<GSTCalculator />} />
                  <Route path="/tools/salary" element={<SalaryCalculator />} />
                  <Route path="/tools/emergency-fund" element={<EmergencyFund />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/courses/:courseId" element={<CourseDetail />} />
                  <Route path="/courses/:courseId/modules/:moduleId" element={<ModuleDetail />} />
                  <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPlayer />} />
                  <Route path="/classes" element={<Classes />} />
                  <Route path="/classes/:classId" element={<RequireAuth><ClassDetail /></RequireAuth>} />
                  <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>}>
                    <Route index element={<Navigate to="/settings/profile" replace />} />
                    <Route path="profile" element={<SettingsProfile />} />
                    <Route path="account" element={<SettingsAccount />} />
                  </Route>
                  <Route path="/profile/:userId" element={<UserProfile />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/metrics" element={<Metrics />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </Router>
        </CoursesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
