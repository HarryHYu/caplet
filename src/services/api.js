const PROD_API_BASE_URL = 'https://caplet-production.up.railway.app/api';
const DEV_API_BASE_URLS = [
  'http://localhost:5002/api',
  'http://localhost:5000/api',
  PROD_API_BASE_URL,
];
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

  setEditorToken(token) {
    if (typeof sessionStorage === 'undefined') return;
    if (token) sessionStorage.setItem('editorToken', token);
    else sessionStorage.removeItem('editorToken');
  }

  clearEditorToken() {
    this.setEditorToken(null);
  }

  async request(endpoint, options = {}) {
    const { auth, ...rest } = options;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...rest.headers,
      },
      ...rest,
    };

    if (auth === 'editor') {
      const et = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('editorToken') : null;
      if (et) {
        config.headers.Authorization = `Bearer ${et}`;
      }
    } else if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    const requestWithBaseURL = async (baseURL) => {
      const url = `${baseURL}${endpoint}`;
      const response = await fetch(url, config);

      // Handle empty responses (e.g. 204 No Content from delete endpoints)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return null;
      }

      let data;
      try {
        data = await response.json();
      } catch {
        if (!response.ok) {
          throw new Error(response.statusText || 'Something went wrong');
        }
        return null;
      }

      if (!response.ok) {
        const errorMsg = data.message || data.errors?.[0]?.msg || data.errors?.[0]?.message || `Error ${response.status}: ${response.statusText}`;
        const error = new Error(errorMsg);
        error.status = response.status;
        throw error;
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
          throw error;
        }
      }
    }

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

  /**
   * S3 presigned upload — see docs/aws-s3-setup.md
   * @param {{ purpose: string, mimeType: string, classId?: string, lessonId?: string, courseId?: string }} body
   */
  async presignUpload(body, { useEditorToken = false } = {}) {
    return this.request('/uploads/presign', {
      method: 'POST',
      body: JSON.stringify(body),
      ...(useEditorToken ? { auth: 'editor' } : {}),
    });
  }

  // Lesson editor (code-gated workspace; token in sessionStorage)
  async editorEnter(code) {
    const data = await this.request('/editor/enter', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    if (data?.token) this.setEditorToken(data.token);
    return data;
  }

  async editorTree() {
    return this.request('/editor/tree', { auth: 'editor' });
  }

  async editorCreateCourse(payload = {}) {
    return this.request('/editor/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
      auth: 'editor',
    });
  }

  async editorUpdateCourse(courseId, payload) {
    return this.request(`/editor/courses/${courseId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      auth: 'editor',
    });
  }

  async editorDeleteCourse(courseId) {
    return this.request(`/editor/courses/${courseId}`, {
      method: 'DELETE',
      auth: 'editor',
    });
  }

  async editorCreateModule(payload) {
    return this.request('/editor/modules', {
      method: 'POST',
      body: JSON.stringify(payload),
      auth: 'editor',
    });
  }

  async editorUpdateModule(moduleId, payload) {
    return this.request(`/editor/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      auth: 'editor',
    });
  }

  async editorDeleteModule(moduleId) {
    return this.request(`/editor/modules/${moduleId}`, {
      method: 'DELETE',
      auth: 'editor',
    });
  }

  async editorCreateLesson(payload) {
    return this.request('/editor/lessons', {
      method: 'POST',
      body: JSON.stringify(payload),
      auth: 'editor',
    });
  }

  async editorUpdateLesson(lessonId, payload) {
    return this.request(`/editor/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      auth: 'editor',
    });
  }

  async editorDeleteLesson(lessonId) {
    return this.request(`/editor/lessons/${lessonId}`, {
      method: 'DELETE',
      auth: 'editor',
    });
  }

  /**
   * AI: paste notes → structured slides. Editor-gated.
   * Returns { slides: [...], warnings: string[] }.
   */
  async aiGenerateLesson(payload) {
    return this.request('/ai/generate-lesson', {
      method: 'POST',
      body: JSON.stringify(payload),
      auth: 'editor',
    });
  }

  async aiLessonChat(payload) {
    return this.request('/ai/lesson-chat', {
      method: 'POST',
      body: JSON.stringify(payload),
      auth: 'editor',
    });
  }

  /**
   * Upload a file using a presigned POST (multipart/form-data).
   * `presign` is the object returned by /uploads/presign — must have uploadUrl + fields.
   * S3 enforces ContentLengthRange server-side; we also check client-side for a fast error.
   */
  async postToPresignedUrl(presign, file) {
    if (presign.maxBytes && file.size > presign.maxBytes) {
      const mb = (presign.maxBytes / 1024 / 1024).toFixed(0);
      throw new Error(`File is too large. Maximum size is ${mb} MB.`);
    }
    const form = new FormData();
    Object.entries(presign.fields || {}).forEach(([k, v]) => form.append(k, v));
    form.append('file', file);
    const res = await fetch(presign.uploadUrl, { method: 'POST', body: form });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Upload failed (${res.status})${text ? ': ' + text.slice(0, 120) : ''}`);
    }
  }

  /**
   * Convenience: presign + upload a lesson image and return the final public URL.
   * Called from the editor where useEditorToken is required.
   */
  async uploadLessonImage(file, lessonId) {
    if (!file) throw new Error('No file selected');
    if (!lessonId) throw new Error('Save the lesson once before uploading images.');
    const presign = await this.presignUpload(
      { purpose: 'lessonImage', mimeType: file.type, lessonId },
      { useEditorToken: true },
    );
    await this.postToPresignedUrl(presign, file);
    return presign.publicUrl;
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

  async getMetrics() {
    return this.request('/metrics');
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

  // Saved slides
  async getSavedSlides() {
    return this.request('/saved-slides');
  }

  async saveSlide(lessonId, courseId, slideIndex) {
    return this.request('/saved-slides', {
      method: 'POST',
      body: JSON.stringify({ lessonId, courseId, slideIndex }),
    });
  }

  async unsaveSlide(savedSlideId) {
    return this.request(`/saved-slides/${savedSlideId}`, { method: 'DELETE' });
  }

  // Ask the AI to organize all flagged slides into revision categories.
  async categorizeSavedSlides() {
    return this.request('/saved-slides/categorize', { method: 'POST' });
  }

  // Ask the AI to condense one category's flagged slides into a summary slideshow.
  async summarizeSavedSlides(category) {
    return this.request('/saved-slides/summarize', {
      method: 'POST',
      body: JSON.stringify({ category }),
    });
  }

  // Chat History (AI assistant; backend has /api/chat/* endpoints, no UI wired yet)
  async getChatHistory() {
    return this.request('/chat/history');
  }

  async saveChatMessage(role, content) {
    return this.request('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ role, content })
    });
  }

  async clearChatHistory() {
    return this.request('/chat/history', {
      method: 'DELETE'
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
    } catch {
      return imageUrl;
    }
    return imageUrl;
  }
}

export default new ApiService();
