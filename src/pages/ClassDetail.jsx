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

  const { classroom, membership, members, assignments } = data;
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Assignments column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Homework & assignments
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
                        {!isTeacher && isCompleted && (
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

          {/* Members column */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
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

        {/* New assignment modal */}
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

