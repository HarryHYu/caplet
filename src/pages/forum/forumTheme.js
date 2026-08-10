// Category color -> design-token CSS variables (defined in src/index.css under
// .forum-root). Every color here is an existing site accent reused for the
// forum, never a new raw hex value.
const COLOR_VARS = {
  coral: { text: 'var(--forum-accent)', soft: 'var(--forum-accent-soft)', strong: 'var(--forum-accent-strong)' },
  blue: { text: 'var(--forum-blue)', soft: 'var(--forum-blue-soft)', strong: 'var(--forum-blue)' },
  amber: { text: 'var(--forum-amber)', soft: 'var(--forum-amber-soft)', strong: 'var(--forum-amber)' },
  green: { text: 'var(--forum-green)', soft: 'var(--forum-green-soft)', strong: 'var(--forum-green)' },
};

export function categoryColorVars(color) {
  return COLOR_VARS[color] || COLOR_VARS.coral;
}

export function relativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSec < 45) return 'just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: diffDay > 365 ? 'numeric' : undefined });
}

export const REPORT_REASONS = [
  { value: 'bullying', label: 'Bullying' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'academic_integrity', label: 'Academic integrity (e.g. sharing exam answers)' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

export function reasonLabel(reason) {
  return REPORT_REASONS.find((r) => r.value === reason)?.label || reason;
}

/**
 * `isAnonymous` posts arrive with author === null for everyone except
 * moderators (the server strips it — see backend/routes/forum.js). When a
 * moderator IS given the author, the UI shows both, so accountability stays
 * visible to staff without exposing the poster to peers.
 */
export function authorName(author, { isAnonymous = false } = {}) {
  if (isAnonymous && !author) return 'Anonymous';
  if (!author) return 'Deleted user';
  const name = `${author.firstName || ''} ${author.lastName || ''}`.trim() || 'Member';
  return isAnonymous ? `Anonymous (${name})` : name;
}

// Fixed, curated flair vocabulary — must match backend/models/ForumThread.js TAGS.
export const TAG_META = [
  { value: 'question', label: 'Question', color: 'blue' },
  { value: 'help-needed', label: 'Help Needed', color: 'coral' },
  { value: 'resource', label: 'Resource', color: 'green' },
  { value: 'notes', label: 'Notes', color: 'amber' },
  { value: 'past-paper', label: 'Past Paper', color: 'coral' },
  { value: 'discussion', label: 'Discussion', color: 'blue' },
];

export function tagLabel(tag) {
  return TAG_META.find((t) => t.value === tag)?.label || tag;
}

export function tagColor(tag) {
  return TAG_META.find((t) => t.value === tag)?.color || 'coral';
}

// Study reactions — must match backend/models/ForumReaction.js REACTION_TYPES.
export const REACTION_META = [
  { value: 'helpful', label: 'Helpful', emoji: '💡' },
  { value: 'clear_explanation', label: 'Clear explanation', emoji: '✨' },
  { value: 'this_helped_me', label: 'This helped me', emoji: '🙌' },
];

export function reactionLabel(type) {
  return REACTION_META.find((r) => r.value === type)?.label || type;
}
