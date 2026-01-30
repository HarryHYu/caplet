import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CoursesProvider } from './contexts/CoursesContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Mission from './pages/Mission';
import FAQ from './pages/FAQ';
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
import LessonPlayer from './pages/LessonPlayer';
import Survey from './pages/Survey';
import SurveyResults from './pages/SurveyResults';
import Classes from './pages/Classes';
import ClassDetail from './pages/ClassDetail';
import Settings from './pages/Settings';
import SettingsProfile from './pages/SettingsProfile';
import SettingsAccount from './pages/SettingsAccount';
import UserProfile from './pages/UserProfile';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CoursesProvider>
          <Router>
          <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/mission" element={<Mission />} />
                <Route path="/tools" element={<Tools />} />
                <Route path="/faq" element={<FAQ />} />
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
                <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPlayer />} />
                <Route path="/classes" element={<Classes />} />
                <Route path="/classes/:classId" element={<ClassDetail />} />
                <Route path="/settings" element={<Settings />}>
                  <Route index element={<Navigate to="/settings/profile" replace />} />
                  <Route path="profile" element={<SettingsProfile />} />
                  <Route path="account" element={<SettingsAccount />} />
                </Route>
                <Route path="/profile/:userId" element={<UserProfile />} />
                <Route path="/survey" element={<Survey />} />
                <Route path="/survey-results" element={<SurveyResults />} />
                <Route path="/terms" element={<Terms />} />
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
