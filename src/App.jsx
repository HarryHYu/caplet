import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CoursesProvider } from './contexts/CoursesContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LayoutProvider, useLayout } from './contexts/LayoutContext';
import { FeatureFlagProvider } from './contexts/FeatureFlagContext';
import Navbar from './components/Navbar';
import TabletPublicNavbar from './components/TabletPublicNavbar';
import TabletDashboardNavbar from './components/TabletDashboardNavbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import CapletLoader from './components/CapletLoader';
import MarkerCursor from './components/MarkerCursor';
import MoneyMobileNav from './components/MoneyMobileNav';
import MoneyRouteGate from './components/MoneyRouteGate';
import ProductModeRouteSync from './components/ProductModeRouteSync';
import LegacyMoneyRedirect from './components/LegacyMoneyRedirect';
import { FinancialAssumptions } from './components/AccessibleUI';
import { isMoneyPath } from './config/productNavigation';
import { GOOGLE_OAUTH_CLIENT_ID } from './config/googleClient';
import { getRouteMeta } from './config/routeMeta';
import api from './services/api';

const Home = lazy(() => import('./pages/Home'));
const DemoApp = lazy(() => import('./pages/DemoApp'));
const DemoPitch = lazy(() => import('./pages/DemoPitch'));
const Contact = lazy(() => import('./pages/Contact'));
const FinancialTools = lazy(() => import('./pages/FinancialTools'));
const EduTools = lazy(() => import('./pages/EduTools'));
const TaxCalculator = lazy(() => import('./pages/tools/TaxCalculator'));
const BudgetPlanner = lazy(() => import('./pages/tools/BudgetPlanner'));
const SavingsGoal = lazy(() => import('./pages/tools/SavingsGoal'));
const LoanRepayment = lazy(() => import('./pages/tools/LoanRepayment'));
const CompoundInterest = lazy(() => import('./pages/tools/CompoundInterest'));
const MortgageCalculator = lazy(() => import('./pages/tools/MortgageCalculator'));
const SuperContribution = lazy(() => import('./pages/tools/SuperContribution'));
const GSTCalculator = lazy(() => import('./pages/tools/GSTCalculator'));
const SalaryCalculator = lazy(() => import('./pages/tools/SalaryCalculator'));
const EmergencyFund = lazy(() => import('./pages/tools/EmergencyFund'));
const NetWorth = lazy(() => import('./pages/tools/NetWorth'));
const InflationCalculator = lazy(() => import('./pages/tools/InflationCalculator'));
const CreditCardPayoff = lazy(() => import('./pages/tools/CreditCardPayoff'));
const DebtSequencer = lazy(() => import('./pages/tools/DebtSequencer'));
const ROICalculator = lazy(() => import('./pages/tools/ROICalculator'));
const RentVsBuy = lazy(() => import('./pages/tools/RentVsBuy'));
const DebtToIncome = lazy(() => import('./pages/tools/DebtToIncome'));
const BreakEven = lazy(() => import('./pages/tools/BreakEven'));
const FIRENumber = lazy(() => import('./pages/tools/FIRENumber'));
const RuleOf72 = lazy(() => import('./pages/tools/RuleOf72'));
const CapitalGains = lazy(() => import('./pages/tools/CapitalGains'));
const FinancialTwin = lazy(() => import('./pages/tools/FinancialTwin'));
const MoneyOverview = lazy(() => import('./pages/MoneyOverview'));
const MoneyResources = lazy(() => import('./pages/MoneyResources'));
const MoneyInflation = lazy(() => import('./pages/MoneyInflation'));
const MyMoney = lazy(() => import('./pages/MyMoney'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const ModuleDetail = lazy(() => import('./pages/ModuleDetail'));
const LessonPlayer = lazy(() => import('./pages/LessonPlayer'));
const CourseComplete = lazy(() => import('./pages/CourseComplete'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Revision = lazy(() => import('./pages/Revision'));
const EssayMemoriser = lazy(() => import('./pages/EssayMemoriser'));
const EconomicsMarker = lazy(() => import('./pages/EconomicsMarker'));
const EconomicsExam = lazy(() => import('./pages/EconomicsExam'));
const Library = lazy(() => import('./pages/Library'));
const LibrarySubject = lazy(() => import('./pages/LibrarySubject'));
const ResourceLibrary = lazy(() => import('./pages/ResourceLibrary'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Classes = lazy(() => import('./pages/Classes'));
const ClassDetail = lazy(() => import('./pages/ClassDetail'));
const Settings = lazy(() => import('./pages/Settings'));
const SettingsProfile = lazy(() => import('./pages/SettingsProfile'));
const SettingsAppearance = lazy(() => import('./pages/SettingsAppearance'));
const SettingsFinancial = lazy(() => import('./pages/SettingsFinancial'));
const SettingsAccount = lazy(() => import('./pages/SettingsAccount'));
const SettingsPrivacy = lazy(() => import('./pages/SettingsPrivacy'));
const GuardianConsent = lazy(() => import('./pages/GuardianConsent'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Terms = lazy(() => import('./pages/Terms'));
const TrustCenter = lazy(() => import('./pages/TrustCenter'));
const StudyPlan = lazy(() => import('./pages/StudyPlan'));
const Practice = lazy(() => import('./pages/Practice'));
const Mastery = lazy(() => import('./pages/Mastery'));
const TeacherOnboarding = lazy(() => import('./pages/TeacherOnboarding'));
const TeacherClassLearning = lazy(() => import('./pages/TeacherClassLearning'));
const TeacherEvidenceOverride = lazy(() => import('./pages/TeacherEvidenceOverride'));
const Metrics = lazy(() => import('./pages/Metrics'));
const AdminOperations = lazy(() => import('./pages/AdminOperations'));
const Survey = lazy(() => import('./pages/Survey'));
const SurveyResults = lazy(() => import('./pages/SurveyResults'));
const Editor = lazy(() => import('./pages/Editor'));
const QuestionBank = lazy(() => import('./pages/QuestionBank'));
const HostLive = lazy(() => import('./pages/live/HostLive'));
const PlayLive = lazy(() => import('./pages/live/PlayLive'));
const NotFound = lazy(() => import('./pages/NotFound'));

function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-surface-soft flex flex-col items-center justify-center p-8" role="status" aria-live="polite">
      <div className="relative">
        <div className="absolute inset-0 bg-accent/10 blur-3xl animate-pulse rounded-full scale-150" />
        <div className="relative">
          <CapletLoader message="Getting things ready..." />
        </div>
      </div>
    </div>
  );
}

function RouteMetadata() {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const meta = getRouteMeta(pathname);
    document.title = meta.title;

    const upsertMeta = (selector, key, keyValue, content) => {
      let element = document.head.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(key, keyValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    upsertMeta('meta[name="description"]', 'name', 'description', meta.description);
    upsertMeta('meta[name="robots"]', 'name', 'robots', meta.noIndex ? 'noindex, nofollow' : 'index, follow');
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', meta.title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', meta.description);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `https://caplet.org${meta.canonicalPath}`);
  }, [pathname]);

  useEffect(() => {
    if (!isAuthenticated || !pathname.startsWith('/money/tools/')) return;
    const tool = pathname.split('/').filter(Boolean).at(-1);
    if (!tool) return;
    api.logEvent?.({
      type: 'tool_used',
      idempotencyKey: `tool:${tool}:${new Date().toISOString().slice(0, 10)}`,
      feature: 'financial_tools',
      entityType: 'financial_tool',
      entityId: tool,
      metadata: { tool, source: 'route' },
    });
    api.logEvent?.({
      type: 'finance_tool_viewed',
      idempotencyKey: `finance-tool-viewed:${tool}:${new Date().toISOString().slice(0, 10)}`,
      feature: 'financial_tools',
      entityType: 'financial_tool',
      entityId: tool,
      metadata: { toolId: tool, entryPoint: 'route', contentVersion: 'finance-tools-v1' },
    });
  }, [isAuthenticated, pathname]);

  return null;
}

function FinancialRouteDisclosure() {
  const { pathname } = useLocation();
  if (!pathname.startsWith('/money/tools/') || pathname === '/money/tools/tax-calculator') return null;

  return (
    <div className="container-custom pb-16">
      <FinancialAssumptions
        period="Scenario estimate"
        included={['The values and assumptions entered in this calculator']}
        excluded={['Personal tax, legal, lending, or investment circumstances unless explicitly stated by the calculator']}
        sources={[
          { label: 'ASIC Moneysmart calculators', href: 'https://moneysmart.gov.au/calculators-and-apps' },
          { label: 'ATO calculators', href: 'https://www.ato.gov.au/calculators' },
        ]}
      />
    </div>
  );
}

// Reset scroll to the top on every route change (entire site).
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const frame = requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  return null;
}

function HomeOrRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Home />;
}

export function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}`, returnState: location.state }} />;
  }
  return children;
}

function RequireAdmin({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}`, returnState: location.state }} />;
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// The approved prototype routes stay directly accessible. Higher-risk future
// surfaces, such as Financial Twin, retain their own explicit feature gate.
function MoneyPilot({ children }) {
  return children;
}

