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
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [addTeacherEmail, setAddTeacherEmail] = useState('');
  const [addingTeacher, setAddingTeacher] = useState(false);
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
            (c.modules || []).forEach((m) => {
              (m.lessons || []).forEach((l) => {
                lessons.push({
                  id: l.id,
                  title: l.title,
                  courseId: c.id,
                  courseTitle: c.title,
                });
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
      <div className="min-h-screen flex items-center justify-center page-section-light">
        <div className="text-center max-w-md mx-auto px-6">
          <span className="section-kicker mb-6">Sign In Required</span>
          <h2 className="text-3xl font-extrabold text-black dark:text-white uppercase tracking-tighter mb-6">
            Please Sign In <br />to Continue.
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
      <div className="min-h-screen flex items-center justify-center page-section-light">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Loading class...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center page-section-light">
        <div className="text-center max-w-md mx-auto px-6">
          <span className="section-kicker mb-6 text-red-500">Error</span>
          <h2 className="text-3xl font-extrabold text-black dark:text-white uppercase tracking-tighter mb-6">
            Something Went <br />Wrong.
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest mb-10">{error}</p>
          <button
            onClick={() => navigate('/classes')}
            className="btn-secondary"
          >
            Back to Classes
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { classroom, membership, members, assignments, announcements = [], leaderboard = [] } = data;
  const isTeacher = membership?.role === 'teacher';
  const isOwner = !!membership?.isOwner;

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

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    if (!addTeacherEmail.trim()) return;
    setAddingTeacher(true);
    setError('');
    try {
      await api.addClassTeacher(classroom.id, addTeacherEmail.trim());
      setShowAddTeacher(false);
      setAddTeacherEmail('');
      await load();
    } catch (err) {
      console.error('Add teacher error:', err);
      setError(err.message || 'Failed to add teacher');
    } finally {
      setAddingTeacher(false);
    }
  };

  const handleRemoveMember = async (userId, label) => {
    const ok = window.confirm(`Remove ${label} from this class?`);
    if (!ok) return;
    try {
      await api.removeClassMember(classroom.id, userId);
      await load();
    } catch (err) {
      console.error('Remove member error:', err);
      setError(err.message || 'Failed to remove member');
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

  const handleDeleteAnnouncementComment = async (announcementId, commentId) => {
    setDeletingCommentId(commentId);
    try {
      await api.deleteAnnouncementComment(classroom.id, announcementId, commentId);
      setAnnouncementComments((prev) => ({
        ...prev,
        [announcementId]: (prev[announcementId] || []).filter((c) => c.id !== commentId),
      }));
    } catch (e) {
      console.error('Delete announcement comment error', e);
      setError(e.message || 'Failed to delete comment');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleDeleteAssignmentComment = async (assignmentId, commentId) => {
    setDeletingCommentId(commentId);
    try {
      await api.deleteAssignmentComment(classroom.id, assignmentId, commentId);
      setAssignmentComments((prev) => ({
        ...prev,
        [assignmentId]: (prev[assignmentId] || []).filter((c) => c.id !== commentId),
      }));
    } catch (e) {
      console.error('Delete assignment comment error', e);
      setError(e.message || 'Failed to delete comment');
    } finally {
      setDeletingCommentId(null);
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
    <div className="min-h-screen py-24 px-6">
      <div className="container-custom space-y-12">
        <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-10 animate-slide-up">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="flex-1">
              <button
                onClick={() => navigate('/classes')}
                className="mb-8 inline-flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-brand transition-colors"
              >
                ← Back to Classes
              </button>
              <h1 className="text-4xl md:text-5xl font-extrabold text-black dark:text-white uppercase tracking-tighter mb-4">
                {classroom.name}
              </h1>
              {classroom.description ? (
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest leading-relaxed max-w-2xl">
                  {classroom.description}
                </p>
              ) : null}
              <div className="mt-8 inline-flex items-center gap-4 px-5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest">Class Code:</span>
                <span className="font-mono font-bold text-black dark:text-white text-xs">{classroom.code}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-6">
              <div className="flex items-center gap-4 px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 min-w-[240px]">
                <div className={`w-10 h-10 rounded-sm bg-black dark:bg-white flex items-center justify-center text-white dark:text-black text-xs font-bold`}>
                  {getInitials(user)}
                </div>
                <div>
                  <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Signed in as</p>
                  <p className="text-xs font-bold text-black dark:text-white uppercase tracking-tight">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <span className="text-[9px] text-brand font-bold uppercase tracking-widest mt-1 block">
                    {membership?.role === 'teacher' ? 'Teacher' : 'Student'}
                  </span>
                </div>
              </div>
              <div className="flex gap-4">
                {!isOwner && (
                  <button
                    type="button"
                    onClick={handleLeaveClass}
                    className="px-6 py-3 border border-zinc-200 dark:border-zinc-800 text-[9px] font-bold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
                  >
                    Leave Class
                  </button>
                )}
                {isOwner && (
                  <button
                    type="button"
                    onClick={handleDeleteClass}
                    className="px-6 py-3 bg-red-500 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-red-600 shadow-sm transition-all"
                  >
                    Delete Class
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-6 border border-red-500 text-red-500 text-[10px] font-bold uppercase tracking-widest bg-red-50/50 dark:bg-red-900/10 animate-fade-in">
            Error: {error}
          </div>
        )}

        {/* Tab bar — only one "page" (Stream / Classwork / People) is shown below */}
        <nav className="flex gap-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-1" aria-label="Class tabs">
          <button
            type="button"
            onClick={() => setActiveTab('stream')}
            className={`px-8 py-3 text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${activeTab === 'stream'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-zinc-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800'
              }`}
          >
            Stream
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('classwork')}
            className={`px-8 py-3 text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${activeTab === 'classwork'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-zinc-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800'
              }`}
          >
            Classwork
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('people')}
            className={`px-8 py-3 text-[10px] font-bold uppercase tracking-widest transition-all duration-200 ${activeTab === 'people'
              ? 'bg-black dark:bg-white text-white dark:text-black'
              : 'text-zinc-400 hover:text-black dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800'
              }`}
          >
            People
          </button>
        </nav>
        {/* Page content: only the active tab is rendered — screen changes, no route change */}
        {activeTab === 'stream' && (
          <div className="min-h-[50vh] pt-6" role="region" aria-label="Stream page">
            <div className="space-y-5">
              {/* Composer: teachers only (like Google Classroom) */}
              {isTeacher && (
                <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-8 hover:border-brand transition-colors mb-12">
                  <form onSubmit={handlePostAnnouncement}>
                    <div className="flex gap-6">
                      <div
                        className={`flex-shrink-0 w-12 h-12 rounded-sm bg-black dark:bg-white flex items-center justify-center text-white dark:text-black text-xs font-bold ring-4 ring-zinc-50 dark:ring-zinc-900`}
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
                          placeholder="Post an announcement..."
                          rows={3}
                          className="w-full px-5 py-4 bg-transparent border border-zinc-100 dark:border-zinc-800 text-black dark:text-white placeholder-zinc-300 dark:placeholder-zinc-600 text-sm font-bold uppercase tracking-widest leading-relaxed resize-none focus:border-brand outline-none transition-all"
                        />
                        <input
                          type="url"
                          value={announcementForm.attachmentUrl}
                          onChange={(e) =>
                            setAnnouncementForm((prev) => ({ ...prev, attachmentUrl: e.target.value }))
                          }
                          placeholder="Attachment URL (optional)..."
                          className="mt-4 w-full px-5 py-3 bg-transparent border border-zinc-100 dark:border-zinc-800 text-black dark:text-white placeholder-zinc-300 dark:placeholder-zinc-600 text-[10px] font-bold uppercase tracking-widest focus:border-brand outline-none transition-all"
                        />
                        <div className="flex justify-end mt-6">
                          <button
                            type="submit"
                            disabled={postingAnnouncement || !announcementForm.content.trim()}
                            className="px-10 py-3 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest hover:bg-brand dark:hover:bg-brand dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          >
                            {postingAnnouncement ? 'Posting...' : 'Post Announcement'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Announcement cards — visible to both teachers and students */}
              {!Array.isArray(announcements) || announcements.length === 0 ? (
                <div className="p-20 border border-zinc-100 dark:border-zinc-900 text-center bg-zinc-50 dark:bg-zinc-950">
                  <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.3em]">
                    {isTeacher
                      ? 'No announcements yet. Post one to get started.'
                      : 'No announcements yet.'}
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
                        className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-8 hover:border-brand transition-all animate-slide-up group"
                      >
                        <div className="flex items-center justify-between gap-4 mb-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={`w-10 h-10 rounded-sm bg-black dark:bg-white flex items-center justify-center text-white dark:text-black text-[10px] font-bold shadow-sm`}>
                              {getInitials(a.author)}
                            </div>
                            <div className="flex flex-col">
                              {a.author?.id ? (
                                <Link to={`/profile/${a.author.id}`} className="text-xs font-extrabold text-black dark:text-white uppercase tracking-tighter hover:text-brand transition-colors">
                                  {authorName}
                                </Link>
                              ) : (
                                <span className="text-xs font-extrabold text-black dark:text-white uppercase tracking-tighter">
                                  {authorName}
                                </span>
                              )}
                              <span className="text-[8px] font-bold text-zinc-400 mt-1 uppercase tracking-widest">
                                Posted {formatRelativeTime(a.createdAt)}
                              </span>
                            </div>
                          </div>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAnnouncement(a.id)}
                              className="text-zinc-300 hover:text-red-500 transition-colors p-2"
                              title="Delete announcement"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-black dark:text-white font-medium whitespace-pre-wrap leading-relaxed mb-6">
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
                                    <div key={c.id} className="flex gap-2 text-sm items-start group">
                                      <div className="flex-1 min-w-0">
                                        <span className="shrink-0">
                                          {c.author?.id ? (
                                            <Link to={`/profile/${c.author.id}`} className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                                              {c.author.firstName} {c.author.lastName}
                                            </Link>
                                          ) : (
                                            <span className="font-medium text-gray-900 dark:text-white">Unknown</span>
                                          )}:
                                        </span>
                                        <span className="text-gray-700 dark:text-gray-300"> {c.content}</span>
                                        <span className="text-xs text-gray-400 shrink-0 ml-1">{formatRelativeTime(c.createdAt)}</span>
                                      </div>
                                      {isTeacher && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteAnnouncementComment(a.id, c.id)}
                                          disabled={deletingCommentId === c.id}
                                          className="shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                          title="Delete comment"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      )}
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Classwork page — only this or Stream or People is visible */}
        {activeTab === 'classwork' && (
          <div className="min-h-[50vh] pt-6 animate-slide-up" role="region" aria-label="Classwork page">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10 mb-12">
              <div>
                <span className="section-kicker mb-4">Assignments</span>
                <h2 className="text-3xl font-extrabold text-black dark:text-white uppercase tracking-tighter">
                  Class <br />Assignments.
                </h2>
              </div>
              {isTeacher && (
                <button
                  onClick={() => setShowNewAssignment(true)}
                  className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-brand dark:hover:bg-brand dark:hover:text-white transition-all shadow-sm"
                >
                  Create Assignment
                </button>
              )}
            </div>

            {assignments.length === 0 ? (
              <div className="p-20 border border-zinc-100 dark:border-zinc-900 text-center bg-zinc-50 dark:bg-zinc-950">
                <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.3em]">
                  No assignments yet. Create one to get started.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
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
                      className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-8 hover:border-brand transition-all animate-slide-up group"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-extrabold text-black dark:text-white uppercase tracking-tighter mb-4">
                            {a.title}
                          </h3>
                          {a.description && (
                            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest leading-relaxed mb-6 max-w-2xl">
                              {a.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-4 items-center">
                            {a.dueDate && (
                              <span className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                                📅 DEADLINE: {new Date(a.dueDate).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                            {a.lesson && (
                              <Link
                                to={`/courses/${a.course?.id || ''}/lessons/${a.lesson.id}`}
                                className="inline-flex items-center gap-2 px-3 py-1 bg-brand text-white text-[9px] font-bold uppercase tracking-widest hover:bg-brand/90 transition-colors"
                              >
                                📖 Linked Lesson: {a.lesson.title}
                              </Link>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-start md:items-end gap-4 min-w-[120px]">
                          {isTeacher ? (
                            <>
                              {typeof completedCount === 'number' && (
                                <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                                  <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-widest">
                                    Completed: {completedCount}/{totalStudents}
                                  </span>
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteAssignment(a.id)}
                                className="w-full px-6 py-2 border border-zinc-200 dark:border-zinc-800 text-[9px] font-bold uppercase tracking-widest hover:text-red-500 hover:border-red-500 transition-all"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span
                              className={`text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 border ${isCompleted
                                ? 'border-brand text-brand'
                                : 'border-zinc-200 dark:border-zinc-800 text-zinc-400'
                                }`}
                            >
                              {isCompleted ? 'Completed' : 'Not Started'}
                            </span>
                          )}
                          {!isTeacher && !isCompleted && (
                            <button
                              onClick={() => handleCompleteAssignment(a.id)}
                              className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-[9px] font-bold uppercase tracking-widest hover:bg-brand dark:hover:bg-brand dark:hover:text-white transition-all shadow-sm"
                            >
                              Mark Complete
                            </button>
                          )}
                          {!isTeacher && isCompleted && !a.lesson && (
                            <button
                              onClick={() => handleUncompleteAssignment(a.id)}
                              className="w-full px-6 py-2 border border-zinc-200 dark:border-zinc-800 text-[9px] font-bold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
                            >
                              Mark Incomplete
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Comments on assignment (class + private) */}
                      <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => toggleAssignmentComments(a.id)}
                          className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest hover:text-brand transition-colors"
                        >
                          {openCommentSections.assignment.has(a.id) ? 'Hide Comments' : 'Show Comments'}
                          {totalComments > 0 && ` [${totalComments}]`}
                        </button>
                        {openCommentSections.assignment.has(a.id) && (
                          <div className="mt-6 space-y-6 min-h-[2rem]">
                            {loadingComments.assignment === a.id || assignmentComments[a.id] === undefined ? (
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest py-1">Loading comments...</p>
                            ) : (
                              <>
                                {/* Class comments (public) */}
                                <div>
                                  <h4 className="text-[10px] font-black text-zinc-300 uppercase tracking-widest mb-4">
                                    Class Comments
                                  </h4>
                                  {classComments.map((c) => (
                                    <div key={c.id} className="flex gap-4 text-xs mb-4 group">
                                      <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                          {c.author?.id ? (
                                            <Link to={`/profile/${c.author.id}`} className="font-extrabold text-black dark:text-white uppercase tracking-tighter hover:text-brand transition-colors">
                                              {c.author.firstName} {c.author.lastName}
                                            </Link>
                                          ) : (
                                            <span className="font-extrabold text-black dark:text-white uppercase tracking-tighter">Unknown</span>
                                          )}
                                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{formatRelativeTime(c.createdAt)}</span>
                                        </div>
                                        <span className="text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">{c.content}</span>
                                      </div>
                                      {isTeacher && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteAssignmentComment(a.id, c.id)}
                                          disabled={deletingCommentId === c.id}
                                          className="shrink-0 p-1 text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                          title="Delete comment"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  <div className="flex gap-2 mt-4">
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
                                      className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest placeholder-zinc-400 focus:border-brand outline-none transition-all"
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
                                      className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest hover:bg-brand dark:hover:bg-brand dark:hover:text-white disabled:opacity-30 transition-all"
                                    >
                                      Post
                                    </button>
                                  </div>
                                </div>

                                {/* Private comments (student–teacher) */}
                                <div>
                                  <h4 className="text-[10px] font-black text-brand uppercase tracking-widest mb-4">
                                    Private Messages
                                  </h4>
                                  {privateComments.map((c) => (
                                    <div key={c.id} className="flex gap-4 text-xs mb-4 group">
                                      <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                          {c.author?.id ? (
                                            <Link to={`/profile/${c.author.id}`} className="font-extrabold text-black dark:text-white uppercase tracking-tighter hover:text-brand transition-colors">
                                              {c.author.firstName} {c.author.lastName}
                                            </Link>
                                          ) : (
                                            <span className="font-extrabold text-black dark:text-white uppercase tracking-tighter">Unknown</span>
                                          )}
                                          {c.targetUser ? (
                                            <>
                                              <span className="text-[8px] text-zinc-300">→</span>
                                              <Link to={`/profile/${c.targetUser.id}`} className="font-extrabold text-black dark:text-white uppercase tracking-tighter hover:text-brand transition-colors">
                                                {c.targetUser.firstName} {c.targetUser.lastName}
                                              </Link>
                                            </>
                                          ) : (
                                            <span className="text-[8px] font-bold text-zinc-400">(to instructor)</span>
                                          )}
                                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest ml-auto">{formatRelativeTime(c.createdAt)}</span>
                                        </div>
                                        <span className="text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">{c.content}</span>
                                      </div>
                                      {isTeacher && (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteAssignmentComment(a.id, c.id)}
                                          disabled={deletingCommentId === c.id}
                                          className="shrink-0 p-1 text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                          title="Delete comment"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                  {isTeacher ? (
                                    <div className="flex flex-col gap-4 mt-4 p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                                      <select
                                        value={assignmentPrivateTarget[a.id] || ''}
                                        onChange={(e) =>
                                          setAssignmentPrivateTarget((prev) => ({
                                            ...prev,
                                            [a.id]: e.target.value || undefined,
                                          }))
                                        }
                                        className="w-full px-4 py-2 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-widest focus:border-brand outline-none transition-all"
                                      >
                                        <option value="">Select student...</option>
                                        {students.map((s) => (
                                          <option key={s.id} value={s.id}>
                                            {s.firstName} {s.lastName}
                                          </option>
                                        ))}
                                      </select>
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          value={commentDrafts.assignmentPrivate[a.id] || ''}
                                          onChange={(e) =>
                                            setCommentDrafts((prev) => ({
                                              ...prev,
                                              assignmentPrivate: { ...prev.assignmentPrivate, [a.id]: e.target.value },
                                            }))
                                          }
                                          placeholder="Send private message..."
                                          className="flex-1 px-4 py-3 bg-white dark:bg-black border border-zinc-100 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest placeholder-zinc-400 focus:border-brand outline-none transition-all"
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
                                          className="px-6 py-2 bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand/90 disabled:opacity-30 transition-all"
                                        >
                                          SEND
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex gap-2 mt-4">
                                      <input
                                        type="text"
                                        value={commentDrafts.assignmentPrivate[a.id] || ''}
                                        onChange={(e) =>
                                          setCommentDrafts((prev) => ({
                                            ...prev,
                                            assignmentPrivate: { ...prev.assignmentPrivate, [a.id]: e.target.value },
                                          }))
                                        }
                                        placeholder="Send private message to teacher..."
                                        className="flex-1 px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest placeholder-zinc-400 focus:border-brand outline-none transition-all"
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
                                        className="px-6 py-2 bg-brand text-white text-[10px] font-bold uppercase tracking-widest hover:bg-brand/90 disabled:opacity-30 transition-all"
                                      >
                                        SEND
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
          <div className="min-h-[50vh] pt-6 animate-slide-up" role="region" aria-label="People page">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-10 mb-12">
              <div>
                <span className="section-kicker mb-4">People</span>
                <h2 className="text-3xl font-extrabold text-black dark:text-white uppercase tracking-tighter">
                  Class <br />Members.
                </h2>
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setShowAddTeacher(true)}
                  className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-[9px] font-bold uppercase tracking-widest hover:bg-brand dark:hover:bg-brand dark:hover:text-white transition-all"
                >
                  Add teacher
                </button>
              )}
            </div>

            {/* Leaderboard: most assignments completed */}
            {Array.isArray(leaderboard) && leaderboard.length > 0 && (
              <div className="mb-12 p-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900">
                <h3 className="text-[10px] font-black text-brand uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                  <span className="w-8 h-[1px] bg-brand"></span>
                  Leaderboard — Most Assignments Completed
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.userId}
                      className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-brand transition-all group"
                    >
                      <span
                        className={`flex-shrink-0 w-10 h-10 flex items-center justify-center text-[10px] font-black border ${index === 0
                          ? 'bg-brand text-white border-brand'
                          : index === 1
                            ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white'
                            : index === 2
                              ? 'bg-zinc-200 text-black border-zinc-200 dark:bg-zinc-800 dark:text-white dark:border-zinc-800'
                              : 'bg-transparent text-zinc-400 border-zinc-100 dark:border-zinc-800'
                          }`}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <Link to={`/profile/${entry.userId}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-full ${getAvatarColor(entry.firstName + entry.lastName)} flex items-center justify-center text-[10px] font-bold text-white shadow-sm flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity`}>
                          {getInitials(entry)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-black text-black dark:text-white uppercase tracking-tight block group-hover:text-brand transition-colors truncate">
                            {entry.firstName} {entry.lastName}
                          </span>
                          <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
                            {entry.completedCount} Completed
                          </span>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Teachers */}
              <div>
                <h3 className="text-[10px] font-black text-zinc-300 dark:text-zinc-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <span className="w-4 h-[1px] bg-zinc-200 dark:bg-zinc-800"></span>
                  Teachers
                </h3>
                {teachers.length === 0 ? (
                  <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest pl-7">
                    No teachers in this class.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {teachers.map((t) => (
                      <div key={t.id} className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group">
                        <Link to={`/profile/${t.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-full ${getAvatarColor(t.firstName + t.lastName)} flex items-center justify-center text-[10px] font-bold text-white shadow-sm flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity`}>
                            {getInitials(t)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-black dark:text-white uppercase tracking-tighter block group-hover:text-brand transition-colors">
                              {t.firstName} {t.lastName}
                            </span>
                            <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{t.email}</span>
                          </div>
                        </Link>
                        {isOwner && t.id !== user?.id && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(t.id, `${t.firstName} ${t.lastName}`)}
                            className="text-[9px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest flex-shrink-0"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Students */}
              <div>
                <h3 className="text-[10px] font-black text-zinc-300 dark:text-zinc-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                  <span className="w-4 h-[1px] bg-zinc-200 dark:bg-zinc-800"></span>
                  Students ({students.length})
                </h3>
                {students.length === 0 ? (
                  <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest pl-7">
                    No students in this class yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {students.map((s) => (
                      <div key={s.id} className="flex items-center gap-4 p-3 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all group">
                        <Link to={`/profile/${s.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-full ${getAvatarColor(s.firstName + s.lastName)} flex items-center justify-center text-[10px] font-bold text-white shadow-sm flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity`}>
                            {getInitials(s)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[10px] font-black text-black dark:text-white uppercase tracking-tight block group-hover:text-brand transition-colors">
                              {s.firstName} {s.lastName}
                            </span>
                            <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{s.email}</span>
                          </div>
                        </Link>
                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(s.id, `${s.firstName} ${s.lastName}`)}
                            className="text-[9px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest flex-shrink-0"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* New assignment modal — overlay, not a tab */}
        {isTeacher && showNewAssignment && (
          <div className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-[0_0_50px_-12px_rgba(0,0,0,0.3)] max-w-lg w-full max-h-[90vh] overflow-y-auto p-10 animate-in zoom-in-95 duration-300">
              <div className="flex items-start justify-between mb-10">
                <div>
                  <span className="section-kicker mb-2">Create Assignment</span>
                  <h2 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter">
                    New Assignment
                  </h2>
                </div>
                <button
                  onClick={() => setShowNewAssignment(false)}
                  className="p-2 text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreateAssignment} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Title
                  </label>
                  <input
                    type="text"
                    value={assignmentForm.title}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                    className="block w-full px-0 py-3 bg-transparent border-b border-zinc-200 dark:border-zinc-800 text-black dark:text-white text-lg font-bold placeholder-zinc-300 focus:border-brand outline-none transition-all"
                    placeholder="Enter assignment title..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Description
                  </label>
                  <textarea
                    value={assignmentForm.description}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={4}
                    className="block w-full px-4 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-black dark:text-white text-xs font-medium placeholder-zinc-400 focus:border-brand outline-none transition-all resize-none"
                    placeholder="Enter assignment description..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      Deadline
                    </label>
                    <input
                      type="date"
                      value={assignmentForm.dueDate}
                      onChange={(e) =>
                        setAssignmentForm((prev) => ({ ...prev, dueDate: e.target.value }))
                      }
                      className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-black dark:text-white text-[10px] font-bold uppercase tracking-widest focus:border-brand outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                      Link to Lesson
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
                      className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-black dark:text-white text-[10px] font-bold uppercase tracking-widest focus:border-brand outline-none transition-all"
                    >
                      <option value="">NONE</option>
                      {availableLessons.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.courseTitle.toUpperCase()} – {l.title.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowNewAssignment(false)}
                    className="px-8 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-black dark:hover:text-white transition-all order-2 sm:order-1"
                    disabled={submitting}
                  >
                    Abort
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-10 py-4 bg-black dark:bg-white text-white dark:text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand dark:hover:bg-brand dark:hover:text-white disabled:opacity-30 transition-all shadow-lg order-1 sm:order-2"
                  >
                    {submitting ? 'Creating...' : 'Create Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add teacher modal — owner only */}
        {isOwner && showAddTeacher && (
          <div className="fixed inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-[0_0_50px_-12px_rgba(0,0,0,0.3)] max-w-md w-full p-10 animate-in zoom-in-95 duration-300">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <span className="section-kicker mb-2">Add Teacher</span>
                  <h2 className="text-xl font-black text-black dark:text-white uppercase tracking-tighter">
                    Add teacher
                  </h2>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-2">
                    Enter the teacher&apos;s account email. They must have an instructor account.
                  </p>
                </div>
                <button
                  onClick={() => { setShowAddTeacher(false); setAddTeacherEmail(''); setError(''); }}
                  className="p-2 text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleAddTeacher} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Email</label>
                  <input
                    type="email"
                    value={addTeacherEmail}
                    onChange={(e) => setAddTeacherEmail(e.target.value)}
                    required
                    className="block w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-black dark:text-white text-sm font-medium placeholder-zinc-400 focus:border-brand outline-none transition-all"
                    placeholder="instructor@example.com"
                  />
                </div>
                <div className="flex gap-4 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowAddTeacher(false); setAddTeacherEmail(''); setError(''); }}
                    className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-black dark:hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingTeacher}
                    className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest hover:bg-brand dark:hover:bg-brand dark:hover:text-white disabled:opacity-50 transition-all"
                  >
                    {addingTeacher ? 'Adding...' : 'Add teacher'}
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

