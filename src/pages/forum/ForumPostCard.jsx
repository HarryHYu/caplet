import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatBubbleOvalLeftIcon, LockClosedIcon, MapPinIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid, BookmarkIcon as BookmarkSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';
import api from '../../services/api';
import ForumVoteControl from './ForumVoteControl';
import { authorName, categoryColorVars, relativeTime, tagLabel, tagColor } from './forumTheme';

/** Compact post card used in every feed (home + subject). */
export default function ForumPostCard({ thread, showCategory = true }) {
  const [liked, setLiked] = useState(!!thread.likedByMe);
  const [count, setCount] = useState(thread.likeCount);
  const [saved, setSaved] = useState(!!thread.savedByMe);
  const vars = categoryColorVars(thread.category?.color);

  const toggleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      await api.likeForumThread(thread.id, next);
    } catch {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
  };

  const toggleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    try {
      await api.saveForumThread(thread.id, next);
    } catch {
      setSaved(!next);
    }
  };

  return (
    <Link to={`/forum/t/${thread.id}`} className="forum-card flex gap-1 p-2 sm:gap-3 sm:p-3">
      <ForumVoteControl count={count} liked={liked} onToggle={toggleLike} size="sm" />
      <div className="min-w-0 flex-1 py-1">
        <div className="forum-meta flex flex-wrap items-center gap-1.5">
          {showCategory && thread.category && (
            <>
              <span className="font-bold" style={{ color: vars.text }}>{thread.category.name}</span>
              <span>·</span>
            </>
          )}
          <span>Posted by {authorName(thread.author, { isAnonymous: thread.isAnonymous })}</span>
          <span>·</span>
          <span>{relativeTime(thread.lastActivityAt || thread.createdAt)}</span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {thread.isMegathread && <StarSolid className="h-3.5 w-3.5 shrink-0 text-[color:var(--forum-amber)]" />}
          {thread.isPinned && !thread.isMegathread && <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-[color:var(--forum-amber)]" />}
          {thread.isLocked && <LockClosedIcon className="h-3.5 w-3.5 shrink-0 text-text-dim" />}
          <h3 className="font-display text-[15px] font-bold leading-snug text-text-primary sm:text-lg">{thread.title}</h3>
          {thread.isQuestion && (
            <span
              className="forum-pill shrink-0 text-[10px]"
              style={{
                color: thread.hasBestAnswer ? 'var(--forum-green)' : 'var(--forum-blue)',
                borderColor: 'transparent',
                background: thread.hasBestAnswer ? 'var(--forum-green-soft)' : 'var(--forum-blue-soft)',
              }}
            >
              {thread.hasBestAnswer ? <><CheckCircleSolid className="h-3 w-3" /> Answered</> : 'Question'}
            </span>
          )}
          {(thread.tags || []).map((tag) => {
            const tv = categoryColorVars(tagColor(tag));
            return (
              <span key={tag} className="forum-pill shrink-0 text-[10px]" style={{ color: tv.text, borderColor: 'transparent', background: tv.soft }}>
                {tagLabel(tag)}
              </span>
            );
          })}
        </div>

        <div className="forum-meta mt-2 flex items-center gap-4">
          <span className="inline-flex items-center gap-1">
            <ChatBubbleOvalLeftIcon className="h-4 w-4" /> {thread.replyCount} comment{thread.replyCount === 1 ? '' : 's'}
          </span>
          <button type="button" onClick={toggleSave} className={`inline-flex items-center gap-1 ${saved ? 'text-[color:var(--forum-accent)]' : 'hover:text-text-primary'}`}>
            {saved ? <BookmarkSolid className="h-4 w-4" /> : <BookmarkIcon className="h-4 w-4" />} {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </Link>
  );
}