function AppRoutes() {
  return (
    <Routes>
          <Route path="/" element={<HomeOrRedirect />} />
          <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/study-plan" element={<RequireAuth><StudyPlan /></RequireAuth>} />
          <Route path="/practice" element={<RequireAuth><Practice /></RequireAuth>} />
          <Route path="/mastery" element={<RequireAuth><Mastery /></RequireAuth>} />
          <Route path="/teacher/onboarding" element={<RequireAuth><TeacherOnboarding /></RequireAuth>} />
          <Route path="/revision" element={<RequireAuth><Revision /></RequireAuth>} />
          <Route path="/essays" element={<RequireAuth><EssayMemoriser /></RequireAuth>} />
          <Route path="/edutools/economics-marker" element={<RequireAuth><EconomicsMarker /></RequireAuth>} />
          <Route path="/library/economics/exam-practice/:packId/session" element={<RequireAuth><EconomicsExam /></RequireAuth>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/money" element={<MoneyRouteGate><MoneyOverview /></MoneyRouteGate>} />
          <Route path="/money/economy" element={<MoneyRouteGate><Navigate to="/money/economy/inflation" replace /></MoneyRouteGate>} />
          <Route path="/money/economy/inflation" element={<MoneyRouteGate><MoneyInflation /></MoneyRouteGate>} />
          <Route path="/money/resources" element={<MoneyRouteGate><MoneyResources /></MoneyRouteGate>} />
          <Route path="/money/my-money" element={<MoneyPilot><MoneyRouteGate flagKey="money.private.persistence" fallbackPath="/money" unavailableMessage="My Money is not available for this account yet. You can still use Money learning and calculators without saving private figures."><RequireAuth><MyMoney /></RequireAuth></MoneyRouteGate></MoneyPilot>} />
          <Route path="/money/tools" element={<MoneyRouteGate><FinancialTools /></MoneyRouteGate>} />
          <Route path="/fintools" element={<LegacyMoneyRedirect prefix="/fintools" />} />
          <Route path="/fintools/*" element={<LegacyMoneyRedirect prefix="/fintools" />} />
          <Route path="/tools" element={<LegacyMoneyRedirect prefix="/tools" />} />
          <Route path="/tools/*" element={<LegacyMoneyRedirect prefix="/tools" />} />
          <Route path="/edutools" element={<EduTools />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/pitch" element={<DemoPitch />} />
          <Route path="/money/tools/tax-calculator" element={<MoneyPilot><TaxCalculator /></MoneyPilot>} />
          <Route path="/money/tools/budget-planner" element={<MoneyPilot><BudgetPlanner /></MoneyPilot>} />
          <Route path="/money/tools/savings-goal" element={<MoneyPilot><SavingsGoal /></MoneyPilot>} />
          <Route path="/money/tools/loan-repayment" element={<MoneyPilot><LoanRepayment /></MoneyPilot>} />
          <Route path="/money/tools/compound-interest" element={<MoneyPilot><CompoundInterest /></MoneyPilot>} />
          <Route path="/money/tools/mortgage" element={<MoneyPilot><MortgageCalculator /></MoneyPilot>} />
          <Route path="/money/tools/super-contribution" element={<MoneyPilot><SuperContribution /></MoneyPilot>} />
          <Route path="/money/tools/gst" element={<MoneyPilot><GSTCalculator /></MoneyPilot>} />
          <Route path="/money/tools/salary" element={<MoneyPilot><SalaryCalculator /></MoneyPilot>} />
          <Route path="/money/tools/emergency-fund" element={<MoneyPilot><EmergencyFund /></MoneyPilot>} />
          <Route path="/money/tools/net-worth" element={<MoneyPilot><NetWorth /></MoneyPilot>} />
          <Route path="/money/tools/inflation" element={<MoneyPilot><InflationCalculator /></MoneyPilot>} />
          <Route path="/money/tools/credit-card-payoff" element={<MoneyPilot><CreditCardPayoff /></MoneyPilot>} />
          <Route path="/money/tools/debt-sequencer" element={<MoneyPilot><MoneyRouteGate flagKey="money.private.persistence" fallbackPath="/money/tools"><RequireAuth><DebtSequencer /></RequireAuth></MoneyRouteGate></MoneyPilot>} />
          <Route path="/money/tools/roi" element={<MoneyPilot><ROICalculator /></MoneyPilot>} />
          <Route path="/money/tools/rent-vs-buy" element={<MoneyPilot><RentVsBuy /></MoneyPilot>} />
          <Route path="/money/tools/debt-to-income" element={<MoneyPilot><DebtToIncome /></MoneyPilot>} />
          <Route path="/money/tools/break-even" element={<MoneyPilot><BreakEven /></MoneyPilot>} />
          <Route path="/money/tools/fire-number" element={<MoneyPilot><FIRENumber /></MoneyPilot>} />
          <Route path="/money/tools/rule-of-72" element={<MoneyPilot><RuleOf72 /></MoneyPilot>} />
          <Route path="/money/tools/capital-gains" element={<MoneyPilot><CapitalGains /></MoneyPilot>} />
          <Route path="/money/tools/financial-twin" element={<MoneyPilot><MoneyRouteGate flagKey="money.financial_twin.enabled" fallbackPath="/money/tools"><RequireAuth><FinancialTwin /></RequireAuth></MoneyRouteGate></MoneyPilot>} />
          <Route path="/library" element={<Library />} />
          <Route path="/library/economics/:section/:focusId" element={<ResourceLibrary />} />
          <Route path="/library/economics/:section" element={<ResourceLibrary />} />
          <Route path="/library/:subject" element={<LibrarySubject />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/resources" element={<Navigate to="/library/economics" replace />} />
          <Route path="/courses/:courseId" element={<CourseDetail />} />
          <Route path="/courses/:courseId/modules/:moduleId" element={<ModuleDetail />} />
          <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPlayer />} />
          <Route path="/courses/:courseId/complete" element={<RequireAuth><CourseComplete /></RequireAuth>} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/classes/:classId" element={<RequireAuth><ClassDetail /></RequireAuth>} />
          <Route path="/classes/:classId/learning" element={<RequireAuth><TeacherClassLearning /></RequireAuth>} />
          <Route path="/classes/:classId/learning/students/:studentId/evidence/:evidenceId" element={<RequireAuth><TeacherEvidenceOverride /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>}>
            <Route index element={<Navigate to="/settings/profile" replace />} />
            <Route path="profile" element={<SettingsProfile />} />
            <Route path="appearance" element={<SettingsAppearance />} />
            <Route path="financial" element={<SettingsFinancial />} />
            <Route path="account" element={<SettingsAccount />} />
            <Route path="privacy" element={<SettingsPrivacy />} />
          </Route>
          <Route path="/profile/:userId" element={<UserProfile />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/trust" element={<TrustCenter />} />
          <Route path="/guardian-consent/:token" element={<GuardianConsent />} />
          <Route path="/metrics" element={<RequireAdmin><Metrics /></RequireAdmin>} />
          <Route path="/operations" element={<RequireAdmin><AdminOperations /></RequireAdmin>} />
          <Route path="/survey" element={<Survey />} />
          <Route path="/survey-results" element={<RequireAdmin><SurveyResults /></RequireAdmin>} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/questions" element={<QuestionBank />} />
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
    pathname.startsWith('/guardian-consent/') ||
    pathname.startsWith('/live/host');

  // The vertical rail only makes sense for signed-in users, and never on the
  // bare-chrome auth/live pages. When it's active the top navbar is dropped on
  // large screens (the two never coexist) but kept on mobile as the nav.
  const vertical = navMode === 'vertical' && isAuthenticated && !bareChrome;
  const moneyModeRoute = isMoneyPath(pathname);
  const pageOwnsMain =
    pathname === '/trust' ||
    pathname === '/terms' ||
    pathname === '/pitch' ||
    pathname === '/operations' ||
    pathname === '/editor' ||
    pathname === '/editor/questions' ||
    pathname === '/practice' ||
    pathname === '/mastery' ||
    pathname.startsWith('/guardian-consent/') ||
    pathname.startsWith('/teacher/') ||
    /^\/classes\/[^/]+\/learning(?:\/|$)/.test(pathname) ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/money') ||
    (pathname.startsWith('/library/economics') && !['/library/economics', '/library/economics/assessment'].includes(pathname)) ||
    /^\/courses\/[^/]+\/lessons\//.test(pathname);
  const ContentLandmark = pageOwnsMain ? 'div' : 'main';

  if (vertical) {
    return (
      <div className="min-h-screen bg-surface-body lg:flex">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <RouteMetadata />
        {!isAuthenticated && <MarkerCursor />}
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <Navbar mobileOnly hideOnTablet />
          <TabletPublicNavbar />
          <TabletDashboardNavbar />
          <ContentLandmark id="main-content" tabIndex="-1" className="flex-grow">
            <Suspense fallback={<FullPageSpinner />}>
              <AppRoutes />
            </Suspense>
            <FinancialRouteDisclosure />
          </ContentLandmark>
          <Footer />
          {moneyModeRoute && <MoneyMobileNav />}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <RouteMetadata />
      {!isAuthenticated && <MarkerCursor />}
      <Navbar hideOnTablet />
      <TabletPublicNavbar />
      <TabletDashboardNavbar />
      <ContentLandmark id="main-content" tabIndex="-1" className="flex-grow">
        <Suspense fallback={<FullPageSpinner />}>
          <AppRoutes />
        </Suspense>
        <FinancialRouteDisclosure />
      </ContentLandmark>
      <Footer />
      {moneyModeRoute && <MoneyMobileNav />}
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
        <Suspense fallback={<FullPageSpinner />}>
          <DemoApp />
        </Suspense>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <GoogleOAuthProvider clientId={GOOGLE_OAUTH_CLIENT_ID}>
      <AuthProvider>
        <FeatureFlagProvider>
          <CoursesProvider>
            <LayoutProvider>
              <Router>
                <ScrollToTop />
                <ProductModeRouteSync />
                <AppShell />
              </Router>
            </LayoutProvider>
          </CoursesProvider>
        </FeatureFlagProvider>
      </AuthProvider>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}

export default App;
