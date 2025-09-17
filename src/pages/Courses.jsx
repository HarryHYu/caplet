import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCourses } from '../contexts/CoursesContext';
import { useAuth } from '../contexts/AuthContext';

const Courses = () => {
  const { courses, loading, error, fetchCourses, enrollInCourse } = useCourses();
  const { isAuthenticated } = useAuth();
  const [filters, setFilters] = useState({
    category: '',
    level: '',
    search: '',
  });

  useEffect(() => {
    fetchCourses(filters);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleEnroll = async (courseId) => {
    if (!isAuthenticated) {
      alert('Please sign in to enroll in courses');
      return;
    }

    try {
      await enrollInCourse(courseId);
      alert('Successfully enrolled in course!');
    } catch (error) {
      alert('Error enrolling in course: ' + error.message);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      budgeting: 'bg-green-100 text-green-800',
      superannuation: 'bg-blue-100 text-blue-800',
      tax: 'bg-purple-100 text-purple-800',
      loans: 'bg-yellow-100 text-yellow-800',
      investment: 'bg-red-100 text-red-800',
      planning: 'bg-indigo-100 text-indigo-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getLevelColor = (level) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800',
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Financial Education Courses
          </h1>
          <p className="text-xl text-gray-600">
            Learn essential financial skills to secure your future
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                <option value="budgeting">Budgeting</option>
                <option value="superannuation">Superannuation</option>
                <option value="tax">Tax</option>
                <option value="loans">Loans & Credit</option>
                <option value="investment">Investment</option>
                <option value="planning">Financial Planning</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level
              </label>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search courses..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(course.category)}`}>
                    {course.category.charAt(0).toUpperCase() + course.category.slice(1)}
                  </span>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(course.level)}`}>
                    {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  <Link to={`/courses/${course.id}`} className="hover:text-blue-600">
                    {course.title}
                  </Link>
                </h3>

                <p className="text-gray-600 mb-4 line-clamp-3">
                  {course.shortDescription}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>⏱️ {course.duration} min</span>
                  <span>📚 {course.lessons?.length || 0} lessons</span>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">What you'll learn:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {course.learningOutcomes.slice(0, 3).map((outcome, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        {outcome}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-green-600">
                    {course.isFree ? 'Free' : `$${course.price}`}
                  </span>
                  <button
                    onClick={() => handleEnroll(course.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    {isAuthenticated ? 'Enroll Now' : 'Sign In to Enroll'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {courses.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No courses found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
