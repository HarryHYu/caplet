import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const emptySlidesJson = '[\n  {\n    "type": "text",\n    "content": "Hello from a new lesson."\n  }\n]';

export default function Editor() {
  const [code, setCode] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null); // { lesson, courseId, moduleId }
  const [draftTitle, setDraftTitle] = useState('');
  const [draftSlides, setDraftSlides] = useState(emptySlidesJson);
  const [saveMsg, setSaveMsg] = useState('');

  const hasToken = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('editorToken');

  async function reloadTree() {
    setLoading(true);
    setError('');
    try {
      const data = await api.editorTree();
      setCourses(data.courses || []);
      if (selected?.lesson?.id) {
        const found = findLessonInTree(data.courses, selected.lesson.id);
        if (found) {
          setSelected(found);
          setDraftTitle(found.lesson.title || '');
          setDraftSlides(JSON.stringify(found.lesson.slides ?? [], null, 2));
        }
      }
    } catch (e) {
      setError(e.message || 'Failed to load workspace');
      if (e.status === 401) {
        api.clearEditorToken();
        setCourses([]);
        setSelected(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!hasToken) return;
    (async () => {
      setLoading(true);
      try {
        const data = await api.editorTree();
        setCourses(data.courses || []);
      } catch {
        api.clearEditorToken();
      } finally {
        setLoading(false);
      }
    })();
  }, [hasToken]);

  function findLessonInTree(list, lessonId) {
    for (const c of list || []) {
      for (const m of c.modules || []) {
        for (const l of m.lessons || []) {
          if (l.id === lessonId) {
            return { lesson: l, courseId: c.id, moduleId: m.id };
          }
        }
      }
    }
    return null;
  }

  async function handleEnter(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.editorEnter(code.trim());
      setCourses((await api.editorTree()).courses || []);
    } catch (err) {
      setError(err.message || 'Could not enter workspace');
    } finally {
      setLoading(false);
    }
  }

  function openLesson(lesson, courseId, moduleId) {
    setSelected({ lesson, courseId, moduleId });
    setDraftTitle(lesson.title || '');
    setDraftSlides(
      lesson.slides !== undefined && lesson.slides !== null
        ? JSON.stringify(lesson.slides, null, 2)
        : emptySlidesJson
    );
    setSaveMsg('');
  }

  async function saveLesson() {
    if (!selected?.lesson) return;
    let slides;
    try {
      slides = JSON.parse(draftSlides);
    } catch {
      setSaveMsg('Invalid JSON in slides');
      return;
    }
    if (!Array.isArray(slides)) {
      setSaveMsg('Slides must be a JSON array');
      return;
    }
    setSaveMsg('');
    setLoading(true);
    try {
      await api.editorUpdateLesson(selected.lesson.id, {
        title: draftTitle,
        slides,
      });
      setSaveMsg('Saved');
      await reloadTree();
    } catch (e) {
      setSaveMsg(e.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  }

  async function addCourse() {
    setLoading(true);
    try {
      await api.editorCreateCourse({ title: 'New course' });
      await reloadTree();
    } catch (e) {
      setError(e.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  }

  async function addModule(courseId) {
    setLoading(true);
    try {
      await api.editorCreateModule({ courseId, title: 'New module' });
      await reloadTree();
    } catch (e) {
      setError(e.message || 'Failed to create module');
    } finally {
      setLoading(false);
    }
  }

  async function addLesson(moduleId) {
    setLoading(true);
    try {
      const res = await api.editorCreateLesson({
        moduleId,
        title: 'New lesson',
        slides: JSON.parse(emptySlidesJson),
      });
      const lesson = res.lesson;
      if (lesson?.id) {
        openLesson(lesson, res.course?.id, moduleId);
      }
      await reloadTree();
    } catch (e) {
      setError(e.message || 'Failed to create lesson');
    } finally {
      setLoading(false);
    }
  }

  function leave() {
    api.clearEditorToken();
    setCourses([]);
    setSelected(null);
    setCode('');
  }

  if (!hasToken) {
    return (
      <div className="min-h-screen bg-caplet-parchment py-16 px-4">
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-caplet-ink/10 shadow-lg p-8">
          <p className="text-sm font-display uppercase tracking-widest text-caplet-sky mb-2">Lesson workspace</p>
          <h1 className="text-2xl font-bold text-caplet-ink mb-2">Enter access code</h1>
          <p className="text-sm text-caplet-ink/60 mb-6">
            Use the code your admin shared. This page does not use your Caplet login.
          </p>
          <form onSubmit={handleEnter} className="space-y-4">
            <input
              type="password"
              autoComplete="off"
              className="w-full rounded-xl border border-caplet-ink/15 px-4 py-3 text-caplet-ink"
              placeholder="Paste code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full rounded-xl bg-caplet-sky text-white font-semibold py-3 hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Checking…' : 'Continue'}
            </button>
          </form>
          <Link to="/" className="inline-block mt-8 text-sm text-caplet-ink/50 hover:text-caplet-sky">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-caplet-sand py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-caplet-ink">Lesson editor</h1>
            <p className="text-sm text-caplet-ink/60">Draft courses stay out of the public catalog until you publish them from admin tools later.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => reloadTree()}
              className="rounded-xl border border-caplet-ink/15 bg-white px-4 py-2 text-sm font-medium text-caplet-ink"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={leave}
              className="rounded-xl border border-caplet-ink/15 bg-white px-4 py-2 text-sm font-medium text-caplet-ink"
            >
              Leave workspace
            </button>
          </div>
        </div>

        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-caplet-ink">Courses</h2>
              <button
                type="button"
                onClick={addCourse}
                disabled={loading}
                className="text-sm font-medium text-caplet-sky hover:underline disabled:opacity-50"
              >
                + Add course
              </button>
            </div>
            <div className="space-y-3">
              {courses.map((c) => (
                <div key={c.id} className="rounded-2xl border border-caplet-ink/10 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-caplet-ink">{c.title}</p>
                      <p className="text-xs text-caplet-ink/50">{c.id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => addModule(c.id)}
                      className="shrink-0 text-xs font-medium text-caplet-sky hover:underline"
                    >
                      + Module
                    </button>
                  </div>
                  <ul className="mt-3 space-y-2 border-t border-caplet-ink/5 pt-3">
                    {(c.modules || []).map((m) => (
                      <li key={m.id} className="text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-caplet-ink/80">{m.title}</span>
                          <button
                            type="button"
                            onClick={() => addLesson(m.id)}
                            className="text-xs text-caplet-sky hover:underline"
                          >
                            + Lesson
                          </button>
                        </div>
                        <ul className="mt-1 ml-3 list-disc text-caplet-ink/70">
                          {(m.lessons || []).map((l) => (
                            <li key={l.id}>
                              <button
                                type="button"
                                className="text-left hover:text-caplet-sky"
                                onClick={() => openLesson(l, c.id, m.id)}
                              >
                                {l.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {!courses.length && !loading ? (
                <p className="text-sm text-caplet-ink/50">No courses yet. Add one to get started.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-caplet-ink/10 bg-white p-6 shadow-sm min-h-[320px]">
            {!selected ? (
              <p className="text-sm text-caplet-ink/50">Select a lesson to edit slides (JSON).</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-caplet-ink/50 mb-1">
                    Lesson title
                  </label>
                  <input
                    className="w-full rounded-xl border border-caplet-ink/15 px-3 py-2 text-sm"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wide text-caplet-ink/50 mb-1">
                    Slides (JSON array)
                  </label>
                  <textarea
                    className="w-full min-h-[240px] rounded-xl border border-caplet-ink/15 px-3 py-2 font-mono text-xs leading-relaxed"
                    value={draftSlides}
                    onChange={(e) => setDraftSlides(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={saveLesson}
                    disabled={loading}
                    className="rounded-xl bg-caplet-ink text-white px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    Save lesson
                  </button>
                  {saveMsg ? <span className="text-sm text-caplet-ink/60">{saveMsg}</span> : null}
                </div>
                <p className="text-xs text-caplet-ink/45">
                  Supported slide types match the lesson player: <code className="text-caplet-ink">text</code>,{' '}
                  <code className="text-caplet-ink">image</code>, <code className="text-caplet-ink">video</code>,{' '}
                  <code className="text-caplet-ink">question</code>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
