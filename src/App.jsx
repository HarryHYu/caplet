import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CoursesProvider } from './contexts/CoursesContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LayoutProvider, useLayout } from './contexts/LayoutContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DemoApp from './pages/DemoApp';
import Footer from './components/Footer';
import Home from './pages/Home';
import Contact from './pages/Contact';
import FinancialTools from './pages/FinancialTools';
import EduTools from './pages/EduTools';
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
import NetWorth from './pages/tools/NetWorth';
import InflationCalculator from './pages/tools/InflationCalculator';
import CreditCardPayoff from './pages/tools/CreditCardPayoff';
import DebtSequencer from './pages/tools/DebtSequencer';
import ROICalculator from './pages/tools/ROICalculator';
import RentVsBuy from './pages/tools/RentVsBuy';
import DebtToIncome from './pages/tools/DebtToIncome';
import BreakEven from './pages/tools/BreakEven';
import FIRENumber from './pages/tools/FIRENumber';
import RuleOf72 from './pages/tools/RuleOf72';
import CapitalGains from './pages/tools/CapitalGains';
import FinancialTwin from './pages/tools/FinancialTwin';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import ModuleDetail from './pages/ModuleDetail';
import LessonPlayer from './pages/LessonPlayer';
import CourseComplete from './pages/CourseComplete';
import Dashboard from './pages/Dashboard';
import Revision from './pages/Revision';
import EssayMemoriser from './pages/EssayMemoriser';
import EconomicsMarker from './pages/EconomicsMarker';
import Library from './pages/Library';
import LibrarySubject from './pages/LibrarySubject';
import Login from './pages/Login';
import Register from './pages/Register';
import Classes from './pages/Classes';
import ClassDetail from './pages/ClassDetail';
import Settings from './pages/Settings';
import SettingsProfile from './pages/SettingsProfile';
import SettingsFinancial from './pages/SettingsFinancial';
import SettingsAccount from './pages/SettingsAccount';
import UserProfile from './pages/UserProfile';
import Terms from './pages/Terms';
import Metrics from './pages/Metrics';
import Survey from './pages/Survey';
import SurveyResults from './pages/SurveyResults';
import Editor from './pages/Editor';
import HostLive from './pages/live/HostLive';
import PlayLive from './pages/live/PlayLive';
import NotFound from './pages/NotFound';
import CapletLoader from './components/CapletLoader';
import MarkerCursor from './components/MarkerCursor';
import { GOOGLE_OAUTH_CLIENT_ID } from './config/googleClient';

function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-surface-soft flex flex-col items-center justify-center p-8">
      <div className="relative">
        <div className="absolute inset-0 bg-accent/10 blur-3xl animate-pulse rounded-full scale-150" />
        <div className="relative">
          <CapletLoader message="Getting things ready..." />
        </div>
      </div>
    </div>
  );
}

// Reset scroll to the top on every route change (entire site).
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
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

