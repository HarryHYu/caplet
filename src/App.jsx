import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CoursesProvider } from './contexts/CoursesContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Mission from './pages/Mission';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import References from './pages/References';
import Courses from './pages/Courses';

function App() {
  return (
    <AuthProvider>
      <CoursesProvider>
        <Router>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/mission" element={<Mission />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/references" element={<References />} />
                <Route path="/courses" element={<Courses />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </CoursesProvider>
    </AuthProvider>
  );
}

export default App;
