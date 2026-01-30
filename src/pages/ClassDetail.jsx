import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const ClassDetail = () => {
  const { classId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showNewAssignment, setShowNewAssignment] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    courseId: '',
    lessonId: '',
  });
  const [availableLessons, setAvailableLessons] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [postingAnnouncement, setPostingAnnouncement] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    content: '',
    attachmentUrl: '',
  });
  const [activeTab, setActiveTab] = useState('stream'); // 'stream' | 'classwork' | 'people'
  const [announcementComments, setAnnouncementComments] = useState({});
  const [assignmentComments, setAssignmentComments] = useState({});
  const [openCommentSections, setOpenCommentSections] = useState({ announcement: new Set(), assignment: new Set() });
  const [commentDrafts, setCommentDrafts] = useState({ announcement: {}, assignmentClass: {}, assignmentPrivate: {} });
  const [assignmentPrivateTarget, setAssignmentPrivateTarget] = useState({}); // teacher: assignmentId -> student userId for private reply
  const [loadingComments, setLoadingComments] = useState({ announcement: null, assignment: null });
  const [postingComment, setPostingComment] = useState(false);
  const initialCommentOpenDone = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.getClassDetail(classId);
      setData(res);
      // Load all published courses/lessons once for teachers to link assignments
      if (res?.membership?.role === 'teacher') {
        try {
          const coursesRes = await api.getCourses({ limit: 100 });
          const courseList = coursesRes.courses || coursesRes || [];
          const lessons = [];
          courseList.forEach((c) => {
            (c.lessons || []).forEach((l) => {
              lessons.push({
                id: l.id,
                title: l.title,
                courseId: c.id,
                courseTitle: c.title,
              });
            });
          });
          setAvailableLessons(lessons);
        } catch (e) {
          console.warn('Failed to load lessons for assignment linking:', e?.message || e);
        }
      }
    } catch (e) {
      console.error('Load class detail error:', e);
      setError(e.message || 'Failed to load class');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, classId]);

  // Reset "open comments by default" when switching class
  useEffect(() => {
    initialCommentOpenDone.current = false;
  }, [classId]);

  // When class detail has commentCount > 0, open those sections by default and fetch comments (fetch inside effect so we use data.classroom.id, no stale closure)
  useEffect(() => {
    if (!data?.classroom?.id || initialCommentOpenDone.current) return;
    const announcements = data.announcements || [];
    const assignments = data.assignments || [];
    const toOpenAnnouncement = announcements.filter((a) => a?.commentCount > 0).map((a) => a.id);
    const toOpenAssignment = assignments.filter((a) => a?.commentCount > 0).map((a) => a.id);
    if (toOpenAnnouncement.length === 0 && toOpenAssignment.length === 0) return;
    initialCommentOpenDone.current = true;
    const classId = data.classroom.id;
    setOpenCommentSections((prev) => ({
      announcement: new Set([...prev.announcement, ...toOpenAnnouncement]),
      assignment: new Set([...prev.assignment, ...toOpenAssignment]),
    }));
    toOpenAnnouncement.forEach(async (announcementId) => {
      setLoadingComments((prev) => ({ ...prev, announcement: announcementId }));
      try {
        const list = await api.getAnnouncementComments(classId, announcementId);
        setAnnouncementComments((prev) => ({ ...prev, [announcementId]: Array.isArray(list) ? list : [] }));
      } catch (e) {
        console.warn('Failed to load announcement comments', e);
        setAnnouncementComments((prev) => ({ ...prev, [announcementId]: [] }));
      } finally {
        setLoadingComments((prev) => ({ ...prev, announcement: null }));
      }
    });
    toOpenAssignment.forEach(async (assignmentId) => {
      setLoadingComments((prev) => ({ ...prev, assignment: assignmentId }));
      try {
        const list = await api.getAssignmentComments(classId, assignmentId);
        setAssignmentComments((prev) => ({ ...prev, [assignmentId]: Array.isArray(list) ? list : [] }));
      } catch (e) {
        console.warn('Failed to load assignment comments', e);
        setAssignmentComments((prev) => ({ ...prev, [assignmentId]: [] }));
      } finally {
        setLoadingComments((prev) => ({ ...prev, assignment: null }));
      }
    });
  }, [data]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Sign in to view this class
          </h2>
          <button
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading class...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Something went wrong
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={() => navigate('/classes')}
            className="btn-primary"
          >
            Back to classes
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { classroom, membership, members, assignments, announcements = [], leaderboard = [] } = data;
  const isTeacher = membership?.role === 'teacher';

  const teachers = members.filter((m) => m.role === 'teacher');
  const students = members.filter((m) => m.role === 'student');

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!assignmentForm.title.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.createAssignment(classroom.id, {
        title: assignmentForm.title.trim(),
        description: assignmentForm.description.trim(),
        dueDate: assignmentForm.dueDate || null,
        courseId: assignmentForm.lessonId
          ? assignmentForm.courseId || null
          : null,
        lessonId: assignmentForm.lessonId || null,
      });
      setShowNewAssignment(false);
      setAssignmentForm({
        title: '',
        description: '',
        dueDate: '',
        courseId: '',
        lessonId: '',
      });
      await load();
    } catch (err) {
      console.error('Create assignment error:', err);
      setError(err.message || 'Failed to create assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteAssignment = async (assignmentId) => {
    try {
      await api.completeAssignment(assignmentId);
      await load();
    } catch (err) {
      console.error('Complete assignment error:', err);
      setError(err.message || 'Failed to update assignment');
    }
  };

  const handleUncompleteAssignment = async (assignmentId) => {
    try {
      await api.uncompleteAssignment(assignmentId);
      await load();
    } catch (err) {
      console.error('Uncomplete assignment error:', err);
      setError(err.message || 'Failed to update assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    const ok = window.confirm('Delete this assignment? This cannot be undone.');
    if (!ok) return;
    try {
      await api.deleteAssignment(classroom.id, assignmentId);
      await load();
    } catch (err) {
      console.error('Delete assignment error:', err);
      setError(err.message || 'Failed to delete assignment');
    }
  };

  const handleLeaveClass = async () => {
    const ok = window.confirm('Leave this class?');
    if (!ok) return;
    try {
      await api.leaveClass(classroom.id);
      navigate('/classes');
    } catch (err) {
      console.error('Leave class error:', err);
      setError(err.message || 'Failed to leave class');
    }
  };

  const handleDeleteClass = async () => {
    const ok = window.confirm(
      'Delete this class? This deletes the class, all assignments, and completion data.'
    );
    if (!ok) return;
    try {
      await api.deleteClass(classroom.id);
      navigate('/classes');
    } catch (err) {
      console.error('Delete class error:', err);
      setError(err.message || 'Failed to delete class');
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.content.trim()) return;
    setPostingAnnouncement(true);
    setError('');
    try {
      await api.createAnnouncement(classroom.id, {
        content: announcementForm.content.trim(),
        attachmentUrl: announcementForm.attachmentUrl.trim() || null,
      });
      setAnnouncementForm({ content: '', attachmentUrl: '' });
      await load();
    } catch (err) {
      console.error('Create announcement error:', err);
      setError(err.message || 'Failed to post announcement');
    } finally {
      setPostingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    const ok = window.confirm('Delete this announcement?');
    if (!ok) return;
    try {
      await api.deleteAnnouncement(classroom.id, announcementId);
      await load();
    } catch (err) {
      console.error('Delete announcement error:', err);
      setError(err.message || 'Failed to delete announcement');
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const sec = Math.floor((now - d) / 1000);
    if (sec < 60) return 'Just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const getInitials = (author) => {
    if (!author) return '?';
    const first = author.firstName?.charAt(0) || '';
    const last = author.lastName?.charAt(0) || '';
    if (first || last) return (first + last).toUpperCase();
    return author.email?.charAt(0)?.toUpperCase() || '?';
  };

  const fetchAnnouncementComments = async (announcementId) => {
    if (announcementComments[announcementId]) return;
    setLoadingComments((prev) => ({ ...prev, announcement: announcementId }));
    try {
      const list = await api.getAnnouncementComments(classroom.id, announcementId);
      setAnnouncementComments((prev) => ({ ...prev, [announcementId]: Array.isArray(list) ? list : [] }));
    } catch (e) {
      console.warn('Failed to load announcement comments', e);
      setAnnouncementComments((prev) => ({ ...prev, [announcementId]: [] }));
    } finally {
      setLoadingComments((prev) => ({ ...prev, announcement: null }));
    }
  };

  const fetchAssignmentComments = async (assignmentId) => {
    if (assignmentComments[assignmentId]) return;
    setLoadingComments((prev) => ({ ...prev, assignment: assignmentId }));
    try {
      const list = await api.getAssignmentComments(classroom.id, assignmentId);
      setAssignmentComments((prev) => ({ ...prev, [assignmentId]: Array.isArray(list) ? list : [] }));
    } catch (e) {
      console.warn('Failed to load assignment comments', e);
      setAssignmentComments((prev) => ({ ...prev, [assignmentId]: [] }));
    } finally {
      setLoadingComments((prev) => ({ ...prev, assignment: null }));
    }
  };

  const toggleAnnouncementComments = (announcementId) => {
    setOpenCommentSections((prev) => {
      const next = new Set(prev.announcement);
      if (next.has(announcementId)) next.delete(announcementId);
      else next.add(announcementId);
      return { ...prev, announcement: next };
    });
    fetchAnnouncementComments(announcementId);
  };

  const toggleAssignmentComments = (assignmentId) => {
    setOpenCommentSections((prev) => {
      const next = new Set(prev.assignment);
      if (next.has(assignmentId)) next.delete(assignmentId);
      else next.add(assignmentId);
      return { ...prev, assignment: next };
    });
    fetchAssignmentComments(assignmentId);
  };

  const handlePostAnnouncementComment = async (announcementId) => {
    const draft = commentDrafts.announcement[announcementId];
    if (!draft || !draft.trim()) return;
    setPostingComment(true);
    try {
      const created = await api.createAnnouncementComment(classroom.id, announcementId, draft.trim());
      setAnnouncementComments((prev) => ({
        ...prev,
        [announcementId]: [...(prev[announcementId] || []), created],
      }));
      setCommentDrafts((prev) => ({ ...prev, announcement: { ...prev.announcement, [announcementId]: '' } }));
    } catch (e) {
      console.error('Post announcement comment error', e);
      setError(e.message || 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handlePostAssignmentComment = async (assignmentId, { isPrivate, targetUserId }) => {
    const key = isPrivate ? 'assignmentPrivate' : 'assignmentClass';
    const draft = commentDrafts[key][assignmentId];
    if (!draft || !draft.trim()) return;
    setPostingComment(true);
    try {
      const created = await api.createAssignmentComment(classroom.id, assignmentId, {
        content: draft.trim(),
        isPrivate: !!isPrivate,
        targetUserId: targetUserId || undefined,
      });
      setAssignmentComments((prev) => ({
        ...prev,
        [assignmentId]: [...(prev[assignmentId] || []), created],
      }));
      setCommentDrafts((prev) => ({ ...prev, [key]: { ...prev[key], [assignmentId]: '' } }));
    } catch (e) {
      console.error('Post assignment comment error', e);
      setError(e.message || 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const getAvatarColor = (name) => {
    if (!name) return 'bg-gradient-to-br from-gray-400 to-gray-600';
    const colors = [
      'bg-gradient-to-br from-blue-400 to-blue-600',
      'bg-gradient-to-br from-purple-400 to-purple-600',
      'bg-gradient-to-br from-pink-400 to-pink-600',
      'bg-gradient-to-br from-indigo-400 to-indigo-600',
      'bg-gradient-to-br from-cyan-400 to-cyan-600',
      'bg-gradient-to-br from-emerald-400 to-emerald-600',
      'bg-gradient-to-br from-orange-400 to-orange-600',
      'bg-gradient-to-br from-rose-400 to-rose-600',
    ];
    const hash = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <button
                onClick={() => navigate('/classes')}
                className="mb-3 inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to classes
              </button>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                {classroom.name}
              </h1>
              {classroom.description ? (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  {classroom.description}
                </p>
              ) : null}
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Class code:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{classroom.code}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 rounded-xl">
                <div className={`w-8 h-8 rounded-full ${getAvatarColor(user?.firstName + user?.lastName)} flex items-center justify-center text-white text-xs font-bold shadow-md`}>
                  {getInitials(user)}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {membership?.role === 'teacher' ? '👨‍🏫 Teacher' : '👨‍🎓 Student'}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleLeaveClass}
                  className="px-4 py-2 rounded-lg text-sm font-medium border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:scale-105"
                >
                  Leave class
                </button>
                {isTeacher && (
                  <button
                    type="button"
                    onClick={handleDeleteClass}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md transition-all hover:scale-105"
                  >
                    Delete class
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl border-2 border-red-300 dark:border-red-700 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 text-sm text-red-800 dark:text-red-200 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span className="font-semibold">{error}</span>
            </div>
          </div>
        )}

        {/* Tab bar — only one "page" (Stream / Classwork / People) is shown below */}
        <nav className="flex gap-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-1.5 shadow-md border border-gray-200/50 dark:border-gray-700/50" aria-label="Class tabs">
          <button
            type="button"
            onClick={() => setActiveTab('stream')}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeTab === 'stream'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            💬 Stream
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('classwork')}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeTab === 'classwork'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            📚 Classwork
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('people')}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeTab === 'people'
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            👥 People
          </button>
        </nav>

        {/* Page content: only the active tab is rendered — screen changes, no route change */}
        {activeTab === 'stream' && (
        <div className="min-h-[50vh] pt-6" role="region" aria-label="Stream page">
          <div className="space-y-5">
          {/* Composer: teachers only (like Google Classroom) */}
          {isTeacher && (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
            <form onSubmit={handlePostAnnouncement} className="p-5">
              <div className="flex gap-4">
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full ${getAvatarColor(user?.firstName + user?.lastName)} flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-white dark:ring-gray-800`}
                  aria-hidden
                >
                  {getInitials(user)}
                </div>
                <div className="flex-1 min-w-0">
                  <textarea
                    value={announcementForm.content}
                    onChange={(e) =>
                      setAnnouncementForm((prev) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="Share something with your class..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-[15px] leading-relaxed resize-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all"
                  />
                  <input
                    type="url"
                    value={announcementForm.attachmentUrl}
                    onChange={(e) =>
                      setAnnouncementForm((prev) => ({ ...prev, attachmentUrl: e.target.value }))
                    }
                    placeholder="🔗 Add attachment (image, video, or link URL)"
                    className="mt-3 w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all"
                  />
                  <div className="flex justify-end mt-4">
                    <button
                      type="submit"
                      disabled={postingAnnouncement || !announcementForm.content.trim()}
                      className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      {postingAnnouncement ? '⏳ Posting...' : '✨ Post'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
          )}

          {/* Announcement cards — visible to both teachers and students */}
          {!Array.isArray(announcements) || announcements.length === 0 ? (
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-12 text-center">
              <div className="text-5xl mb-4">📢</div>
              <p className="text-gray-600 dark:text-gray-300 text-base font-medium">
                {isTeacher
                  ? 'No announcements yet. Share something with your class above!'
                  : 'No announcements yet. Check back soon!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((a) => {
                if (!a || !a.id) return null;
                const isAuthor = a.author?.id === user?.id;
                const canDelete = isTeacher || isAuthor;
                const authorName = a.author ? `${a.author.firstName} ${a.author.lastName}` : 'Unknown';
                return (
                  <div
                    key={a.id}
                    className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.01]"
                  >
                    <div className="p-5">
                      <div className="flex gap-4">
                        <div
                          className={`flex-shrink-0 w-12 h-12 rounded-full ${getAvatarColor(authorName)} flex items-center justify-center text-white text-sm font-bold shadow-lg ring-2 ring-white dark:ring-gray-800`}
                          aria-hidden
                        >
                          {getInitials(a.author)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-baseline gap-2 min-w-0">
                              {a.author?.id ? (
                                <Link to={`/profile/${a.author.id}`} className="text-base font-semibold text-gray-900 dark:text-white truncate hover:text-blue-600 dark:hover:text-blue-400">
                                  {authorName}
                                </Link>
                              ) : (
                                <span className="text-base font-semibold text-gray-900 dark:text-white truncate">
                                  {authorName}
                                </span>
                              )}
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 bg-gray-100 dark:bg-gray-700/50 px-2 py-0.5 rounded-full">
                                {formatRelativeTime(a.createdAt)}
                              </span>
                            </div>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAnnouncement(a.id)}
                                className="flex-shrink-0 text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
                                title="Delete announcement"
                                aria-label="Delete announcement"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <p className="text-[15px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                            {a.content || ''}
                          </p>
                          {Array.isArray(a.attachments) && a.attachments.length > 0 && (
                            <div className="mt-3 space-y-3">
                              {a.attachments.map((att, idx) => {
                                if (!att || !att.url) return null;
                                if (att.type === 'image') {
                                  return (
                                    <img
                                      key={idx}
                                      src={att.url}
                                      alt=""
                                      className="max-h-72 w-full object-contain rounded-lg border border-gray-200 dark:border-gray-600"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  );
                                }
                                if (att.type === 'video') {
                                  const videoId = att.url.match(
                                    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/
                                  )?.[1];
                                  if (videoId) {
                                    return (
                                      <div
                                        key={idx}
                                        className="relative pt-[56.25%] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-black"
                                      >
                                        <iframe
                                          src={`https://www.youtube.com/embed/${videoId}`}
                                          title="Announcement video"
                                          className="absolute inset-0 w-full h-full"
                                          frameBorder="0"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                          allowFullScreen
                                        />
                                      </div>
                                    );
                                  }
                                }
                                return (
                                  <a
                                    key={idx}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                                  >
                                    <span className="flex-shrink-0 text-gray-400 dark:text-gray-500">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    </span>
                                    {att.url}
                                  </a>
                                );
                              })}
                            </div>
                          )}
                          {/* Comments on announcement (all public) */}
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                              type="button"
                              onClick={() => toggleAnnouncementComments(a.id)}
                              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              {openCommentSections.announcement.has(a.id) ? 'Hide comments' : 'Comments'}
                              {(announcementComments[a.id]?.length ?? 0) > 0 && ` (${announcementComments[a.id].length})`}
                            </button>
                            {openCommentSections.announcement.has(a.id) && (
                              <div className="mt-3 space-y-2 min-h-[2rem]">
                                {loadingComments.announcement === a.id || announcementComments[a.id] === undefined ? (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 py-1">Loading comments…</p>
                                ) : (
                                  <>
                                    {(announcementComments[a.id] || []).map((c) => (
                                      <div key={c.id} className="flex gap-2 text-sm">
                                        <span className="shrink-0">
                                          {c.author?.id ? (
                                            <Link to={`/profile/${c.author.id}`} className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                                              {c.author.firstName} {c.author.lastName}
                                            </Link>
                                          ) : (
                                            <span className="font-medium text-gray-900 dark:text-white">Unknown</span>
                                          )}:
                                        </span>
                                        <span className="text-gray-700 dark:text-gray-300">{c.content}</span>
                                        <span className="text-xs text-gray-400 shrink-0">{formatRelativeTime(c.createdAt)}</span>
                                      </div>
                                    ))}
                                    <div className="flex gap-2 mt-2">
                                      <input
                                        type="text"
                                        value={commentDrafts.announcement[a.id] || ''}
                                        onChange={(e) =>
                                          setCommentDrafts((prev) => ({
                                            ...prev,
                                            announcement: { ...prev.announcement, [a.id]: e.target.value },
                                          }))
                                        }
                                        placeholder="Add a class comment..."
                                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-500"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handlePostAnnouncementComment(a.id);
                                          }
                                        }}
                                      />
                                      <button
                                        type="button"
                                        disabled={postingComment || !(commentDrafts.announcement[a.id] || '').trim()}
                                        onClick={() => handlePostAnnouncementComment(a.id)}
                                        className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                      >
                                        Post
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
        )}

        {/* Classwork page — only this or Stream or People is visible */}
        {activeTab === 'classwork' && (
        <div className="min-h-[50vh] pt-6" role="region" aria-label="Classwork page">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Classwork
            </h2>
              {isTeacher && (
                <button
                  onClick={() => setShowNewAssignment(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold hover:from-blue-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  ➕ New assignment
                </button>
              )}
            </div>
            {assignments.length === 0 ? (
              <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-12 text-center">
                <div className="text-5xl mb-4">📝</div>
                <p className="text-gray-600 dark:text-gray-300 text-base font-medium">
                  No assignments yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((a) => {
                  const isCompleted = a.statusForCurrentUser === 'completed';
                  const totalStudents = students.length;
                  const completedCount = Array.isArray(a.submissions)
                    ? a.submissions.filter((s) => s.status === 'completed').length
                    : undefined;
                  const commentsList = assignmentComments[a.id] || [];
                  const classComments = commentsList.filter((c) => !c.isPrivate);
                  const privateComments = commentsList.filter((c) => c.isPrivate);
                  const totalComments = commentsList.length;
                  return (
                    <div
                      key={a.id}
                      className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                            {a.title}
                          </h3>
                          {a.description && (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 mb-3">
                              {a.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 items-center">
                            {a.dueDate && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-semibold">
                                📅 Due {new Date(a.dueDate).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                            {a.lesson && (
                              <Link
                                to={`/courses/${a.course?.id || ''}/lessons/${a.lesson.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                              >
                                📖 {a.lesson.title}
                              </Link>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {isTeacher ? (
                            <>
                              {typeof completedCount === 'number' && (
                                <div className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl">
                                  <span className="text-xs font-bold text-green-700 dark:text-green-300">
                                    ✅ {completedCount}/{totalStudents}
                                  </span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteAssignment(a.id)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                              >
                                🗑️ Delete
                              </button>
                            </>
                          ) : (
                            <span
                              className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
                                isCompleted
                                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 text-green-700 dark:text-green-300'
                                  : 'bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/40 dark:to-amber-900/40 text-yellow-700 dark:text-yellow-300'
                              }`}
                            >
                              {isCompleted ? '✅ Completed' : '📋 Assigned'}
                            </span>
                          )}
                          {!isTeacher && !isCompleted && (
                            <button
                              onClick={() => handleCompleteAssignment(a.id)}
                              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                            >
                              ✨ Mark as done
                            </button>
                          )}
                          {!isTeacher && isCompleted && !a.lesson && (
                            <button
                              onClick={() => handleUncompleteAssignment(a.id)}
                              className="px-4 py-2 rounded-xl text-xs font-semibold border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                            >
                              ↪️ Undo
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Comments on assignment (class + private) */}
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          type="button"
                          onClick={() => toggleAssignmentComments(a.id)}
                          className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {openCommentSections.assignment.has(a.id) ? 'Hide comments' : 'Comments'}
                          {totalComments > 0 && ` (${totalComments})`}
                        </button>
                        {openCommentSections.assignment.has(a.id) && (
                          <div className="mt-3 space-y-4 min-h-[2rem]">
                            {loadingComments.assignment === a.id || assignmentComments[a.id] === undefined ? (
                              <p className="text-sm text-gray-500 dark:text-gray-400 py-1">Loading comments…</p>
                            ) : (
                              <>
                                {/* Class comments (public) */}
                                <div>
                                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Class comments
                                  </h4>
                                  {classComments.map((c) => (
                                    <div key={c.id} className="flex gap-2 text-sm mb-2">
                                      <span className="shrink-0">
                                        {c.author?.id ? (
                                          <Link to={`/profile/${c.author.id}`} className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                                            {c.author.firstName} {c.author.lastName}
                                          </Link>
                                        ) : (
                                          <span className="font-medium text-gray-900 dark:text-white">Unknown</span>
                                        )}:
                                      </span>
                                      <span className="text-gray-700 dark:text-gray-300">{c.content}</span>
                                      <span className="text-xs text-gray-400 shrink-0">{formatRelativeTime(c.createdAt)}</span>
                                    </div>
                                  ))}
                                  <div className="flex gap-2 mt-2">
                                    <input
                                      type="text"
                                      value={commentDrafts.assignmentClass[a.id] || ''}
                                      onChange={(e) =>
                                        setCommentDrafts((prev) => ({
                                          ...prev,
                                          assignmentClass: { ...prev.assignmentClass, [a.id]: e.target.value },
                                        }))
                                      }
                                      placeholder="Add a class comment..."
                                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-500"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                          e.preventDefault();
                                          handlePostAssignmentComment(a.id, { isPrivate: false });
                                        }
                                      }}
                                    />
                                    <button
                                      type="button"
                                      disabled={postingComment || !(commentDrafts.assignmentClass[a.id] || '').trim()}
                                      onClick={() => handlePostAssignmentComment(a.id, { isPrivate: false })}
                                      className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      Post
                                    </button>
                                  </div>
                                </div>

                                {/* Private comments (student–teacher) */}
                                <div>
                                  <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Private comments
                                  </h4>
                                  {privateComments.map((c) => (
                                    <div key={c.id} className="flex gap-2 text-sm mb-2">
                                      <span className="shrink-0">
                                        {c.author?.id ? (
                                          <Link to={`/profile/${c.author.id}`} className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                                            {c.author.firstName} {c.author.lastName}
                                          </Link>
                                        ) : (
                                          <span className="font-medium text-gray-900 dark:text-white">Unknown</span>
                                        )}
                                        {c.targetUser ? (
                                          <>
                                            {' → '}
                                            <Link to={`/profile/${c.targetUser.id}`} className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                                              {c.targetUser.firstName} {c.targetUser.lastName}
                                            </Link>
                                          </>
                                        ) : (
                                          ' (to teacher)'
                                        )}:
                                      </span>
                                      <span className="text-gray-700 dark:text-gray-300">{c.content}</span>
                                      <span className="text-xs text-gray-400 shrink-0">{formatRelativeTime(c.createdAt)}</span>
                                    </div>
                                  ))}
                                  {isTeacher ? (
                                    <div className="flex flex-wrap gap-2 mt-2 items-center">
                                      <select
                                        value={assignmentPrivateTarget[a.id] || ''}
                                        onChange={(e) =>
                                          setAssignmentPrivateTarget((prev) => ({
                                            ...prev,
                                            [a.id]: e.target.value || undefined,
                                          }))
                                        }
                                        className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white"
                                      >
                                        <option value="">Reply to student...</option>
                                        {students.map((s) => (
                                          <option key={s.id} value={s.id}>
                                            {s.firstName} {s.lastName}
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        type="text"
                                        value={commentDrafts.assignmentPrivate[a.id] || ''}
                                        onChange={(e) =>
                                          setCommentDrafts((prev) => ({
                                            ...prev,
                                            assignmentPrivate: { ...prev.assignmentPrivate, [a.id]: e.target.value },
                                          }))
                                        }
                                        placeholder="Private message..."
                                        className="flex-1 min-w-[120px] px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-500"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handlePostAssignmentComment(a.id, {
                                              isPrivate: true,
                                              targetUserId: assignmentPrivateTarget[a.id] || undefined,
                                            });
                                          }
                                        }}
                                      />
                                      <button
                                        type="button"
                                        disabled={
                                          postingComment ||
                                          !(commentDrafts.assignmentPrivate[a.id] || '').trim() ||
                                          !assignmentPrivateTarget[a.id]
                                        }
                                        onClick={() =>
                                          handlePostAssignmentComment(a.id, {
                                            isPrivate: true,
                                            targetUserId: assignmentPrivateTarget[a.id] || undefined,
                                          })
                                        }
                                        className="px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                                      >
                                        Send
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2 mt-2">
                                      <input
                                        type="text"
                                        value={commentDrafts.assignmentPrivate[a.id] || ''}
                                        onChange={(e) =>
                                          setCommentDrafts((prev) => ({
                                            ...prev,
                                            assignmentPrivate: { ...prev.assignmentPrivate, [a.id]: e.target.value },
                                          }))
                                        }
                                        placeholder="Private comment to teacher..."
                                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-500"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handlePostAssignmentComment(a.id, { isPrivate: true });
                                          }
                                        }}
                                      />
                                      <button
                                        type="button"
                                        disabled={postingComment || !(commentDrafts.assignmentPrivate[a.id] || '').trim()}
                                        onClick={() => handlePostAssignmentComment(a.id, { isPrivate: true })}
                                        className="px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                                      >
                                        Send
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
        )}

        {/* People page — only this or Stream or Classwork is visible */}
        {activeTab === 'people' && (
        <div className="min-h-[50vh] pt-6" role="region" aria-label="People page">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-2 border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-6">
                People
              </h2>

              {/* Leaderboard: most assignments completed */}
              {Array.isArray(leaderboard) && leaderboard.length > 0 && (
                <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200/50 dark:border-amber-700/50">
                  <h3 className="text-sm font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="text-lg">🏆</span> Leaderboard — most assignments completed
                  </h3>
                  <ul className="space-y-2">
                    {leaderboard.map((entry, index) => (
                      <li
                        key={entry.userId}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-amber-100 dark:border-amber-800/50 hover:shadow-md transition-all"
                      >
                        <span
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0
                              ? 'bg-amber-400 text-amber-900'
                              : index === 1
                                ? 'bg-gray-300 text-gray-700 dark:bg-gray-500 dark:text-gray-200'
                                : index === 2
                                  ? 'bg-amber-600/80 text-white'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <Link to={`/profile/${entry.userId}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full ${getAvatarColor(entry.firstName + entry.lastName)} flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0`}>
                            {getInitials(entry)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white block hover:text-blue-600 dark:hover:text-blue-400">
                              {entry.firstName} {entry.lastName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {entry.completedCount} assignment{entry.completedCount !== 1 ? 's' : ''} completed
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-lg">👨‍🏫</span> Teachers
                </h3>
                {teachers.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 pl-7">
                    No teachers yet.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {teachers.map((t) => (
                      <li key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700/50 dark:to-gray-700/50 hover:shadow-md transition-all">
                        <Link to={`/profile/${t.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full ${getAvatarColor(t.firstName + t.lastName)} flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0`}>
                            {getInitials(t)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white block hover:text-blue-600 dark:hover:text-blue-400">
                              {t.firstName} {t.lastName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{t.email}</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-lg">👨‍🎓</span> Students ({students.length})
                </h3>
                {students.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 pl-7">
                    No students have joined yet.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {students.map((s) => (
                      <li key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all">
                        <Link to={`/profile/${s.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full ${getAvatarColor(s.firstName + s.lastName)} flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0`}>
                            {getInitials(s)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white block hover:text-blue-600 dark:hover:text-blue-400">
                              {s.firstName} {s.lastName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{s.email}</span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* New assignment modal — overlay, not a tab */}
        {isTeacher && showNewAssignment && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-gray-200/50 dark:border-gray-700/50 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  ✨ New assignment
                </h2>
                <button
                  onClick={() => setShowNewAssignment(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateAssignment} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={assignmentForm.title}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                    className="block w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={assignmentForm.description}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={3}
                    className="block w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Due date (optional)
                  </label>
                  <input
                    type="date"
                    value={assignmentForm.dueDate}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                    className="block w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Link to lesson (optional)
                  </label>
                  <select
                    value={assignmentForm.lessonId}
                    onChange={(e) => {
                      const lessonId = e.target.value;
                      const lesson = availableLessons.find((l) => l.id === lessonId);
                      setAssignmentForm((prev) => ({
                        ...prev,
                        lessonId,
                        courseId: lesson ? lesson.courseId : '',
                      }));
                    }}
                    className="block w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-500 transition-all"
                  >
                    <option value="">No linked lesson</option>
                    {availableLessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.courseTitle} – {l.title}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    💡 If you link a lesson, the assignment will show a direct button to that lesson, and
                    it will be auto-marked complete when students finish the lesson.
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewAssignment(false)}
                    className="px-5 py-2.5 text-sm rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-all duration-200"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 text-sm rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    {submitting ? '⏳ Creating...' : '✨ Create assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassDetail;