function RequireAdmin({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
          <Route path="/" element={<HomeOrRedirect />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/revision" element={<RequireAuth><Revision /></RequireAuth>} />
          <Route path="/essays" element={<RequireAuth><EssayMemoriser /></RequireAuth>} />
          <Route path="/edutools/economics-marker" element={<RequireAuth><EconomicsMarker /></RequireAuth>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/fintools" element={<FinancialTools />} />
          <Route path="/tools" element={<Navigate to="/fintools" replace />} />
          <Route path="/edutools" element={<EduTools />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/fintools/tax-calculator" element={<TaxCalculator />} />
          <Route path="/fintools/budget-planner" element={<BudgetPlanner />} />
          <Route path="/fintools/savings-goal" element={<SavingsGoal />} />
          <Route path="/fintools/loan-repayment" element={<LoanRepayment />} />
          <Route path="/fintools/compound-interest" element={<CompoundInterest />} />
          <Route path="/fintools/mortgage" element={<MortgageCalculator />} />
          <Route path="/fintools/super-contribution" element={<SuperContribution />} />
          <Route path="/fintools/gst" element={<GSTCalculator />} />
          <Route path="/fintools/salary" element={<SalaryCalculator />} />
          <Route path="/fintools/emergency-fund" element={<EmergencyFund />} />
          <Route path="/fintools/net-worth" element={<NetWorth />} />
          <Route path="/fintools/inflation" element={<InflationCalculator />} />
          <Route path="/fintools/credit-card-payoff" element={<CreditCardPayoff />} />
          <Route path="/fintools/debt-sequencer" element={<DebtSequencer />} />
          <Route path="/fintools/roi" element={<ROICalculator />} />
          <Route path="/fintools/rent-vs-buy" element={<RentVsBuy />} />
          <Route path="/fintools/debt-to-income" element={<DebtToIncome />} />
          <Route path="/fintools/break-even" element={<BreakEven />} />
          <Route path="/fintools/fire-number" element={<FIRENumber />} />
          <Route path="/fintools/rule-of-72" element={<RuleOf72 />} />
          <Route path="/fintools/capital-gains" element={<CapitalGains />} />
          <Route path="/fintools/financial-twin" element={<FinancialTwin />} />
          <Route path="/tools/tax-calculator" element={<Navigate to="/fintools/tax-calculator" replace />} />
          <Route path="/tools/budget-planner" element={<Navigate to="/fintools/budget-planner" replace />} />
          <Route path="/tools/savings-goal" element={<Navigate to="/fintools/savings-goal" replace />} />
          <Route path="/tools/loan-repayment" element={<Navigate to="/fintools/loan-repayment" replace />} />
          <Route path="/tools/compound-interest" element={<Navigate to="/fintools/compound-interest" replace />} />
          <Route path="/tools/mortgage" element={<Navigate to="/fintools/mortgage" replace />} />
          <Route path="/tools/super-contribution" element={<Navigate to="/fintools/super-contribution" replace />} />
          <Route path="/tools/gst" element={<Navigate to="/fintools/gst" replace />} />
          <Route path="/tools/salary" element={<Navigate to="/fintools/salary" replace />} />
          <Route path="/tools/emergency-fund" element={<Navigate to="/fintools/emergency-fund" replace />} />
          <Route path="/tools/net-worth" element={<Navigate to="/fintools/net-worth" replace />} />
          <Route path="/tools/inflation" element={<Navigate to="/fintools/inflation" replace />} />
          <Route path="/tools/credit-card-payoff" element={<Navigate to="/fintools/credit-card-payoff" replace />} />
          <Route path="/tools/debt-sequencer" element={<Navigate to="/fintools/debt-sequencer" replace />} />
          <Route path="/tools/roi" element={<Navigate to="/fintools/roi" replace />} />
          <Route path="/tools/rent-vs-buy" element={<Navigate to="/fintools/rent-vs-buy" replace />} />
          <Route path="/tools/debt-to-income" element={<Navigate to="/fintools/debt-to-income" replace />} />
          <Route path="/tools/break-even" element={<Navigate to="/fintools/break-even" replace />} />
          <Route path="/tools/fire-number" element={<Navigate to="/fintools/fire-number" replace />} />
          <Route path="/tools/rule-of-72" element={<Navigate to="/fintools/rule-of-72" replace />} />
          <Route path="/tools/capital-gains" element={<Navigate to="/fintools/capital-gains" replace />} />
          <Route path="/tools/financial-twin" element={<Navigate to="/fintools/financial-twin" replace />} />
          <Route path="/library" element={<Library />} />
          <Route path="/library/:subject" element={<LibrarySubject />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/resources" element={<Navigate to="/library/economics" replace />} />
          <Route path="/courses/:courseId" element={<CourseDetail />} />
          <Route path="/courses/:courseId/modules/:moduleId" element={<ModuleDetail />} />
          <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPlayer />} />
          <Route path="/courses/:courseId/complete" element={<RequireAuth><CourseComplete /></RequireAuth>} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/classes/:classId" element={<RequireAuth><ClassDetail /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>}>
            <Route index element={<Navigate to="/settings/profile" replace />} />
            <Route path="profile" element={<SettingsProfile />} />
            <Route path="financial" element={<SettingsFinancial />} />
            <Route path="account" element={<SettingsAccount />} />
          </Route>
          <Route path="/profile/:userId" element={<UserProfile />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/metrics" element={<RequireAdmin><Metrics /></RequireAdmin>} />
          <Route path="/survey" element={<Survey />} />
          <Route path="/survey-results" element={<RequireAdmin><SurveyResults /></RequireAdmin>} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/live/host/:code" element={<RequireAuth><HostLive /></RequireAuth>} />
          <Route path="/play" element={<PlayLive />} />
          <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

/* Separate component so useLocation is inside Router */
function AppShell() {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const { navMode } = useLayout();

  // Tour gets a completely standalone layout — no Navbar/Footer/flex wrapper,
  // and no site-wide marker cursor (the tour draws its own scripted pointer,
  // and having both on screen at once looks like a bug).
  // Reached only via in-app (SPA) navigation to /demo. DemoApp must own the
  // router, so hard-load it — the App-level branch above then renders it.
  if (pathname === '/demo') {
    window.location.replace('/demo');
    return null;
  }

  // Pages that suppress all chrome (their own full-bleed layouts).
  const bareChrome =
    ['/login', '/register', '/play'].includes(pathname) ||
    pathname.startsWith('/live/host');

  // The vertical rail only makes sense for signed-in users, and never on the
  // bare-chrome auth/live pages. When it's active the top navbar is dropped on
  // large screens (the two never coexist) but kept on mobile as the nav.
  const vertical = navMode === 'vertical' && isAuthenticated && !bareChrome;

  if (vertical) {
    return (
      <div className="min-h-screen bg-surface-body lg:flex">
        <MarkerCursor />
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar mobileOnly />
          <main className="flex-grow">
            <AppRoutes />
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <MarkerCursor />
      <Navbar />
      <main className="flex-grow">
        <AppRoutes />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  // The /demo sandbox owns its own MemoryRouter, and React Router forbids
  // nesting routers — so mount it ABOVE the app's BrowserRouter (only
  // ThemeProvider is shared, for dark mode). DemoApp supplies its own auth,
  // courses, and layout providers.
  if (typeof window !== 'undefined' && window.location.pathname === '/demo') {
    return (
      <ThemeProvider>
        <DemoApp />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <GoogleOAuthProvider clientId={GOOGLE_OAUTH_CLIENT_ID}>
      <AuthProvider>
        <CoursesProvider>
          <LayoutProvider>
            <Router>
              <ScrollToTop />
              <AppShell />
            </Router>
          </LayoutProvider>
        </CoursesProvider>
      </AuthProvider>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}

export default App;
