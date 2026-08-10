import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams, Link } from 'react-router-dom';
import { InformationCircleIcon, PlusIcon, XMarkIcon, ChartBarIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import ForumPageShell from './ForumPageShell';
import ForumSidebarLeft from './ForumSidebarLeft';
import { ForumSidebarRightCategory } from './ForumSidebarRight';
import ForumBlockComposer from './blocks/ForumBlockComposer';
import { TAG_META } from './forumTheme';

export default function ForumNewThread() {
  const { slug } = useParams();
  const { categories, status } = useOutletContext();
  const navigate = useNavigate();
  const category = categories.find((c) => c.slug === slug);
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState([{ id: 'initial-text', type: 'text', data: { markdown: '' } }]);
  const [isQuestion, setIsQuestion] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [tags, setTags] = useState([]);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
  }, [slug]);

  const left = <ForumSidebarLeft categories={categories} isModerator={status?.isModerator} />;

  if (!category) {
    return <ForumPageShell left={left}><div className="forum-card p-10 text-center text-text-muted">Loading board…</div></ForumPageShell>;
  }

  const toggleTag = (value) => {
    setTags((prev) => (prev.includes(value) ? prev.filter((t) => t !== value) : prev.length >= 6 ? prev : [...prev, value]));
  };

  const updatePollOption = (index, value) => {
    setPollOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  };
  const addPollOption = () => setPollOptions((prev) => (prev.length >= 8 ? prev : [...prev, '']));
  const removePollOption = (index) => setPollOptions((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const nonEmptyBlocks = blocks.filter((b) => (b.type === 'text' ? b.data.markdown?.trim() : true));
      if (!nonEmptyBlocks.length) {
        setError('Add at least one block of content.');
        setSubmitting(false);
        return;
      }
      const payload = { title: title.trim(), blocks: nonEmptyBlocks, isQuestion, isAnonymous, tags };
      if (pollEnabled) {
        const options = pollOptions.map((o) => o.trim()).filter(Boolean);
        if (!pollQuestion.trim() || options.length < 2) {
          setError('A poll needs a question and at least 2 options.');
          setSubmitting(false);
          return;
        }
        payload.poll = { question: pollQuestion.trim(), options, allowMultiple: pollAllowMultiple };
      }
      const res = await api.createForumThread(category.id, payload);
      navigate(`/forum/t/${res.thread.id}`, { state: { justSubmitted: true } });
    } catch (err) {
      setError(err.message || 'Could not submit your thread.');
      setSubmitting(false);
    }
  };

  return (
    <ForumPageShell left={left} right={<ForumSidebarRightCategory category={category} isModerator={status?.isModerator} />}>
      <p className="forum-meta mb-1">
        <Link to={`/forum/c/${slug}`} className="hover:text-[color:var(--forum-accent)]">{category.name}</Link> / New thread
      </p>
      <h1 className="mb-6 font-display text-2xl font-extrabold tracking-tight text-text-primary md:text-3xl">Start a thread</h1>

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-sm text-text-muted">
        <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--forum-accent)]" />
        <p>Your thread will be reviewed by a moderator before it's visible to anyone else. This usually doesn't take long.</p>
      </div>

      <form onSubmit={handleSubmit} className="forum-card flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-text-primary">Title</span>
          <input
            type="text"
            required
            minLength={4}
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's your thread about?"
            className="w-full rounded-xl px-4 py-2.5 text-sm"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-text-primary">Tags <span className="font-normal text-text-muted">(optional)</span></span>
          <div className="flex flex-wrap gap-1.5">
            {TAG_META.map((tag) => {
              const active = tags.includes(tag.value);
              return (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={`forum-pill transition-colors ${active ? 'text-white' : 'text-text-muted hover:bg-surface-soft'}`}
                  style={active ? { background: 'var(--forum-accent)', borderColor: 'transparent' } : undefined}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-text-primary">Content</span>
          <ForumBlockComposer blocks={blocks} onChange={setBlocks} />
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <input type="checkbox" checked={isQuestion} onChange={(e) => setIsQuestion(e.target.checked)} className="h-4 w-4 rounded" />
          This is a question — let replies be marked as the best answer
        </label>

        <div className="rounded-xl border border-line-soft p-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="h-4 w-4 rounded" />
            <EyeSlashIcon className="h-4 w-4 text-[color:var(--forum-accent)]" /> Post anonymously
          </label>
          <p className="mt-1.5 pl-6 text-xs text-text-muted">
            Your name is hidden from other students. Moderators and teachers can still see who posted — so the forum stays safe — and school rules still apply.
          </p>
        </div>

        <div className="rounded-2xl border border-line-soft p-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <input type="checkbox" checked={pollEnabled} onChange={(e) => setPollEnabled(e.target.checked)} className="h-4 w-4 rounded" />
            <ChartBarIcon className="h-4 w-4 text-[color:var(--forum-accent)]" /> Add a study-check poll
          </label>
          {pollEnabled && (
            <div className="mt-3 flex flex-col gap-2.5">
              <input
                type="text"
                maxLength={300}
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="e.g. Which answer is correct?"
                className="w-full rounded-xl px-3 py-2 text-sm"
              />
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={200}
                    value={opt}
                    onChange={(e) => updatePollOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="w-full rounded-xl px-3 py-2 text-sm"
                  />
                  {pollOptions.length > 2 && (
                    <button type="button" onClick={() => removePollOption(i)} className="shrink-0 rounded-full p-1.5 text-text-muted hover:bg-surface-soft">
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addPollOption} className="inline-flex w-fit items-center gap-1 text-xs font-bold text-[color:var(--forum-accent)]">
                <PlusIcon className="h-3.5 w-3.5" /> Add option
              </button>
              <label className="flex items-center gap-2 text-xs font-semibold text-text-muted">
                <input type="checkbox" checked={pollAllowMultiple} onChange={(e) => setPollAllowMultiple(e.target.checked)} className="h-3.5 w-3.5 rounded" />
                Allow multiple selections
              </label>
            </div>
          )}
        </div>

        {error && <p className="text-sm font-semibold text-text-error">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl px-6 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: 'var(--forum-accent)' }}
          >
            {submitting ? 'Submitting…' : 'Submit for review'}
          </button>
          <Link to={`/forum/c/${slug}`} className="text-sm font-semibold text-text-muted hover:text-text-primary">Cancel</Link>
        </div>
      </form>
    </ForumPageShell>
  );
}
