import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import {
  FlagIcon, LockClosedIcon, MapPinIcon,
  PencilIcon, TrashIcon, ExclamationTriangleIcon,
  BookmarkIcon, StarIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid, BookmarkIcon as BookmarkSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';
import api from '../../services/api';
import CapletLoader from '../../components/CapletLoader';
import ForumPageShell from './ForumPageShell';
import ForumSidebarLeft from './ForumSidebarLeft';
import { ForumSidebarRightCategory } from './ForumSidebarRight';
import ForumVoteControl from './ForumVoteControl';
import ForumReactionBar from './ForumReactionBar';
import ForumPollWidget from './ForumPollWidget';
import ForumImageUploadButton from './ForumImageUploadButton';
import ForumBlockRenderer from './blocks/ForumBlockRenderer';
import ForumBlockComposer from './blocks/ForumBlockComposer';
import { authorName, categoryColorVars, relativeTime, REPORT_REASONS, tagLabel, tagColor } from './forumTheme';

function TagBadges({ tags }) {
  if (!tags?.length) return null;
  return (
    <>
      {tags.map((tag) => {
        const vars = categoryColorVars(tagColor(tag));
        return (
          <span key={tag} className="forum-pill text-[10px]" style={{ color: vars.text, borderColor: 'transparent', background: vars.soft }}>
            {tagLabel(tag)}
          </span>
        );
      })}
    </>
  );
}

function AuthorLink({ author, stats, isAnonymous }) {
  // Anonymous entries are never linked to a profile. A moderator still gets
  // the real name (the server only sends it to staff), shown inline so
  // accountability is visible without exposing the author to peers.
  if (isAnonymous) {
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-text-primary">
        {authorName(author, { isAnonymous: true })}
        <span className="forum-pill" style={{ color: 'var(--forum-blue)', borderColor: 'transparent', background: 'var(--forum-blue-soft)' }}>
          Anonymous
        </span>
      </span>
    );
  }
  if (!author) return <span className="font-semibold text-text-primary">Deleted user</span>;
  return (
    <Link to={`/forum/u/${author.id}`} className="inline-flex items-center gap-1.5 font-semibold text-text-primary hover:text-[color:var(--forum-accent)]">
      {authorName(author)}
      {stats?.contributionScore > 0 && (
        <span className="forum-pill text-[10px] text-[color:var(--forum-accent)]" style={{ borderColor: 'transparent', background: 'var(--forum-accent-soft)' }}>
          {stats.contributionScore}
        </span>
      )}
    </Link>
  );
}

function ReportPanel({ onSubmit, onCancel }) {
  const [reason, setReason] = useState(REPORT_REASONS[0].value);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (done) return <p className="forum-meta mt-2 text-[color:var(--forum-green)]">Report submitted — a moderator will review it.</p>;

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-xl border border-line-soft bg-surface-soft p-3">
      <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg px-3 py-2 text-sm">
        {REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
      <textarea rows={2} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Optional details" className="rounded-lg px-3 py-2 text-sm" />
      {error && <p className="text-xs font-semibold text-text-error">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true); setError('');
            try { await onSubmit({ reason, details }); setDone(true); } catch (err) { setError(err.message || 'Could not submit report.'); } finally { setSubmitting(false); }
          }}
          className="rounded-full px-3 py-1.5 text-xs font-bold text-white"
          style={{ background: 'var(--forum-accent)' }}
        >
          Submit report
        </button>
        <button type="button" onClick={onCancel} className="forum-pill text-text-muted">Cancel</button>
      </div>
    </div>
  );
}

/**
 * onSubmit receives { content, blocks } either way — in plain mode `blocks`
 * is always [], in block mode `content` is derived server-side from the
 * blocks. This keeps the two call sites (main composer vs. inline reply)
 * on one contract regardless of which UI they use.
 */
