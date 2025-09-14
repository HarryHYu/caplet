const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

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
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
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
    return this.request(`/courses/${id}`);
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
}

export default new ApiService();
