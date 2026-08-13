const PROD_API_BASE_URL = 'https://caplet-production.up.railway.app/api';
const DEV_API_BASE_URLS = [
  'http://localhost:5002/api',
  'http://localhost:5000/api',
];
const ENV_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = ENV_API_BASE_URL || (import.meta.env.DEV ? DEV_API_BASE_URLS[0] : PROD_API_BASE_URL);
// A 401 from these endpoints never means "expired access token", so a refresh
// attempt would be wasted: the auth endpoints issue tokens themselves, and
// /editor/enter returns 401 for a wrong workspace code while the account
// session is perfectly healthy.
const AUTH_ENDPOINTS_WITHOUT_REFRESH = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/refresh',
  '/auth/logout',
  '/editor/enter',
]);

// `/demo` is a hard-isolated application entry: its internal MemoryRouter never
// changes the browser pathname, and exiting it performs a full page load. Using
// that immutable boundary avoids a mutable singleton flag being toggled by
// React Strict Mode effect replay.
const isDemoSandboxRequest = () => (
  typeof window !== 'undefined' && window.location.pathname === '/demo'
);

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.baseURLCandidates = ENV_API_BASE_URL
      ? [ENV_API_BASE_URL]
      : (import.meta.env.DEV ? DEV_API_BASE_URLS : [PROD_API_BASE_URL]);
    // Access tokens are memory-only. The backend keeps the refresh token in an
    // HttpOnly cookie so a script-readable storage XSS cannot persistently
    // exfiltrate the account session.
    this.token = null;
    this.refreshPromise = null;
    // True only after /auth/refresh itself answered 401 — the one signal that
    // the refresh session is genuinely gone rather than momentarily unreachable.
    this.sessionDead = false;
    // Bumped on every explicit token transition (login, logout). An in-flight
    // refresh compares generations before acting on its outcome, so a stale
    // refresh that resolves after the user just signed in can neither wipe the
    // new token nor mark the new session dead.
    this.authGeneration = 0;
  }

  setToken(token) {
    this.token = token;
    this.authGeneration += 1;
    if (token) this.sessionDead = false;
  }

  clearToken() {
    this.token = null;
    this.authGeneration += 1;
  }

  async refreshAccessToken() {
    if (isDemoSandboxRequest()) return null;
    // Single-flight: concurrent 401s (e.g. Dashboard's parallel mount fetches)
    // share one refresh call. Parallel refreshes burn the per-IP auth budget on
    // shared networks, and a losing duplicate used to clobber the winner's
    // freshly issued token.
    if (this.refreshPromise) return this.refreshPromise;
    const generationAtStart = this.authGeneration;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseURL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Caplet-Client': 'web',
          },
        });
        // If the user explicitly signed in or out while this refresh was in
        // flight, its outcome describes a session that no longer exists —
        // discard it rather than clobber the new state.
        if (this.authGeneration !== generationAtStart) {
          return this.token;
        }
        if (!response.ok) {
          // Only a 401 proves the refresh session is dead. 429 (shared-IP rate
          // limit at schools), 5xx (cold start), or 403 (a proxy stripping the
          // client header) are recoverable — keep whatever session state we
          // have instead of signing the user out.
          if (response.status === 401) {
            this.sessionDead = true;
            this.clearToken();
          }
          return null;
        }
        const data = await response.json();
        if (!data?.token) return null;
        if (this.authGeneration !== generationAtStart) return this.token;
        this.setToken(data.token);
        return data.token;
      } catch {
        // A local backend being offline must never trigger a production request.
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();
    return this.refreshPromise;
  }

  async restoreSession() {
    const token = await this.refreshAccessToken();
    if (token || this.sessionDead || isDemoSandboxRequest()) return token;
    // The refresh failed for a transient reason (rate limit, cold start, flaky
    // wifi). One short retry keeps a full page load from booting to the login
    // screen while the user still holds a valid refresh cookie.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return this.refreshAccessToken();
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
    // The demo is resolved before any network configuration is constructed, so
    // no localhost, production, upload, or AI request can escape the sandbox.
    if (isDemoSandboxRequest()) {
      const { resolveDemo } = await import('../demo/demoResolver.js');
      return resolveDemo((options.method || 'GET').toUpperCase(), endpoint, options);
    }

    const { auth, skipAuthRefresh = false, ...rest } = options;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...rest.headers,
      },
      credentials: 'include',
      ...rest,
    };

    if (auth === 'editor') {
      const et = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('editorToken') : null;
      if (et) {
        config.headers.Authorization = `Bearer ${et}`;
      }
      if (this.token) config.headers['X-Caplet-User-Token'] = `Bearer ${this.token}`;
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
        error.data = data;
        error.details = data.errors;
        error.validation = data.validation;
        if (response.status === 401 && auth === 'editor') {
          // The editor workspace token is its own identity — a 401 here just
          // re-opens the code gate. Account 401s are NOT cleared eagerly:
          // request() below refreshes and retries, and refreshAccessToken()
          // alone decides when the account session is truly over. Clearing
          // here used to wipe tokens on wrong editor codes and on stale-token
          // 401s that raced an already-completed refresh.
          this.clearEditorToken();
        }
        throw error;
      }

      return data;
    };

    const candidateBaseURLs = [
      this.baseURL,
      ...this.baseURLCandidates.filter((url) => url !== this.baseURL),
    ];

    let lastError;
    const method = String(config.method || 'GET').toUpperCase();
    const retryableMethod = ['GET', 'HEAD', 'OPTIONS'].includes(method);
    try {
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
          const canRetry = retryableMethod && i < candidateBaseURLs.length - 1;
          const isNetworkError = error instanceof TypeError;
          if (!(canRetry && isNetworkError)) {
            throw error;
          }
        }
      }

      throw lastError;
    } catch (error) {
      const canRefresh = !skipAuthRefresh
        && auth !== 'editor'
        && error?.status === 401
        && !AUTH_ENDPOINTS_WITHOUT_REFRESH.has(endpoint);
      if (canRefresh && await this.refreshAccessToken()) {
        return this.request(endpoint, { ...options, skipAuthRefresh: true });
      }
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

  async googleLogin(idToken) {
    return this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async changePassword(payload) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async requestPasswordReset(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(payload) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async logout() {
    this.clearToken();
    return this.request('/auth/logout', {
      method: 'POST',
      headers: { 'X-Caplet-Client': 'web' },
    });
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

  async completeUpload(assetId, { useEditorToken = false } = {}) {
    return this.request(`/uploads/${assetId}/complete`, {
      method: 'POST',
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

  async editorCreateLessonVersion(lessonId) {
    return this.request(`/editor/lessons/${lessonId}/new-version`, {
      method: 'POST',
      auth: 'editor',
    });
  }

  async editorDeleteLesson(lessonId) {
    return this.request(`/editor/lessons/${lessonId}`, {
      method: 'DELETE',
      auth: 'editor',
    });
  }

  async editorCurriculumOutcomes(subject = 'economics', syllabusVersion = '') {
    const query = new URLSearchParams();
    if (subject) query.set('subject', subject);
    if (syllabusVersion) query.set('syllabusVersion', syllabusVersion);
    return this.request(`/editor/curriculum-outcomes?${query.toString()}`, { auth: 'editor' });
  }

  async editorValidateLesson(lessonId, payload = {}) {
    return this.request(`/editor/lessons/${lessonId}/validate`, {
      method: 'POST',
      body: JSON.stringify(payload),
      auth: 'editor',
    });
  }

  async editorUpdateLessonLifecycle(lessonId, payload) {
    return this.request(`/editor/lessons/${lessonId}/lifecycle`, {
      method: 'POST',
      body: JSON.stringify(payload),
      auth: 'editor',
    });
  }

  async editorLessonHistory(lessonId) {
    return this.request(`/editor/lessons/${lessonId}/history`, { auth: 'editor' });
  }

  /**
   * Shared wrapper for AI endpoints — adds a generous timeout and converts
   * raw network errors into descriptive messages.
   */
  async _aiRequest(endpoint, payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180000); // 3 min
    try {
      return await this.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        auth: 'editor',
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('The request timed out (3 min). Try reducing the slide count or using a shorter input.');
      }
      if (err instanceof TypeError || err.message === 'Failed to fetch') {
        throw new Error('Could not reach the server. Check your connection, or the request may have timed out — try fewer slides or a shorter input.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * AI: paste notes → structured slides. Editor-gated.
   * Returns { slides: [...], warnings: string[] }.
   */
  async aiGenerateLesson(payload) {
    return this._aiRequest('/ai/generate-lesson', payload);
  }

  async aiLessonChat(payload) {
    return this._aiRequest('/ai/lesson-chat', payload);
  }

  /**
   * Upload a file using a presigned POST (multipart/form-data).
   * `presign` is the object returned by /uploads/presign — must have uploadUrl + fields.
   * S3 enforces ContentLengthRange server-side; we also check client-side for a fast error.
   */
  async postToPresignedUrl(presign, file) {
    // Demo uploads are deliberately local-only. The resolver supplies a stable
    // placeholder asset, and this guard prevents the direct S3 fetch from
    // bypassing ApiService.request().
    if (isDemoSandboxRequest()) return;
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
    const completed = await this.completeUpload(presign.assetId, { useEditorToken: true });
    return completed.publicUrl;
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

  async getCourseProgressSummaries() {
    return this.request('/progress/courses');
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

  // Public, provenance-first Money learning data. These endpoints contain
  // sourced observations only; they never read or write a student's private
  // financial profile.
  async getMoneyIndicators() {
    return this.request('/money/indicators');
  }

  async getMoneyIndicatorHistory(key, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/money/indicators/${encodeURIComponent(key)}${queryString ? `?${queryString}` : ''}`);
  }

  async resolveMoneyCurriculum(hscCohortYear) {
    return this.request(`/money/curriculum/resolve?hscCohortYear=${encodeURIComponent(hscCohortYear)}`);
  }

  // Financial profile (personal financial snapshot)
  async getFinancialProfile() {
    return this.request('/financial-profile');
  }

  async updateFinancialProfile(data) {
    return this.request('/financial-profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Debt sequencing — ranks the saved profile's debts by cost and compares HECS
  // separately. Assumptions (indexationRate, extraMonthlyAmount, voluntaryAnnual)
  // are passed as query params; balances/income come from the saved profile.
  async getDebtSequencing(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/debt-sequencing${queryString ? `?${queryString}` : ''}`);
  }

  // Financial Twin — mocked-CDR ingestion + seeded Monte Carlo projection.
  async connectFinancialTwin(persona) {
    return this.request('/financial-twin/connect', {
      method: 'POST',
      body: JSON.stringify(persona ? { persona } : {}),
    });
  }

  async getFinancialTwinConnection() {
    return this.request('/financial-twin/connection');
  }

  async revokeFinancialTwin() {
    return this.request('/financial-twin/connection/revoke', { method: 'POST' });
  }

  async getFinancialTwinCategorized() {
    return this.request('/financial-twin/categorized');
  }

  // params: { seed?, trials?, years? } — same seed always returns the same ranges.
  async getFinancialTwinProjection(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/financial-twin/projection${queryString ? `?${queryString}` : ''}`);
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

  async reportClassComment(classId, commentId, { reason, details }) {
    return this.request(`/classes/${classId}/comments/${commentId}/reports`, {
      method: 'POST',
      body: JSON.stringify({ reason, details: details || undefined }),
    });
  }

  async getClassModerationReports(classId, status = 'pending') {
    return this.request(`/classes/${classId}/moderation/reports?status=${encodeURIComponent(status)}`);
  }

  async getAdminModerationReports(status = 'pending') {
    return this.request(`/classes/moderation/admin/reports?status=${encodeURIComponent(status)}`);
  }

  async updateClassModerationReport(classId, reportId, { status, note }) {
    return this.request(`/classes/${classId}/moderation/reports/${reportId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note: note || undefined }),
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

  // Saved slides that are due for spaced-repetition review (new or past-due).
  async getDueSavedSlides() {
    return this.request('/saved-slides/due');
  }

  // Generate one active-recall question (+ model answer) from a saved slide.
  async getSlideRecallQuestion(savedSlideId) {
    return this.request(`/saved-slides/${savedSlideId}/recall-question`, {
      method: 'POST',
    });
  }

  // Spaced repetition (shared scheduler across saved slides, essays, quotes)
  async getReviewQueue() {
    return this.request('/review/queue');
  }

  async getDueReviewItems(itemType) {
    const qs = itemType ? `?itemType=${encodeURIComponent(itemType)}` : '';
    return this.request(`/review/due${qs}`);
  }

  // Record a recall result for an item; advances/resets its review schedule.
  async submitReview(itemType, itemId, recall, resultMetadata) {
    return this.request('/review/submit', {
      method: 'POST',
      body: JSON.stringify({ itemType, itemId, recall, resultMetadata }),
    });
  }

  // AI tutor (in-slide assistance). Degrades gracefully: never throws, so the
  // tutor UI keeps working whether or not the backend has shipped /ai/tutor.
  async askTutor({ lessonId, slide, question } = {}) {
    try {
      const data = await this.request('/ai/tutor', {
        method: 'POST',
        body: JSON.stringify({ lessonId, slide, question }),
      });
      return { unavailable: false, answer: data?.answer || '' };
    } catch (error) {
      console.warn('askTutor failed; returning fallback', error);
      const data = error?.data || {};
      // Actionable gating errors (missing DOB / AI-processing consent) carry a
      // specific message + code — surface those so the UI can point the student
      // to the right setting. Everything else stays a generic "try again".
      if (data.consentRequired) {
        return {
          unavailable: true,
          answer: '',
          message: data.message || 'AI-assisted learning needs to be enabled first.',
          code: data.code || null,
          consentRequired: true,
          status: error?.status || null,
        };
      }
      return {
        unavailable: true,
        answer: '',
        message: 'The tutor is currently unavailable. Please try again later.',
      };
    }
  }

  // Lesson scoring + analytics events. Both degrade gracefully (resolve to null
  // instead of throwing) so the lesson player behaves identically before the
  // backend ships POST /progress/:lessonId/score and POST /events.
  async submitLessonScore(lessonId, payload) {
    if (!lessonId) return null;
    try {
      return await this.request(`/progress/${lessonId}/score`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn('submitLessonScore failed; ignoring', error);
      return null;
    }
  }

  async logEvent(event) {
    try {
      return await this.request('/events', {
        method: 'POST',
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.warn('logEvent failed; ignoring', error);
      return null;
    }
  }

  // Essays (private essay memoriser)
  async getEssays() {
    return this.request('/essays');
  }

  async getEssay(id) {
    return this.request(`/essays/${id}`);
  }

  async createEssay(title, text) {
    return this.request('/essays', {
      method: 'POST',
      body: JSON.stringify({ title, text }),
    });
  }

  async updateEssay(id, { title, text } = {}) {
    return this.request(`/essays/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, text }),
    });
  }

  // AI: label the stored essay's structure (never alters the text itself).
  async parseEssay(id, { model, force } = {}) {
    return this.request(`/essays/${id}/parse`, {
      method: 'POST',
      body: JSON.stringify({ model, force }),
    });
  }

  async deleteEssay(id) {
    return this.request(`/essays/${id}`, { method: 'DELETE' });
  }

  // Essay workspace: context library, annotations, assistant.
  async getEssayContext(id) {
    return this.request(`/essays/${id}/context`);
  }

  async addEssayContext(id, { title, kind, content }) {
    return this.request(`/essays/${id}/context`, {
      method: 'POST',
      body: JSON.stringify({ title, kind, content }),
    });
  }

  async deleteEssayContext(id, docId) {
    return this.request(`/essays/${id}/context/${docId}`, { method: 'DELETE' });
  }

  async getEssayAnnotations(id) {
    return this.request(`/essays/${id}/annotations`);
  }

  async addEssayAnnotation(id, { paragraphIndex, anchor, note, kind }) {
    return this.request(`/essays/${id}/annotations`, {
      method: 'POST',
      body: JSON.stringify({ paragraphIndex, anchor, note, kind }),
    });
  }

  async updateEssayAnnotation(id, annotationId, { note, anchor }) {
    return this.request(`/essays/${id}/annotations/${annotationId}`, {
      method: 'PUT',
      body: JSON.stringify({ note, anchor }),
    });
  }

  async deleteEssayAnnotation(id, annotationId) {
    return this.request(`/essays/${id}/annotations/${annotationId}`, { method: 'DELETE' });
  }

  /**
   * Essay AI calls use ACCOUNT auth (not the editor workspace token that
   * _aiRequest sends) with a generous timeout, since a grounded reply over a
   * large context library can take a while.
   */
  async _essayAIRequest(endpoint, payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    try {
      return await this.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('That took too long. Try a shorter question or trim the context library.');
      }
      if (err instanceof TypeError) {
        throw new Error('Could not reach the server. Check your connection and try again.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  // Grounded assistant — answers from the essay + its context library.
  async essayChat(id, { messages, model }) {
    return this._essayAIRequest(`/essays/${id}/chat`, { messages, model });
  }

  // AI explanations for every body paragraph (persisted as annotations).
  async explainEssay(id, { model, paragraphIndex } = {}) {
    return this._essayAIRequest(`/essays/${id}/explain`, { model, paragraphIndex });
  }

  async parseAssessmentReport({ text, fileName, subjects }) {
    return this.request('/assessment-reports/parse', {
      method: 'POST',
      body: JSON.stringify({ text, fileName, subjects }),
    });
  }

  // CapletMark — HSC Economics answer marker (AI-marked practice attempts)
  async markEconomicsAnswer({ question, markValue, responseType, studentAnswer, focusArea, sourceResourceId, sourcePromptId, sourceFocusId }) {
    return this.request('/economics-marker', {
      method: 'POST',
      body: JSON.stringify({ question, markValue, responseType, studentAnswer, focusArea, sourceResourceId, sourcePromptId, sourceFocusId }),
    });
  }

  async getEconomicsAttempts() {
    return this.request('/economics-marker');
  }

  async getEconomicsAttempt(id) {
    return this.request(`/economics-marker/${id}`);
  }

  async deleteEconomicsAttempt(id) {
    return this.request(`/economics-marker/${id}`, { method: 'DELETE' });
  }

  async startEconomicsExam(payload) {
    return this.request('/economics-exams', { method: 'POST', body: JSON.stringify(payload) });
  }

  async getEconomicsExam(sessionId) {
    return this.request(`/economics-exams/${sessionId}`);
  }

  async getEconomicsExamSessions() {
    return this.request('/economics-exams');
  }

  async saveEconomicsExam(sessionId, answers) {
    return this.request(`/economics-exams/${sessionId}`, { method: 'PATCH', body: JSON.stringify({ answers }) });
  }

  async submitEconomicsExam(sessionId) {
    return this.request(`/economics-exams/${sessionId}/submit`, { method: 'POST' });
  }

  // Personal study plan — persisted seven-day plan and completion tracking.
  async getStudyPlan() {
    return this.request('/study-plan');
  }

  async generateStudyPlan(config) {
    return this.request('/study-plan/generate', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  async regenerateStudyPlan() {
    return this.request('/study-plan/regenerate', { method: 'POST' });
  }

  async updateStudyTask(taskId, completed) {
    return this.request(`/study-plan/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed, timezoneOffset: new Date().getTimezoneOffset() }),
    });
  }

  async getStudyStreak() {
    const query = new URLSearchParams({ timezoneOffset: String(new Date().getTimezoneOffset()) });
    return this.request(`/streaks?${query.toString()}`);
  }

  // Unified learning loop — outcome mastery, next-best action, and practice.
  async getLearningToday() {
    return this.request('/learning/today');
  }

  async getMastery(subject = 'economics') {
    const query = new URLSearchParams();
    if (subject) query.set('subject', subject);
    return this.request(`/mastery?${query.toString()}`);
  }

  async getNextRecommendation(subject = 'economics') {
    const query = new URLSearchParams();
    if (subject) query.set('subject', subject);
    return this.request(`/recommendations/next?${query.toString()}`);
  }

  // Study coach — ported lesson-recommendation engine + HSC syllabus tracking.
  // Degrades gracefully so the coach UI never crashes if the engine errors.
  async getRecommendations(limit = 6) {
    try {
      return await this.request(`/study-coach/recommendations?limit=${limit}`);
    } catch (error) {
      console.warn('getRecommendations failed; returning empty feed', error);
      return { recommendations: [] };
    }
  }

  /** Fire-and-forget feedback events for the recommendation engine. */
  logRecEvents(events) {
    if (!events?.length) return Promise.resolve(null);
    return this.request('/study-coach/rec-events', {
      method: 'POST',
      body: JSON.stringify({ events }),
    }).catch((error) => {
      console.warn('logRecEvents failed; ignoring', error);
      return null;
    });
  }

  async getSyllabusProgress(subject = 'Economics') {
    return this.request(`/study-coach/syllabus?subject=${encodeURIComponent(subject)}`);
  }

  async createPracticeSession({ mode, subject = 'economics', outcomeId, assignmentId, focusId, resourceId, source, returnTo } = {}) {
    return this.request('/practice/sessions', {
      method: 'POST',
      body: JSON.stringify({
        mode,
        subject,
        ...(outcomeId ? { outcomeId } : {}),
        ...(assignmentId ? { assignmentId } : {}),
        ...(focusId ? { focusId } : {}),
        ...(resourceId ? { resourceId } : {}),
        ...(source ? { source } : {}),
        ...(returnTo ? { returnTo } : {}),
      }),
    });
  }

  async getNextAssignedPractice(assignmentId = '') {
    const query = new URLSearchParams();
    if (assignmentId) query.set('assignmentId', assignmentId);
    return this.request(`/teacher-learning/assignments/next${query.toString() ? `?${query.toString()}` : ''}`);
  }

  async getPracticeSession(sessionId) {
    return this.request(`/practice/sessions/${encodeURIComponent(sessionId)}`);
  }

  async savePracticeDraft(sessionId, { questionId, answer, elapsedSeconds }) {
    return this.request(`/practice/sessions/${encodeURIComponent(sessionId)}/draft`, {
      method: 'PATCH',
      body: JSON.stringify({ questionId, answer, elapsedSeconds }),
    });
  }

  async acknowledgePracticeFeedback(sessionId) {
    return this.request(`/practice/sessions/${encodeURIComponent(sessionId)}/feedback`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
  }

  async submitPracticeAnswer(sessionId, { questionId, answer, timeTakenSeconds, idempotencyKey, retry = false }) {
    return this.request(`/practice/sessions/${encodeURIComponent(sessionId)}/answers`, {
      method: 'POST',
      body: JSON.stringify({ questionId, answer, timeTakenSeconds, idempotencyKey, ...(retry ? { retry: true } : {}) }),
    });
  }

  async completePracticeSession(sessionId) {
    return this.request(`/practice/sessions/${encodeURIComponent(sessionId)}/complete`, {
      method: 'POST',
    });
  }

  // Curriculum Studio — teacher-reviewed, versioned subject packs.
  async getSubjectPacks() {
    return this.request('/subject-packs');
  }

  async getPublishedSubjectPacks(subject) {
    const query = subject ? `?subject=${encodeURIComponent(subject)}` : '';
    return this.request(`/subject-packs/published${query}`);
  }

  async getSubjectPack(packId) {
    return this.request(`/subject-packs/${encodeURIComponent(packId)}`);
  }

  async importSubjectPack(payload) {
    return this.request('/subject-packs/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createBusinessStudiesSubjectPack() {
    return this.request('/subject-packs/templates/business-studies-2010', { method: 'POST' });
  }

  async createSubjectPackOutcome(packId, payload) {
    return this.request(`/subject-packs/${encodeURIComponent(packId)}/outcomes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateSubjectPackOutcome(packId, outcomeId, payload) {
    return this.request(`/subject-packs/${encodeURIComponent(packId)}/outcomes/${encodeURIComponent(outcomeId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async createSubjectPackQuestion(packId, payload) {
    return this.request(`/subject-packs/${encodeURIComponent(packId)}/questions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateSubjectPackQuestion(packId, questionId, payload) {
    return this.request(`/subject-packs/${encodeURIComponent(packId)}/questions/${encodeURIComponent(questionId)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async transitionSubjectPackQuestion(packId, questionId, status, humanReviewed = false) {
    return this.request(`/subject-packs/${encodeURIComponent(packId)}/questions/${encodeURIComponent(questionId)}/lifecycle`, {
      method: 'POST',
      body: JSON.stringify({ status, humanReviewed }),
    });
  }

  async resolveSubjectPackReviewItem(packId, itemId, optionId, note = '') {
    return this.request(`/subject-packs/${encodeURIComponent(packId)}/review-items/${encodeURIComponent(itemId)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ optionId, note }),
    });
  }

  async reopenSubjectPackReviewItem(packId, itemId) {
    return this.request(`/subject-packs/${encodeURIComponent(packId)}/review-items/${encodeURIComponent(itemId)}/reopen`, {
      method: 'POST',
    });
  }

  async publishSubjectPack(packId) {
    return this.request(`/subject-packs/${encodeURIComponent(packId)}/publish`, { method: 'POST' });
  }

  async createSubjectPackVersion(packId) {
    return this.request(`/subject-packs/${encodeURIComponent(packId)}/versions`, { method: 'POST' });
  }

  async archiveSubjectPack(packId) {
    return this.request(`/subject-packs/${encodeURIComponent(packId)}/archive`, { method: 'POST' });
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
   * Affiliate listings filtered by type + budget.
   * Falls back to the bundled sample dataset when the backend is unavailable
   * (the endpoint is not yet shipped) so <AffiliateListings /> always renders.
   * Never rejects — resolves to an array even on failure.
   */
  async getAffiliateListings(type, maxBudget) {
    try {
      const qs = new URLSearchParams();
      if (type) qs.set('type', type);
      if (maxBudget != null) qs.set('maxBudget', maxBudget);
      const data = await this.request(`/affiliates/listings?${qs}`);
      if (Array.isArray(data?.listings)) return data.listings;
    } catch {
      // Backend not yet shipped — fall through to sample data.
    }
    const { sampleListings } = await import('../components/affiliates/sampleListings.js');
    return sampleListings(type, maxBudget);
  }

  // Live hosted quiz sessions (Kahoot-style) — REST covers create/join/resume
  // only; gameplay itself runs over Socket.IO (see src/services/liveSocket.js).
  async createLiveSession(lessonId, { classroomId, questionSeconds } = {}) {
    return this.request('/live/sessions', {
      method: 'POST',
      body: JSON.stringify({ lessonId, classroomId, questionSeconds }),
    });
  }

  /** `idOrCode` accepts either the session id (right after creation) or its short code. */
  async getLiveSession(idOrCode) {
    return this.request(`/live/sessions/${idOrCode}`);
  }

  async previewLiveSessionByCode(code) {
    return this.request(`/live/code/${encodeURIComponent(code)}`);
  }

  async joinLiveSession(code, nickname) {
    return this.request('/live/join', {
      method: 'POST',
      body: JSON.stringify({ code, nickname }),
    });
  }

  /**
   * Proxied image URL for hosts that may be blocked or don't hotlink (Reddit, Imgur, Google Drive, Cloudinary).
   * Backend fetches the image so the browser only hits your API.
   */
  // Study forum — Category -> Thread -> Post, pre-moderated (see backend/routes/forum.js).
  async getForumCategories() {
    return this.request('/forum/categories');
  }

  async createForumCategory(payload) {
    return this.request('/forum/categories', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateForumCategory(categoryId, payload) {
    return this.request(`/forum/categories/${categoryId}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async getForumCategoryThreads(slug, { sort, page, limit, tag, solved, megathread } = {}) {
    const qs = new URLSearchParams();
    if (sort) qs.set('sort', sort);
    if (page) qs.set('page', page);
    if (limit) qs.set('limit', limit);
    if (tag) qs.set('tag', tag);
    if (solved !== undefined && solved !== null) qs.set('solved', solved);
    if (megathread) qs.set('megathread', 'true');
    const query = qs.toString();
    return this.request(`/forum/categories/${encodeURIComponent(slug)}/threads${query ? `?${query}` : ''}`);
  }

  // Reddit-style aggregate home feed — approved threads across every board.
  async getForumThreads({ sort, page, limit, tag, solved } = {}) {
    const qs = new URLSearchParams();
    if (sort) qs.set('sort', sort);
    if (page) qs.set('page', page);
    if (limit) qs.set('limit', limit);
    if (tag) qs.set('tag', tag);
    if (solved !== undefined && solved !== null) qs.set('solved', solved);
    const query = qs.toString();
    return this.request(`/forum/threads${query ? `?${query}` : ''}`);
  }

  async searchForum({ q, subject, tag, solved, page, limit } = {}) {
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (subject) qs.set('subject', subject);
    if (tag) qs.set('tag', tag);
    if (solved !== undefined && solved !== null) qs.set('solved', solved);
    if (page) qs.set('page', page);
    if (limit) qs.set('limit', limit);
    return this.request(`/forum/search?${qs.toString()}`);
  }

  async createForumThread(categoryId, payload) {
    return this.request(`/forum/categories/${categoryId}/threads`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async getForumThread(threadId) {
    return this.request(`/forum/threads/${threadId}`);
  }

  async updateForumThread(threadId, payload) {
    return this.request(`/forum/threads/${threadId}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  async deleteForumThread(threadId, note) {
    return this.request(`/forum/threads/${threadId}/delete`, { method: 'POST', body: JSON.stringify({ note }) });
  }

  async restoreForumThread(threadId) {
    return this.request(`/forum/threads/${threadId}/restore`, { method: 'POST' });
  }

  async pinForumThread(threadId, pinned) {
    return this.request(`/forum/threads/${threadId}/${pinned ? 'pin' : 'unpin'}`, { method: 'POST' });
  }

  async lockForumThread(threadId, locked) {
    return this.request(`/forum/threads/${threadId}/${locked ? 'lock' : 'unlock'}`, { method: 'POST' });
  }

  async markForumBestAnswer(threadId, postId) {
    return this.request(`/forum/threads/${threadId}/best-answer`, { method: 'POST', body: JSON.stringify({ postId }) });
  }

  async clearForumBestAnswer(threadId) {
    return this.request(`/forum/threads/${threadId}/best-answer/clear`, { method: 'POST' });
  }

  async markForumMegathread(threadId, isMegathread) {
    return this.request(`/forum/threads/${threadId}/megathread${isMegathread ? '' : '/clear'}`, { method: 'POST' });
  }

  async createForumPost(threadId, payload) {
    return this.request(`/forum/threads/${threadId}/posts`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateForumPost(postId, content) {
    return this.request(`/forum/posts/${postId}`, { method: 'PATCH', body: JSON.stringify({ content }) });
  }

  async deleteForumPost(postId, note) {
    return this.request(`/forum/posts/${postId}/delete`, { method: 'POST', body: JSON.stringify({ note }) });
  }

  async restoreForumPost(postId) {
    return this.request(`/forum/posts/${postId}/restore`, { method: 'POST' });
  }

  async likeForumThread(threadId, liked) {
    return this.request(`/forum/threads/${threadId}/like`, { method: liked ? 'POST' : 'DELETE' });
  }

  async likeForumPost(postId, liked) {
    return this.request(`/forum/posts/${postId}/like`, { method: liked ? 'POST' : 'DELETE' });
  }

  // Study reactions — "Helpful" / "Clear explanation" / "This helped me".
  async reactToForumThread(threadId, type, active) {
    return this.request(`/forum/threads/${threadId}/reactions${active ? '' : `/${type}`}`, {
      method: active ? 'POST' : 'DELETE',
      ...(active ? { body: JSON.stringify({ type }) } : {}),
    });
  }

  async reactToForumPost(postId, type, active) {
    return this.request(`/forum/posts/${postId}/reactions${active ? '' : `/${type}`}`, {
      method: active ? 'POST' : 'DELETE',
      ...(active ? { body: JSON.stringify({ type }) } : {}),
    });
  }

  // Saved threads — personal "Revision list".
  async saveForumThread(threadId, saved) {
    return this.request(`/forum/threads/${threadId}/save`, { method: saved ? 'POST' : 'DELETE' });
  }

  async getForumSavedThreads(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/forum/me/saved${qs ? `?${qs}` : ''}`);
  }

  // Contribution profile.
  async getForumUserProfile(userId) {
    return this.request(`/forum/users/${userId}/profile`);
  }

  // Polls — "study check" attached to a thread.
  async voteForumPoll(pollId, optionId) {
    return this.request(`/forum/polls/${pollId}/vote`, { method: 'POST', body: JSON.stringify({ optionId }) });
  }

  async clearForumPollVote(pollId) {
    return this.request(`/forum/polls/${pollId}/vote`, { method: 'DELETE' });
  }

  // Follow a subject (repurposed subscription) — drives notification fanout.
  async followForumCategory(categoryId, following) {
    return this.request(`/forum/categories/${categoryId}/follow`, { method: following ? 'POST' : 'DELETE' });
  }

  async getForumSubscriptions() {
    return this.request('/forum/me/subscriptions');
  }

  async getForumNotifications(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/forum/me/notifications${qs ? `?${qs}` : ''}`);
  }

  async markForumNotificationRead(id) {
    return this.request(`/forum/me/notifications/${id}/read`, { method: 'POST' });
  }

  async markAllForumNotificationsRead() {
    return this.request('/forum/me/notifications/read-all', { method: 'POST' });
  }

  async reportForumThread(threadId, { reason, details }) {
    return this.request(`/forum/threads/${threadId}/reports`, { method: 'POST', body: JSON.stringify({ reason, details }) });
  }

  async reportForumPost(postId, { reason, details }) {
    return this.request(`/forum/posts/${postId}/reports`, { method: 'POST', body: JSON.stringify({ reason, details }) });
  }

  async getForumModerationPending(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/forum/moderation/pending${qs ? `?${qs}` : ''}`);
  }

  async approveForumThread(threadId) {
    return this.request(`/forum/moderation/threads/${threadId}/approve`, { method: 'POST' });
  }

  async rejectForumThread(threadId, note) {
    return this.request(`/forum/moderation/threads/${threadId}/reject`, { method: 'POST', body: JSON.stringify({ note }) });
  }

  async approveForumPost(postId) {
    return this.request(`/forum/moderation/posts/${postId}/approve`, { method: 'POST' });
  }

  async rejectForumPost(postId, note) {
    return this.request(`/forum/moderation/posts/${postId}/reject`, { method: 'POST', body: JSON.stringify({ note }) });
  }

  async getForumModerationReports(status = 'pending') {
    return this.request(`/forum/moderation/reports?status=${encodeURIComponent(status)}`);
  }

  async resolveForumModerationReport(reportId, { status, note }) {
    return this.request(`/forum/moderation/reports/${reportId}`, { method: 'PATCH', body: JSON.stringify({ status, note }) });
  }

  async getForumModerationActions(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/forum/moderation/actions${qs ? `?${qs}` : ''}`);
  }

  async getForumSanctions() {
    return this.request('/forum/moderation/sanctions');
  }

  async issueForumSanction(userId, payload) {
    return this.request(`/forum/moderation/users/${userId}/sanctions`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async liftForumSanction(sanctionId) {
    return this.request(`/forum/moderation/sanctions/${sanctionId}/lift`, { method: 'POST' });
  }

  async getForumMyStatus() {
    return this.request('/forum/me/status');
  }

  async getForumMyThreads() {
    return this.request('/forum/me/threads');
  }

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

export { ApiService };
export default new ApiService();
