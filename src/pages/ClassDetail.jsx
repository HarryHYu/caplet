import { useEffect, useState } from 'react';
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

  const { classroom, membership, members, assignments, announcements = [] } = data;
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/classes')}
              className="mb-2 inline-flex items-center text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Back to classes
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {classroom.name}
            </h1>
            {classroom.description ? (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {classroom.description}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Class code:{' '}
              <span className="font-mono font-semibold">{classroom.code}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              You are signed in as
            </p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {user?.firstName} {user?.lastName}{' '}
              <span className="text-xs text-gray-500">
                ({membership?.role === 'teacher' ? 'Teacher' : 'Student'})
              </span>
            </p>
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleLeaveClass}
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Leave class
              </button>
              {isTeacher && (
                <button
                  type="button"
                  onClick={handleDeleteClass}
                  className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700"
                >
                  Delete class
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-md border border-red-300 bg-red-50 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Tab bar — only one "page" (Stream / Classwork / People) is shown below */}
        <nav className="flex border-b border-gray-200 dark:border-gray-700 -mb-px" aria-label="Class tabs">
          <button
            type="button"
            onClick={() => setActiveTab('stream')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'stream'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Stream
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('classwork')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'classwork'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Classwork
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('people')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'people'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            People
          </button>
        </nav>

        {/* Page content: only the active tab is rendered — screen changes, no route change */}
        {activeTab === 'stream' && (
        <div className="min-h-[50vh] pt-6" role="region" aria-label="Stream page">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stream</h2>
          <div className="space-y-4">
          {/* Composer: teachers only (like Google Classroom) */}
          {isTeacher && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 overflow-hidden">
            <form onSubmit={handlePostAnnouncement} className="p-4">
              <div className="flex gap-3">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center text-sm font-medium"
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
                    rows={2}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-[15px] leading-snug resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500"
                  />
                  <input
                    type="url"
                    value={announcementForm.attachmentUrl}
                    onChange={(e) =>
                      setAnnouncementForm((prev) => ({ ...prev, attachmentUrl: e.target.value }))
                    }
                    placeholder="Add attachment (image, video, or link URL)"
                    className="mt-2 w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 dark:focus:border-blue-500"
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      type="submit"
                      disabled={postingAnnouncement || !announcementForm.content.trim()}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {postingAnnouncement ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
          )}

          {/* Announcement cards — visible to both teachers and students */}
          {!Array.isArray(announcements) || announcements.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {isTeacher
                  ? 'No announcements yet. Share something with your class above.'
                  : 'No announcements yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((a) => {
                if (!a || !a.id) return null;
                const isAuthor = a.author?.id === user?.id;
                const canDelete = isTeacher || isAuthor;
                return (
                  <div
                    key={a.id}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex gap-3">
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center text-sm font-medium"
                          aria-hidden
                        >
                          {getInitials(a.author)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-baseline gap-2 min-w-0">
                              <span className="text-[15px] font-medium text-gray-900 dark:text-white truncate">
                                {a.author
                                  ? `${a.author.firstName} ${a.author.lastName}`
                                  : 'Unknown'}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                {formatRelativeTime(a.createdAt)}
                              </span>
                            </div>
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAnnouncement(a.id)}
                                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title="Delete announcement"
                                aria-label="Delete announcement"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-[15px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Classwork
            </h2>
              {isTeacher && (
                <button
                  onClick={() => setShowNewAssignment(true)}
                  className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
                >
                  New assignment
                </button>
              )}
            </div>
            {assignments.length === 0 ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No assignments yet.
              </p>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => {
                  const isCompleted = a.statusForCurrentUser === 'completed';
                  const totalStudents = students.length;
                  const completedCount = Array.isArray(a.submissions)
                    ? a.submissions.filter((s) => s.status === 'completed').length
                    : undefined;
                  return (
                    <div
                      key={a.id}
                      className="flex items-start justify-between gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                    >
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {a.title}
                        </h3>
                        {a.description && (
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                            {a.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2 items-center text-xs text-gray-500 dark:text-gray-400">
                          {a.dueDate && (
                            <span>
                              Due:{' '}
                              {new Date(a.dueDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          )}
                          {a.lesson && (
                            <Link
                              to={`/courses/${a.course?.id || ''}/lessons/${a.lesson.id}`}
                              className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              Lesson: {a.lesson.title}
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isTeacher ? (
                          <>
                            {typeof completedCount === 'number' && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Completed:{' '}
                                <span className="font-semibold">
                                  {completedCount}/{totalStudents}
                                </span>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteAssignment(a.id)}
                              className="mt-1 px-3 py-1 rounded-md text-xs font-medium border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              isCompleted
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                            }`}
                          >
                            {isCompleted ? 'Completed' : 'Assigned'}
                          </span>
                        )}
                        {!isTeacher && !isCompleted && (
                          <button
                            onClick={() => handleCompleteAssignment(a.id)}
                            className="mt-1 px-3 py-1 rounded-md text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Mark as done
                          </button>
                        )}
                        {!isTeacher && isCompleted && !a.lesson && (
                          <button
                            onClick={() => handleUncompleteAssignment(a.id)}
                            className="mt-1 px-3 py-1 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Undo
                          </button>
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
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden max-w-2xl">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                People
              </h2>

              <div className="mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Teachers
                </h3>
                {teachers.length === 0 ? (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    No teachers yet.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {teachers.map((t) => (
                      <li key={t.id} className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {t.firstName} {t.lastName}
                        </span>
                        <span className="text-xs text-gray-500">{t.email}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Students ({students.length})
                </h3>
                {students.length === 0 ? (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    No students have joined yet.
                  </p>
                ) : (
                  <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {students.map((s) => (
                      <li key={s.id} className="flex flex-col border-b border-gray-100 dark:border-gray-700 last:border-b-0 py-1">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {s.firstName} {s.lastName}
                        </span>
                        <span className="text-xs text-gray-500">{s.email}</span>
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  New assignment
                </h2>
                <button
                  onClick={() => setShowNewAssignment(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCreateAssignment} className="space-y-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Title
                  </label>
                  <input
                    type="text"
                    value={assignmentForm.title}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Description (optional)
                  </label>
                  <textarea
                    value={assignmentForm.description}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Due date (optional)
                  </label>
                  <input
                    type="date"
                    value={assignmentForm.dueDate}
                    onChange={(e) =>
                      setAssignmentForm((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">No linked lesson</option>
                    {availableLessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.courseTitle} – {l.title}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    If you link a lesson, the assignment will show a direct button to that lesson, and
                    it will be auto-marked complete when students finish the lesson.
                  </p>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewAssignment(false)}
                    className="px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Creating...' : 'Create assignment'}
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

