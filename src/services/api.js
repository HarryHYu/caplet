const API_BASE_URL = 'https://caplet-production.up.railway.app/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      let data;
      try {
        data = await response.json();
      } catch (e) {
        // If response isn't JSON, use status text
        throw new Error(response.statusText || 'Something went wrong');
      }

      if (!response.ok) {
        // Try to get detailed error message
        const errorMsg = data.message || data.errors?.[0]?.msg || data.errors?.[0]?.message || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Authentication
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async logout() {
    this.clearToken();
    return this.request('/auth/logout', { method: 'POST' });
  }

  // Courses
  async getCourses(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/courses${queryString ? `?${queryString}` : ''}`);
  }

  async getCourse(id) {
    const res = await this.request(`/courses/${id}`);
    // API returns { course }, normalize to object
    return res.course || res;
  }

  async getCourseCategories() {
    return this.request('/courses/categories/list');
  }

  async getFeaturedCourses() {
    return this.request('/courses/featured/list');
  }

  // User
  async getUserProfile() {
    return this.request('/users/profile');
  }

  async updateUserProfile(profileData) {
    return this.request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async getUserCourses() {
    return this.request('/users/courses');
  }

  async enrollInCourse(courseId) {
    return this.request(`/users/courses/${courseId}/enroll`, {
      method: 'POST',
    });
  }

  async getUserDashboard() {
    return this.request('/users/dashboard');
  }

  // Progress
  async updateLessonProgress(lessonId, progressData) {
    return this.request(`/progress/lesson/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(progressData),
    });
  }

  async getCourseProgress(courseId) {
    return this.request(`/progress/course/${courseId}`);
  }

  async getUserProgress() {
    return this.request('/progress');
  }

  async bookmarkLesson(lessonId) {
    return this.request(`/progress/bookmark/${lessonId}`, {
      method: 'POST',
    });
  }

  async removeBookmark(lessonId) {
    return this.request(`/progress/bookmark/${lessonId}`, {
      method: 'DELETE',
    });
  }

  // Survey
  async submitSurvey(surveyData) {
    return this.request('/survey', {
      method: 'POST',
      body: JSON.stringify(surveyData),
    });
  }

  async getSurveyStats() {
    return this.request('/survey/stats');
  }

  // Financial
  async getFinancialState() {
    return this.request('/financial/state');
  }

  async getFinancialPlan() {
    return this.request('/financial/plan');
  }

  async getSummary() {
    return this.request('/financial/summary');
  }

  async getCheckInHistory() {
    return this.request('/financial/history');
  }

  async submitCheckIn(checkInData) {
    return this.request('/financial/checkin', {
      method: 'POST',
      body: JSON.stringify(checkInData),
    });
  }

  async deleteAllData() {
    return this.request('/financial/delete-all-data', {
      method: 'DELETE',
    });
  }
}

export default new ApiService();
