const DEV_API_BASE_URLS = [
  'http://localhost:5000/api',
  'http://localhost:5002/api',
];
const PROD_API_BASE_URL = 'https://caplet-production.up.railway.app/api';
const ENV_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = ENV_API_BASE_URL || (import.meta.env.DEV ? DEV_API_BASE_URLS[0] : PROD_API_BASE_URL);

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.baseURLCandidates = ENV_API_BASE_URL
      ? [ENV_API_BASE_URL]
      : (import.meta.env.DEV ? DEV_API_BASE_URLS : [PROD_API_BASE_URL]);
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

    const requestWithBaseURL = async (baseURL) => {
      const url = `${baseURL}${endpoint}`;
      const response = await fetch(url, config);
      let data;
      try {
        data = await response.json();
      } catch {
        // If response isn't JSON, use status text
        throw new Error(response.statusText || 'Something went wrong');
      }

      if (!response.ok) {
        // Try to get detailed error message
        const errorMsg = data.message || data.errors?.[0]?.msg || data.errors?.[0]?.message || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      return data;
    };

    const candidateBaseURLs = [
      this.baseURL,
      ...this.baseURLCandidates.filter((url) => url !== this.baseURL),
    ];

    let lastError;
    for (let i = 0; i < candidateBaseURLs.length; i += 1) {
      const baseURL = candidateBaseURLs[i];
      try {
        const data = await requestWithBaseURL(baseURL);
        if (this.baseURL !== baseURL) {
          this.baseURL = baseURL;
        }
        return data;
      } catch (error) {
        lastError = error;
        const canRetry = i < candidateBaseURLs.length - 1;
        const isNetworkError = error instanceof TypeError;
        if (!(canRetry && isNetworkError)) {
          console.error('API Error:', error);
          throw error;
        }
      }
    }

    console.error('API Error:', lastError);
    throw lastError;
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

  async googleLogin(idToken) {
    return this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
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
    return res.course || res;
  }

  async getLesson(courseId, lessonId) {
    const res = await this.request(`/courses/${courseId}/lessons/${lessonId}`);
    return res.lesson || res;
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

  async getPublicProfile(userId) {
    return this.request(`/users/${userId}`);
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

  // Classes & assignments
  async getClasses() {
    return this.request('/classes');
  }

  async createClass(data) {
    return this.request('/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async joinClass(code) {
    return this.request('/classes/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async getClassDetail(classId) {
    return this.request(`/classes/${classId}`);
  }

  async createAnnouncement(classId, data) {
    return this.request(`/classes/${classId}/announcements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAnnouncement(classId, announcementId) {
    return this.request(`/classes/${classId}/announcements/${announcementId}`, {
      method: 'DELETE',
    });
  }

  async getAnnouncementComments(classId, announcementId) {
    return this.request(`/classes/${classId}/announcements/${announcementId}/comments`);
  }

  async createAnnouncementComment(classId, announcementId, content) {
    return this.request(`/classes/${classId}/announcements/${announcementId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async deleteAnnouncementComment(classId, announcementId, commentId) {
    return this.request(`/classes/${classId}/announcements/${announcementId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  async getAssignmentComments(classId, assignmentId) {
    return this.request(`/classes/${classId}/assignments/${assignmentId}/comments`);
  }

  async createAssignmentComment(classId, assignmentId, { content, isPrivate, targetUserId }) {
    return this.request(`/classes/${classId}/assignments/${assignmentId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, isPrivate: !!isPrivate, targetUserId: targetUserId || undefined }),
    });
  }

  async deleteAssignmentComment(classId, assignmentId, commentId) {
    return this.request(`/classes/${classId}/assignments/${assignmentId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  async leaveClass(classId) {
    return this.request(`/classes/${classId}/leave`, {
      method: 'POST',
    });
  }

  async deleteClass(classId) {
    return this.request(`/classes/${classId}`, {
      method: 'DELETE',
    });
  }

  async addClassTeacher(classId, email) {
    return this.request(`/classes/${classId}/teachers`, {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    });
  }

  async removeClassMember(classId, userId) {
    return this.request(`/classes/${classId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  async createAssignment(classId, data) {
    return this.request(`/classes/${classId}/assignments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAssignment(classId, assignmentId) {
    return this.request(`/classes/${classId}/assignments/${assignmentId}`, {
      method: 'DELETE',
    });
  }

  async completeAssignment(assignmentId) {
    return this.request(`/classes/assignments/${assignmentId}/complete`, {
      method: 'POST',
    });
  }

  async uncompleteAssignment(assignmentId) {
    return this.request(`/classes/assignments/${assignmentId}/uncomplete`, {
      method: 'POST',
    });
  }

  async completeLessonAssignments(lessonId) {
    return this.request(`/classes/lessons/${lessonId}/complete`, {
      method: 'POST',
    });
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

  /**
   * Proxied image URL for hosts that may be blocked or don't hotlink (Reddit, Imgur, Google Drive, Cloudinary).
   * Backend fetches the image so the browser only hits your API.
   */
  getProxiedImageSrc(imageUrl) {
    if (!imageUrl || typeof imageUrl !== 'string') return imageUrl;
    try {
      const host = new URL(imageUrl).hostname.toLowerCase();
      if (host.includes('reddit') || host.includes('imgur') || host.includes('drive.google') || host.includes('googleusercontent') || host.includes('cloudinary')) {
        return `${this.baseURL}/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      }
    } catch (_) {}
    return imageUrl;
  }
}

export default new ApiService();