function CommentComposer({ onSubmit, placeholder = 'Write a helpful reply...', autoFocus = false, submitLabel = 'Comment', compact = false, allowImage = false, blockMode = false }) {
  const [content, setContent] = useState('');
  const [blocks, setBlocks] = useState([{ id: 'initial-text', type: 'text', data: { markdown: '' } }]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (done) {
    return (
      <p className="forum-meta text-[color:var(--forum-green)]">
        Submitted for review. <button type="button" onClick={() => setDone(false)} className="underline">Write another</button>
      </p>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (blockMode) {
        const nonEmptyBlocks = blocks.filter((b) => (b.type === 'text' ? b.data.markdown?.trim() : true));
        if (!nonEmptyBlocks.length) {
          setError('Add at least one block of content.');
          setSubmitting(false);
          return;
        }
        await onSubmit({ blocks: nonEmptyBlocks, isAnonymous });
        setBlocks([{ id: 'initial-text', type: 'text', data: { markdown: '' } }]);
      } else {
        await onSubmit({ content: content.trim(), isAnonymous });
        setContent('');
      }
      setIsAnonymous(false);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not submit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
      {blockMode ? (
        <ForumBlockComposer blocks={blocks} onChange={setBlocks} />
      ) : (
        <textarea
          autoFocus={autoFocus}
          required
          minLength={1}
          maxLength={4000}
          rows={compact ? 3 : 4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-y rounded-xl px-4 py-3 text-sm"
        />
      )}
      {error && <p className="text-xs font-semibold text-text-error">{error}</p>}
      <label className="flex items-center gap-2 text-xs font-semibold text-text-muted">
        <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="h-3.5 w-3.5 rounded" />
        Reply anonymously
        <span className="font-normal text-text-dim">— hidden from students, still visible to moderators</span>
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <p className="forum-meta">Replies are reviewed before they're visible.</p>
          {!blockMode && allowImage && <ForumImageUploadButton onInsert={(markdown) => setContent((prev) => `${prev}${markdown}`)} />}
        </div>
        <button
          type="submit"
          disabled={submitting}
          className={`rounded-2xl font-bold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50 ${compact ? 'px-4 py-1.5 text-xs' : 'px-5 py-2 text-sm'}`}
          style={{ background: 'var(--forum-accent)' }}
        >
          {submitting ? 'Submitting…' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function CommentCard({ post, thread, isMod, depth, onReload, onReply }) {
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [count, setCount] = useState(post.likeCount);
  const [reactionCounts, setReactionCounts] = useState(post.reactionCounts || {});
  const [myReactions, setMyReactions] = useState(post.myReactions || []);
  const [reporting, setReporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    try { await api.likeForumPost(post.id, next); } catch { setLiked(!next); setCount((c) => c + (next ? -1 : 1)); }
  };

  const toggleReaction = async (type, active) => {
    setMyReactions((prev) => (active ? [...prev, type] : prev.filter((t) => t !== type)));
    setReactionCounts((prev) => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) + (active ? 1 : -1)) }));
    try {
      const res = await api.reactToForumPost(post.id, type, active);
      setReactionCounts(res.reactionCounts);
    } catch {
      setMyReactions((prev) => (active ? prev.filter((t) => t !== type) : [...prev, type]));
      setReactionCounts((prev) => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) + (active ? -1 : 1)) }));
    }
  };

  const doAction = async (fn) => { try { await fn(); await onReload(); } catch { /* surfaced via reload state */ } };

  return (
    <div style={depth > 0 ? { marginLeft: 28, borderLeft: '2px solid var(--line-soft)', paddingLeft: 16 } : undefined}>
      <article
        className="forum-card flex gap-2 p-3"
        style={post.isBestAnswer ? { borderColor: 'var(--forum-green)', background: 'color-mix(in srgb, var(--forum-green-soft) 55%, var(--surface-raised))' } : undefined}
      >
        <ForumVoteControl count={count} liked={liked} onToggle={toggleLike} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {post.isBestAnswer && (
              <span className="forum-pill text-[10px]" style={{ color: 'var(--forum-green)', borderColor: 'transparent', background: 'var(--forum-green-soft)' }}>
                <CheckCircleSolid className="h-3 w-3" /> Best answer
              </span>
            )}
            {post.status === 'pending' && (
              <span className="forum-pill text-[10px]" style={{ color: 'var(--forum-amber)', borderColor: 'transparent', background: 'var(--forum-amber-soft)' }}>Pending review</span>
            )}
            {post.status === 'rejected' && (
              <span className="forum-pill text-[10px] text-text-error">Rejected{post.moderationNote ? `: ${post.moderationNote}` : ''}</span>
            )}
            {post.autoFlagged && isMod && (
              <span className="forum-pill text-[10px] text-text-error" style={{ borderColor: 'var(--border-error)' }}>
                <ExclamationTriangleIcon className="h-3 w-3" /> flagged
              </span>
            )}
          </div>
          <div className="forum-meta mt-1 flex items-center gap-3">
            <AuthorLink author={post.author} isAnonymous={post.isAnonymous} />
            <span>{relativeTime(post.createdAt)}</span>
            {post.editedAt && <span>(edited)</span>}
          </div>

          {editing ? (
            <PostEditForm post={post} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); onReload(); }} />
          ) : (
            <ForumBlockRenderer blocks={post.contentBlocks} fallbackText={post.content} className="mt-1.5 text-sm" />
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ForumReactionBar counts={reactionCounts} myReactions={myReactions} onToggle={toggleReaction} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <button type="button" onClick={() => setReplying((v) => !v)} className="font-bold text-text-muted hover:text-text-primary">Reply</button>
            <button type="button" onClick={() => setReporting((v) => !v)} className="inline-flex items-center gap-1 font-semibold text-text-muted hover:text-text-primary">
              <FlagIcon className="h-3.5 w-3.5" /> Report
            </button>
            {post.mine && post.status !== 'rejected' && (
              <button type="button" onClick={() => setEditing((v) => !v)} className="inline-flex items-center gap-1 font-semibold text-text-muted hover:text-text-primary">
                <PencilIcon className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            {(isMod || post.mine) && (
              <button type="button" onClick={() => doAction(() => api.deleteForumPost(post.id))} className="inline-flex items-center gap-1 font-semibold text-text-muted hover:text-text-primary">
                <TrashIcon className="h-3.5 w-3.5" /> Delete
              </button>
            )}
            {thread.isQuestion && post.status === 'approved' && (thread.mine || isMod) && (
              <button
                type="button"
                onClick={() => doAction(() => (post.isBestAnswer ? api.clearForumBestAnswer(thread.id) : api.markForumBestAnswer(thread.id, post.id)))}
                className="font-bold text-[color:var(--forum-green)]"
              >
                {post.isBestAnswer ? 'Unmark best answer' : 'Mark as best answer'}
              </button>
            )}
          </div>

          {reporting && <ReportPanel onSubmit={(payload) => api.reportForumPost(post.id, payload)} onCancel={() => setReporting(false)} />}
          {replying && (
            <div className="mt-2">
              <CommentComposer
                compact
                autoFocus
                placeholder={`Reply to ${authorName(post.author)}...`}
                submitLabel="Reply"
                onSubmit={async (payload) => { await onReply(payload, post.id); setReplying(false); await onReload(); }}
              />
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

export default function ForumThreadPage() {
  const { threadId } = useParams();
  const { categories, status } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportingThread, setReportingThread] = useState(false);
  const [editingThread, setEditingThread] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getForumThread(threadId);
      setData(res);
    } catch (err) {
      setError(err.status === 404 ? 'This thread isn’t available.' : (err.message || 'Could not load this thread.'));
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => { load(); }, [load]);

  const shell = (children, right) => (
    <ForumPageShell left={<ForumSidebarLeft categories={categories} isModerator={status?.isModerator} />} right={right}>
      {children}
    </ForumPageShell>
  );

  if (loading && !data) return shell(<div className="flex min-h-[40vh] items-center justify-center"><CapletLoader message="Loading thread..." /></div>);
  if (error) return shell(<div className="forum-card p-10 text-center text-text-error">{error}</div>);
  if (!data) return null;

  const { thread, posts, forumRole } = data;
  const isMod = !!forumRole;
  const canModerate = isMod || thread.mine;
  const canPost = !status?.sanction;
  const vars = categoryColorVars(thread.category?.color);
  const fullCategory = categories.find((c) => c.slug === thread.category?.slug);

  const visiblePosts = posts.filter((p) => p.status === 'approved' || p.mine || isMod);
  const topLevel = visiblePosts.filter((p) => !p.parentPostId || !visiblePosts.some((pp) => pp.id === p.parentPostId));
  const childrenOf = (id) => visiblePosts.filter((p) => p.parentPostId === id);

  const toggleThreadLike = async () => {
    const next = !thread.likedByMe;
    setData((d) => ({ ...d, thread: { ...d.thread, likedByMe: next, likeCount: d.thread.likeCount + (next ? 1 : -1) } }));
    try { await api.likeForumThread(thread.id, next); } catch { load(); }
  };

  const toggleThreadSave = async () => {
    const next = !thread.savedByMe;
    setData((d) => ({ ...d, thread: { ...d.thread, savedByMe: next } }));
    try { await api.saveForumThread(thread.id, next); } catch { load(); }
  };

  const toggleThreadReaction = async (type, active) => {
    setData((d) => {
      const counts = { ...d.thread.reactionCounts, [type]: Math.max(0, (d.thread.reactionCounts[type] || 0) + (active ? 1 : -1)) };
      const myReactions = active ? [...d.thread.myReactions, type] : d.thread.myReactions.filter((t) => t !== type);
      return { ...d, thread: { ...d.thread, reactionCounts: counts, myReactions } };
    });
    try {
      const res = await api.reactToForumThread(thread.id, type, active);
      setData((d) => ({ ...d, thread: { ...d.thread, reactionCounts: res.reactionCounts } }));
    } catch {
      load();
    }
  };

  const doAction = async (fn) => { try { await fn(); await load(); } catch (err) { setError(err.message || 'Action failed.'); } };
  const createReply = async (payload, parentPostId) => api.createForumPost(thread.id, { ...payload, parentPostId: parentPostId || null });

  return shell(
    <div>
      <p className="forum-meta mb-3"><Link to={`/forum/c/${thread.category?.slug}`} className="hover:text-[color:var(--forum-accent)]">{thread.category?.name}</Link></p>

      {thread.isMegathread && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[color:var(--forum-amber)] bg-[color:var(--forum-amber-soft)] px-4 py-2.5 text-sm font-bold text-text-primary">
          <StarSolid className="h-4 w-4 text-[color:var(--forum-amber)]" /> Master Resource — curated by moderators
        </div>
      )}
      {thread.status === 'pending' && (
        <div className="mb-4 rounded-xl border border-[color:var(--forum-amber)] bg-[color:var(--forum-amber-soft)] px-4 py-3 text-sm font-semibold text-text-primary">
          Pending review — only you and moderators can see this until it's approved.
        </div>
      )}
      {thread.status === 'rejected' && (
        <div className="mb-4 rounded-xl border border-border-error bg-surface-error px-4 py-3 text-sm font-semibold text-text-error">
          This thread was rejected by a moderator.{thread.moderationNote ? ` "${thread.moderationNote}"` : ''}
        </div>
      )}

      <article className="forum-card flex gap-3 p-4 sm:p-5">
        <ForumVoteControl count={thread.likeCount} liked={thread.likedByMe} onToggle={toggleThreadLike} />
        <div className="min-w-0 flex-1">
          <div className="forum-meta flex flex-wrap items-center gap-2">
            <span className="font-bold" style={{ color: vars.text }}>{thread.category?.name}</span>
            <span>·</span>
            <span>Posted by</span>
            <AuthorLink author={thread.author} stats={thread.authorStats} isAnonymous={thread.isAnonymous} />
            <span>·</span>
            <span>{relativeTime(thread.createdAt)}</span>
            <span>·</span>
            <span>{thread.viewCount} views</span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {thread.isMegathread && <StarSolid className="h-4 w-4 text-[color:var(--forum-amber)]" />}
            {thread.isPinned && !thread.isMegathread && <MapPinIcon className="h-4 w-4 text-[color:var(--forum-amber)]" />}
            {thread.isLocked && <LockClosedIcon className="h-4 w-4 text-text-dim" />}
            <h1 className="font-display text-xl font-extrabold tracking-tight text-text-primary sm:text-2xl">{thread.title}</h1>
            {thread.isQuestion && (
              <span className="forum-pill text-[10px]" style={{ color: thread.hasBestAnswer ? 'var(--forum-green)' : 'var(--forum-blue)', borderColor: 'transparent', background: thread.hasBestAnswer ? 'var(--forum-green-soft)' : 'var(--forum-blue-soft)' }}>
                {thread.hasBestAnswer ? 'Answered' : 'Question'}
              </span>
            )}
            <TagBadges tags={thread.tags} />
            {thread.autoFlagged && isMod && (
              <span className="forum-pill text-[10px] text-text-error" style={{ borderColor: 'var(--border-error)' }}>
                <ExclamationTriangleIcon className="h-3 w-3" /> flagged: {thread.autoFlagReasons?.join(', ')}
              </span>
            )}
          </div>

          {editingThread ? (
            <ThreadEditForm thread={thread} onCancel={() => setEditingThread(false)} onSaved={() => { setEditingThread(false); load(); }} />
          ) : (
            <ForumBlockRenderer blocks={thread.contentBlocks} fallbackText={thread.body} className="mt-3" />
          )}

          {thread.poll && <div className="mt-4"><ForumPollWidget poll={thread.poll} /></div>}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ForumReactionBar counts={thread.reactionCounts} myReactions={thread.myReactions || []} onToggle={toggleThreadReaction} />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3 text-sm">
            <button
              type="button"
              onClick={toggleThreadSave}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${thread.savedByMe ? 'text-[color:var(--forum-accent)]' : 'text-text-muted hover:bg-surface-soft'}`}
            >
              {thread.savedByMe ? <BookmarkSolid className="h-4 w-4" /> : <BookmarkIcon className="h-4 w-4" />} {thread.savedByMe ? 'Saved' : 'Save'}
            </button>
            <button type="button" onClick={() => setReportingThread((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-text-muted hover:bg-surface-soft">
              <FlagIcon className="h-4 w-4" /> Report
            </button>
            {thread.mine && thread.status !== 'rejected' && !editingThread && (
              <button type="button" onClick={() => setEditingThread(true)} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-text-muted hover:bg-surface-soft">
                <PencilIcon className="h-4 w-4" /> Edit
              </button>
            )}
            {canModerate && (
              <button type="button" onClick={() => doAction(() => api.deleteForumThread(thread.id))} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-text-muted hover:bg-surface-soft">
                <TrashIcon className="h-4 w-4" /> Delete
              </button>
            )}
            {isMod && (
              <>
                <button type="button" onClick={() => doAction(() => api.pinForumThread(thread.id, !thread.isPinned))} className="forum-pill text-text-muted">{thread.isPinned ? 'Unpin' : 'Pin'}</button>
                <button type="button" onClick={() => doAction(() => api.lockForumThread(thread.id, !thread.isLocked))} className="forum-pill text-text-muted">{thread.isLocked ? 'Unlock' : 'Lock'}</button>
                <button
                  type="button"
                  onClick={() => doAction(() => api.markForumMegathread(thread.id, !thread.isMegathread))}
                  className="forum-pill"
                  style={thread.isMegathread ? { color: 'var(--forum-amber)', borderColor: 'transparent', background: 'var(--forum-amber-soft)' } : undefined}
                >
                  <StarIcon className="h-3.5 w-3.5" /> {thread.isMegathread ? 'Unmark' : 'Mark'} Master Resource
                </button>
              </>
            )}
          </div>
          {reportingThread && <ReportPanel onSubmit={(payload) => api.reportForumThread(thread.id, payload)} onCancel={() => setReportingThread(false)} />}
        </div>
      </article>

      <div className="mt-4">
        {thread.isLocked ? (
          <p className="forum-card p-4 text-center text-sm font-semibold text-text-muted"><LockClosedIcon className="mr-1 inline h-4 w-4" /> This thread is locked — no new comments.</p>
        ) : !canPost ? (
          <p className="forum-card p-4 text-center text-sm font-semibold text-text-error">You can't post right now.</p>
        ) : (
          <div className="forum-card p-4">
            <CommentComposer blockMode onSubmit={async (payload) => { await createReply(payload, null); await load(); }} />
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <h2 className="forum-meta text-sm uppercase tracking-wide">{thread.replyCount} comment{thread.replyCount === 1 ? '' : 's'}</h2>
        {topLevel.map((post) => (
          <div key={post.id} className="flex flex-col gap-3">
            <CommentCard post={post} thread={thread} isMod={isMod} depth={0} onReload={load} onReply={createReply} />
            {childrenOf(post.id).map((child) => (
              <CommentCard key={child.id} post={child} thread={thread} isMod={isMod} depth={1} onReload={load} onReply={createReply} />
            ))}
          </div>
        ))}
      </div>
    </div>,
    fullCategory ? <ForumSidebarRightCategory category={fullCategory} isModerator={status?.isModerator} /> : null
  );
}

function ThreadEditForm({ thread, onCancel, onSaved }) {
  const [title, setTitle] = useState(thread.title);
  const [body, setBody] = useState(thread.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      className="mt-3 flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try { await api.updateForumThread(thread.id, { title: title.trim(), body: body.trim() }); onSaved(); } catch (err) { setError(err.message || 'Could not save.'); } finally { setSaving(false); }
      }}
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} minLength={4} maxLength={200} required className="rounded-xl px-4 py-2 text-sm" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} minLength={1} maxLength={8000} required className="rounded-xl px-4 py-3 text-sm" />
      {error && <p className="text-xs font-semibold text-text-error">{error}</p>}
      <p className="forum-meta">Saving re-submits this thread for moderator review.</p>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded-xl px-4 py-2 text-sm font-bold text-white" style={{ background: 'var(--forum-accent)' }}>{saving ? 'Saving…' : 'Save & resubmit'}</button>
        <button type="button" onClick={onCancel} className="forum-pill text-text-muted">Cancel</button>
      </div>
    </form>
  );
}

function PostEditForm({ post, onCancel, onSaved }) {
  const [content, setContent] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      className="mt-2 flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try { await api.updateForumPost(post.id, content.trim()); onSaved(); } catch (err) { setError(err.message || 'Could not save.'); } finally { setSaving(false); }
      }}
    >
      <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} minLength={1} maxLength={4000} required className="rounded-xl px-4 py-3 text-sm" />
      {error && <p className="text-xs font-semibold text-text-error">{error}</p>}
      <p className="forum-meta">Saving re-submits this reply for moderator review.</p>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="rounded-xl px-4 py-1.5 text-xs font-bold text-white" style={{ background: 'var(--forum-accent)' }}>{saving ? 'Saving…' : 'Save & resubmit'}</button>
        <button type="button" onClick={onCancel} className="forum-pill text-text-muted">Cancel</button>
      </div>
    </form>
  );
}
