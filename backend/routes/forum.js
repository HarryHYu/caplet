const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { Op, fn, col, where: sequelizeWhereFn } = require('sequelize');
const {
  User,
  ForumCategory,
  ForumThread,
  ForumPost,
  ForumLike,
  ForumReport,
  ForumModerationAction,
  ForumModerator,
  ForumSanction,
  ForumReaction,
  ForumSave,
  ForumUserStats,
  ForumPoll,
  ForumPollOption,
  ForumPollVote,
  ForumSubscription,
  ForumNotification,
} = require('../models');
const { requireAuth } = require('../middleware/auth');
const { requireForumModerator } = require('../middleware/forumAuth');
const { createRateLimiter } = require('../middleware/rateLimit');
const { computeAutoFlag, getActiveSanction, assertCanPost, REPORT_REASON_TO_QUEUE } = require('../services/forumModeration');
const { adjustStats, getOrCreateStats } = require('../services/forumContribution');
const { validateAndSanitizeBlocks, deriveTextFromBlocks } = require('../services/forumBlocks');

const router = express.Router();

const threadCreateLimiter = createRateLimiter({ scope: 'forum_thread_create', windowMs: 5 * 60 * 1000, max: 5, message: 'You are starting threads too quickly. Please wait a few minutes.' });
const postCreateLimiter = createRateLimiter({ scope: 'forum_post_create', windowMs: 60 * 1000, max: 8, message: 'You are posting replies too quickly. Please slow down.' });
const reportLimiter = createRateLimiter({ scope: 'forum_report', windowMs: 60 * 60 * 1000, max: 15, message: 'You have submitted several reports. Please wait before reporting again.' });
const likeLimiter = createRateLimiter({ scope: 'forum_like', windowMs: 60 * 1000, max: 60, message: 'Too many like actions. Please slow down.' });

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
  next();
}

// LOWER(col) LIKE %term% — portable across Postgres/SQLite (unlike Op.iLike,
// which is Postgres-only).
function sequelizeWhereLower(field, likeTerm) {
  return sequelizeWhereFn(fn('LOWER', col(field)), { [Op.like]: likeTerm });
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'thread';
}

function paginate(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

const userDto = (user) => (user ? { id: user.id, firstName: user.firstName, lastName: user.lastName } : null);

const categoryDto = (cat) => ({
  id: cat.id,
  name: cat.name,
  slug: cat.slug,
  description: cat.description,
  color: cat.color,
  sortOrder: cat.sortOrder,
  isLocked: cat.isLocked,
  isArchived: cat.isArchived,
  threadCount: cat.threadCount,
  postCount: cat.postCount,
  lastActivityAt: cat.lastActivityAt,
  createdAt: cat.createdAt,
});

// Reddit-style sort tabs. All four are plain multi-column ORDER BY on
// existing columns — no raw SQL, no schema change, portable across the
// Postgres/SQLite split. There's no downvote to build a Wilson-score "best"
// from (see forumModeration.js — deliberate, for a school context), so
// "best" reads as "most discussed + most liked" rather than a ratio.
const SORT_VALUES = ['new', 'hot', 'top', 'best'];
function orderForSort(sort) {
  switch (sort) {
    case 'hot':
      return [['isPinned', 'DESC'], ['likeCount', 'DESC'], ['replyCount', 'DESC'], ['lastActivityAt', 'DESC']];
    case 'top':
      return [['isPinned', 'DESC'], ['likeCount', 'DESC'], ['createdAt', 'DESC']];
    case 'best':
      return [['isPinned', 'DESC'], ['replyCount', 'DESC'], ['likeCount', 'DESC'], ['createdAt', 'DESC']];
    case 'new':
    default:
      return [['isPinned', 'DESC'], ['createdAt', 'DESC']];
  }
}

async function withMyLike(userId, likeableType, ids) {
  if (!userId || !ids.length) return new Set();
  const likes = await ForumLike.findAll({ where: { userId, likeableType, likeableId: { [Op.in]: ids } }, attributes: ['likeableId'] });
  return new Set(likes.map((l) => l.likeableId));
}

async function withMySave(userId, threadIds) {
  if (!userId || !threadIds.length) return new Set();
  const saves = await ForumSave.findAll({ where: { userId, threadId: { [Op.in]: threadIds } }, attributes: ['threadId'] });
  return new Set(saves.map((s) => s.threadId));
}

/** { thread123: ['helpful','this_helped_me'], ... } — reactions the viewer has given, per target id. */
async function withMyReactions(userId, reactableType, ids) {
  const map = new Map();
  if (!userId || !ids.length) return map;
  const reactions = await ForumReaction.findAll({
    where: { userId, reactableType, reactableId: { [Op.in]: ids } },
    attributes: ['reactableId', 'reactionType'],
  });
  reactions.forEach((r) => {
    if (!map.has(r.reactableId)) map.set(r.reactableId, []);
    map.get(r.reactableId).push(r.reactionType);
  });
  return map;
}

function threadSummaryDto(thread, { viewerId, isMod, likedSet, savedSet, myReactions } = {}) {
  const mine = thread.authorId && viewerId && thread.authorId === viewerId;
  // Anonymity is toward peers only. Moderators always keep attribution so
  // safeguarding and academic-integrity review still work.
  const hideAuthor = thread.isAnonymous && !isMod;
  return {
    id: thread.id,
    category: thread.category ? { id: thread.category.id, name: thread.category.name, slug: thread.category.slug, color: thread.category.color } : null,
    author: hideAuthor ? null : userDto(thread.author),
    isAnonymous: !!thread.isAnonymous,
    title: thread.title,
    slug: thread.slug,
    tags: thread.tags,
    isQuestion: thread.isQuestion,
    hasBestAnswer: !!thread.bestAnswerPostId,
    isMegathread: thread.isMegathread,
    hasPoll: thread.poll !== undefined ? !!thread.poll : undefined,
    status: thread.status,
    isPinned: thread.isPinned,
    isLocked: thread.isLocked,
    isDeleted: thread.isDeleted,
    viewCount: thread.viewCount,
    replyCount: thread.replyCount,
    likeCount: thread.likeCount,
    likedByMe: likedSet ? likedSet.has(thread.id) : undefined,
    savedByMe: savedSet ? savedSet.has(thread.id) : undefined,
    reactionCounts: thread.reactionCounts,
    myReactions: myReactions ? (myReactions.get(thread.id) || []) : undefined,
    mine: !!mine,
    ...(isMod || mine ? { moderationNote: thread.moderationNote, autoFlagged: thread.autoFlagged, autoFlagReasons: thread.autoFlagReasons, flagCount: thread.flagCount } : {}),
    lastActivityAt: thread.lastActivityAt,
    createdAt: thread.createdAt,
  };
}

function postDto(post, { viewerId, isMod, likedSet, bestAnswerPostId, myReactions } = {}) {
  const mine = post.authorId && viewerId && post.authorId === viewerId;
  const hideAuthor = post.isAnonymous && !isMod;
  return {
    id: post.id,
    threadId: post.threadId,
    author: hideAuthor ? null : userDto(post.author),
    isAnonymous: !!post.isAnonymous,
    parentPostId: post.parentPostId,
    content: post.isDeleted ? null : post.content,
    contentBlocks: post.isDeleted ? [] : post.contentBlocks,
    status: post.status,
    isDeleted: post.isDeleted,
    isBestAnswer: !!bestAnswerPostId && bestAnswerPostId === post.id,
    likeCount: post.likeCount,
    likedByMe: likedSet ? likedSet.has(post.id) : undefined,
    reactionCounts: post.reactionCounts,
    myReactions: myReactions ? (myReactions.get(post.id) || []) : undefined,
    mine: !!mine,
    editedAt: post.editedAt,
    ...(isMod || mine ? { moderationNote: post.moderationNote, autoFlagged: post.autoFlagged, autoFlagReasons: post.autoFlagReasons, flagCount: post.flagCount } : {}),
    createdAt: post.createdAt,
  };
}

function pollDto(poll, { userVotedOptionIds } = {}) {
  if (!poll) return null;
  const options = (poll.options || []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const totalVotes = options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
  return {
    id: poll.id,
    question: poll.question,
    allowMultiple: poll.allowMultiple,
    closesAt: poll.closesAt,
    totalVotes,
    options: options.map((o) => ({
      id: o.id,
      text: o.text,
      voteCount: o.votes?.length || 0,
      percent: totalVotes ? Math.round(((o.votes?.length || 0) / totalVotes) * 100) : 0,
      votedByMe: userVotedOptionIds ? userVotedOptionIds.has(o.id) : undefined,
    })),
  };
}

/** Only the author or a moderator/admin may see pending/rejected/deleted content. */
function canSeeContent(content, viewerId, isMod) {
  if (isMod) return true;
  if (content.isDeleted) return false;
  if (content.status === 'approved') return true;
  return content.authorId && viewerId && content.authorId === viewerId;
}

async function currentForumRole(userId, userRole) {
  if (userRole === 'admin') return 'admin';
  const grant = await ForumModerator.findOne({ where: { userId } });
  return grant ? 'moderator' : null;
}

async function logAction({ actorId, action, targetType, targetId, reportId, note }) {
  await ForumModerationAction.create({ actorId, action, targetType, targetId, reportId: reportId || null, note: note || null });
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

router.get('/categories', requireAuth, async (req, res) => {
  const categories = await ForumCategory.findAll({ where: { isArchived: false }, order: [['sortOrder', 'ASC'], ['name', 'ASC']] });
  res.json({ categories: categories.map(categoryDto) });
});

router.post(
  '/categories',
  requireForumModerator,
  body('name').trim().isLength({ min: 1, max: 80 }),
  body('description').optional({ nullable: true }).isLength({ max: 2000 }),
  body('color').optional().isIn(ForumCategory.COLORS),
  handleValidation,
  async (req, res) => {
    const slug = slugify(req.body.name);
    const existing = await ForumCategory.findOne({ where: { slug } });
    if (existing) return res.status(409).json({ message: 'A category with a similar name already exists.' });
    const category = await ForumCategory.create({
      name: req.body.name.trim(),
      slug,
      description: req.body.description || null,
      color: req.body.color || 'coral',
      isLocked: !!req.body.isLocked,
      createdById: req.user.id,
    });
    await logAction({ actorId: req.user.id, action: 'create_category', targetType: 'category', targetId: category.id });
    res.status(201).json({ category: categoryDto(category) });
  }
);

router.patch(
  '/categories/:id',
  requireForumModerator,
  param('id').isUUID(),
  body('name').optional().trim().isLength({ min: 1, max: 80 }),
  body('description').optional({ nullable: true }).isLength({ max: 2000 }),
  body('color').optional().isIn(ForumCategory.COLORS),
  handleValidation,
  async (req, res) => {
    const category = await ForumCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    ['description', 'color', 'sortOrder', 'isLocked', 'isArchived'].forEach((field) => {
      if (req.body[field] !== undefined) category[field] = req.body[field];
    });
    if (req.body.name) category.name = req.body.name.trim();
    await category.save();
    await logAction({ actorId: req.user.id, action: 'update_category', targetType: 'category', targetId: category.id });
    res.json({ category: categoryDto(category) });
  }
);

// Follow a subject (repurposed subreddit subscription) — drives the in-app
// notification fanout when a thread is approved there (see approveThread).
router.post('/categories/:id/follow', requireAuth, param('id').isUUID(), handleValidation, async (req, res) => {
  const category = await ForumCategory.findByPk(req.params.id);
  if (!category) return res.status(404).json({ message: 'Category not found' });
  try {
    await ForumSubscription.create({ userId: req.user.id, categoryId: category.id });
  } catch (error) {
    if (error.name !== 'SequelizeUniqueConstraintError') throw error;
  }
  res.json({ following: true });
});
router.delete('/categories/:id/follow', requireAuth, param('id').isUUID(), handleValidation, async (req, res) => {
  await ForumSubscription.destroy({ where: { userId: req.user.id, categoryId: req.params.id } });
  res.json({ following: false });
});
router.get('/me/subscriptions', requireAuth, async (req, res) => {
  const subs = await ForumSubscription.findAll({ where: { userId: req.user.id }, attributes: ['categoryId'] });
  res.json({ categoryIds: subs.map((s) => s.categoryId) });
});

// ---------------------------------------------------------------------------
// Threads — list, detail, create, edit, moderation actions
// ---------------------------------------------------------------------------

/** Applies the shared tag / solved / megathread query filters onto a where clause, in place. */
function applyThreadFilters(where, req) {
  if (req.query.tag) where.tags = { [Op.like]: `%"${req.query.tag}"%` };
  if (req.query.solved === 'true') { where.isQuestion = true; where.bestAnswerPostId = { [Op.ne]: null }; }
  if (req.query.solved === 'false') { where.isQuestion = true; where.bestAnswerPostId = null; }
  if (req.query.megathread === 'true') where.isMegathread = true;
}

router.get(
  '/categories/:slug/threads',
  requireAuth,
  param('slug').notEmpty(),
  query('sort').optional().isIn(SORT_VALUES),
  query('tag').optional().isIn(ForumThread.TAGS),
  query('solved').optional().isIn(['true', 'false']),
  query('megathread').optional().isIn(['true', 'false']),
  handleValidation,
  async (req, res) => {
    const category = await ForumCategory.findOne({ where: { slug: req.params.slug } });
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const { page, limit, offset } = paginate(req);
    const sort = req.query.sort || 'hot';
    const where = { categoryId: category.id, status: 'approved', isDeleted: false };
    applyThreadFilters(where, req);

    const { rows, count } = await ForumThread.findAndCountAll({
      where,
      include: [{ association: 'author' }, { association: 'category' }],
      order: orderForSort(sort),
      limit,
      offset,
    });
    const ids = rows.map((t) => t.id);
    const [likedSet, savedSet] = await Promise.all([
      withMyLike(req.user.id, 'thread', ids),
      withMySave(req.user.id, ids),
    ]);
    res.json({
      category: categoryDto(category),
      threads: rows.map((t) => threadSummaryDto(t, { viewerId: req.user.id, likedSet, savedSet })),
      page,
      limit,
      total: count,
    });
  }
);

// Reddit-style aggregate home feed — approved threads across every board,
// same sort tabs as a single board. No categoryId filter.
router.get(
  '/threads',
  requireAuth,
  query('sort').optional().isIn(SORT_VALUES),
  query('tag').optional().isIn(ForumThread.TAGS),
  query('solved').optional().isIn(['true', 'false']),
  handleValidation,
  async (req, res) => {
    const { page, limit, offset } = paginate(req);
    const sort = req.query.sort || 'hot';
    const where = { status: 'approved', isDeleted: false };
    applyThreadFilters(where, req);

    const { rows, count } = await ForumThread.findAndCountAll({
      where,
      include: [{ association: 'author' }, { association: 'category' }],
      order: orderForSort(sort),
      limit,
      offset,
    });
    const ids = rows.map((t) => t.id);
    const [likedSet, savedSet] = await Promise.all([
      withMyLike(req.user.id, 'thread', ids),
      withMySave(req.user.id, ids),
    ]);
    res.json({
      threads: rows.map((t) => threadSummaryDto(t, { viewerId: req.user.id, likedSet, savedSet })),
      page,
      limit,
      total: count,
    });
  }
);

// GET /forum/search?q=&subject=&tag=&solved= — simple portable LOWER()+LIKE
// search across title+body, combinable with the same filters as the feeds.
router.get(
  '/search',
  requireAuth,
  query('q').trim().isLength({ min: 2, max: 200 }),
  query('subject').optional().notEmpty(),
  query('tag').optional().isIn(ForumThread.TAGS),
  query('solved').optional().isIn(['true', 'false']),
  handleValidation,
  async (req, res) => {
    const { page, limit, offset } = paginate(req);
    const term = `%${req.query.q.toLowerCase()}%`;
    const where = {
      status: 'approved',
      isDeleted: false,
      [Op.or]: [
        sequelizeWhereLower('title', term),
        sequelizeWhereLower('body', term),
      ],
    };
    applyThreadFilters(where, req);
    if (req.query.subject) {
      const category = await ForumCategory.findOne({ where: { slug: req.query.subject } });
      where.categoryId = category ? category.id : '00000000-0000-0000-0000-000000000000';
    }

    const { rows, count } = await ForumThread.findAndCountAll({
      where,
      include: [{ association: 'author' }, { association: 'category' }],
      order: [['isPinned', 'DESC'], ['createdAt', 'DESC']],
      limit,
      offset,
    });
    const ids = rows.map((t) => t.id);
    const [likedSet, savedSet] = await Promise.all([
      withMyLike(req.user.id, 'thread', ids),
      withMySave(req.user.id, ids),
    ]);
    res.json({
      threads: rows.map((t) => threadSummaryDto(t, { viewerId: req.user.id, likedSet, savedSet })),
      page,
      limit,
      total: count,
      query: req.query.q,
    });
  }
);

router.post(
  '/categories/:categoryId/threads',
  requireAuth,
  threadCreateLimiter,
  param('categoryId').isUUID(),
  body('title').trim().isLength({ min: 4, max: 200 }),
  body('body').optional({ checkFalsy: true }).trim().isLength({ max: 8000 }),
  body('blocks').optional().isArray({ max: 40 }),
  body('isQuestion').optional().isBoolean(),
  body('isAnonymous').optional().isBoolean(),
  body('tags').optional().isArray({ max: 6 }),
  body('tags.*').optional().isIn(ForumThread.TAGS),
  body('poll').optional().isObject(),
  body('poll.question').if(body('poll').exists()).trim().isLength({ min: 1, max: 300 }),
  body('poll.options').if(body('poll').exists()).isArray({ min: 2, max: 8 }),
  body('poll.allowMultiple').optional().isBoolean(),
  handleValidation,
  async (req, res) => {
    try {
      await assertCanPost(req.user.id);
    } catch (error) {
      return res.status(error.status || 403).json({ message: error.message, code: error.code });
    }
    const category = await ForumCategory.findByPk(req.params.categoryId);
    if (!category || category.isArchived) return res.status(404).json({ message: 'Category not found' });
    const forumRole = await currentForumRole(req.user.id, req.user.role);
    if (category.isLocked && !forumRole) {
      return res.status(403).json({ message: 'Only moderators can start threads in this category.' });
    }

    let blocks;
    try {
      blocks = await validateAndSanitizeBlocks(req.body.blocks, req.user.id);
    } catch (error) {
      return res.status(error.status || 400).json({ message: error.message });
    }
    const bodyText = (req.body.body || '').trim() || deriveTextFromBlocks(blocks);
    if (!bodyText && !blocks.length) {
      return res.status(400).json({ message: 'Your thread needs some content — write something or add a block.' });
    }

    const pollOptions = (req.body.poll?.options || [])
      .map((text) => String(text || '').trim())
      .filter((text) => text.length > 0 && text.length <= 200);
    if (req.body.poll && pollOptions.length < 2) {
      return res.status(400).json({ message: 'A poll needs at least 2 non-empty options.' });
    }

    const { flagged, reasons } = computeAutoFlag(`${req.body.title}\n${bodyText}`);
    const thread = await ForumThread.create({
      categoryId: category.id,
      authorId: req.user.id,
      title: req.body.title.trim(),
      slug: slugify(req.body.title),
      body: bodyText,
      contentBlocks: blocks,
      isQuestion: !!req.body.isQuestion,
      isAnonymous: !!req.body.isAnonymous,
      tags: Array.isArray(req.body.tags) ? [...new Set(req.body.tags)] : [],
      status: 'pending',
      autoFlagged: flagged,
      autoFlagReasons: reasons,
    });

    if (req.body.poll) {
      const poll = await ForumPoll.create({
        threadId: thread.id,
        question: req.body.poll.question.trim(),
        allowMultiple: !!req.body.poll.allowMultiple,
      });
      await ForumPollOption.bulkCreate(pollOptions.map((text, i) => ({ pollId: poll.id, text, sortOrder: i })));
    }

    res.status(201).json({
      thread: threadSummaryDto(thread, { viewerId: req.user.id }),
      message: 'Your thread has been submitted and will appear once a moderator approves it.',
    });
  }
);

router.get('/threads/:id', requireAuth, param('id').isUUID(), handleValidation, async (req, res) => {
  const thread = await ForumThread.findByPk(req.params.id, {
    include: [
      { association: 'author' },
      { association: 'category' },
      { association: 'poll', include: [{ association: 'options', include: [{ association: 'votes', attributes: ['id', 'userId'] }] }] },
    ],
  });
  if (!thread) return res.status(404).json({ message: 'Thread not found' });
  const forumRole = await currentForumRole(req.user.id, req.user.role);
  const isMod = !!forumRole;
  if (!canSeeContent(thread, req.user.id, isMod)) return res.status(404).json({ message: 'Thread not found' });

  if (thread.status === 'approved' && !thread.isDeleted) {
    thread.viewCount += 1;
    await thread.save();
  }

  const postWhere = { threadId: thread.id };
  const allPosts = await ForumPost.findAll({ where: postWhere, include: [{ association: 'author' }], order: [['createdAt', 'ASC']] });
  const visiblePosts = allPosts.filter((p) => canSeeContent(p, req.user.id, isMod));
  const [likedThreadSet, likedPostSet, savedSet, threadReactions, postReactions, authorStats] = await Promise.all([
    withMyLike(req.user.id, 'thread', [thread.id]),
    withMyLike(req.user.id, 'post', visiblePosts.map((p) => p.id)),
    withMySave(req.user.id, [thread.id]),
    withMyReactions(req.user.id, 'thread', [thread.id]),
    withMyReactions(req.user.id, 'post', visiblePosts.map((p) => p.id)),
    thread.author ? getOrCreateStats(thread.author.id) : null,
  ]);

  let userVotedOptionIds;
  if (thread.poll) {
    userVotedOptionIds = new Set(
      (thread.poll.options || [])
        .filter((o) => (o.votes || []).some((v) => v.userId === req.user.id))
        .map((o) => o.id)
    );
  }

  res.json({
    thread: {
      ...threadSummaryDto(thread, { viewerId: req.user.id, isMod, likedSet: likedThreadSet, savedSet, myReactions: threadReactions }),
      body: thread.body,
      contentBlocks: thread.contentBlocks,
      poll: pollDto(thread.poll, { userVotedOptionIds }),
      // Withheld on anonymous threads for non-moderators — a contribution
      // score / badge set is itself an identifier.
      authorStats: (authorStats && (!thread.isAnonymous || isMod))
        ? { contributionScore: authorStats.contributionScore, badges: authorStats.badges }
        : null,
    },
    posts: visiblePosts.map((p) => postDto(p, { viewerId: req.user.id, isMod, likedSet: likedPostSet, bestAnswerPostId: thread.bestAnswerPostId, myReactions: postReactions })),
    forumRole,
  });
});

router.patch(
  '/threads/:id',
  requireAuth,
  param('id').isUUID(),
  body('title').optional().trim().isLength({ min: 4, max: 200 }),
  body('body').optional({ checkFalsy: true }).trim().isLength({ max: 8000 }),
  body('blocks').optional().isArray({ max: 40 }),
  body('tags').optional().isArray({ max: 6 }),
  body('tags.*').optional().isIn(ForumThread.TAGS),
  handleValidation,
  async (req, res) => {
    const thread = await ForumThread.findByPk(req.params.id);
    if (!thread || thread.isDeleted) return res.status(404).json({ message: 'Thread not found' });
    if (thread.authorId !== req.user.id) return res.status(403).json({ message: 'You can only edit your own thread.' });
    let blocks = thread.contentBlocks;
    if (req.body.blocks !== undefined) {
      try {
        blocks = await validateAndSanitizeBlocks(req.body.blocks, req.user.id);
      } catch (error) {
        return res.status(error.status || 400).json({ message: error.message });
      }
      thread.contentBlocks = blocks;
    }
    if (req.body.title) { thread.title = req.body.title.trim(); thread.slug = slugify(req.body.title); }
    if (req.body.body !== undefined) thread.body = req.body.body.trim();
    else if (req.body.blocks !== undefined) thread.body = deriveTextFromBlocks(blocks);
    if (!thread.body && !blocks.length) {
      return res.status(400).json({ message: 'Your thread needs some content — write something or add a block.' });
    }
    if (Array.isArray(req.body.tags)) thread.tags = [...new Set(req.body.tags)];
    // Any edit to a published thread re-enters the review queue — pre-moderation covers edits too.
    const { flagged, reasons } = computeAutoFlag(`${thread.title}\n${thread.body}`);
    thread.status = 'pending';
    thread.reviewedById = null;
    thread.reviewedAt = null;
    thread.moderationNote = null;
    thread.autoFlagged = flagged;
    thread.autoFlagReasons = reasons;
    await thread.save();
    res.json({ thread: threadSummaryDto(thread, { viewerId: req.user.id }), message: 'Your edit has been submitted for re-review.' });
  }
);

async function moderatorOrAuthor(req, res, thread) {
  const forumRole = await currentForumRole(req.user.id, req.user.role);
  if (forumRole) return { ok: true, forumRole };
  if (thread.authorId === req.user.id) return { ok: true, forumRole: null };
  return { ok: false };
}

router.post('/threads/:id/delete', requireAuth, param('id').isUUID(), handleValidation, async (req, res) => {
  const thread = await ForumThread.findByPk(req.params.id);
  if (!thread) return res.status(404).json({ message: 'Thread not found' });
  const access = await moderatorOrAuthor(req, res, thread);
  if (!access.ok) return res.status(403).json({ message: 'Not allowed' });
  if (thread.isDeleted) return res.json({ thread: threadSummaryDto(thread, { viewerId: req.user.id }) });

  if (thread.status === 'approved') {
    const category = await ForumCategory.findByPk(thread.categoryId);
    if (category) {
      category.threadCount = Math.max(0, category.threadCount - 1);
      category.postCount = Math.max(0, category.postCount - thread.replyCount);
      await category.save();
    }
    if (thread.authorId) await adjustStats(thread.authorId, { approvedThreadCount: -1 });
  }
  thread.isDeleted = true;
  thread.deletedById = req.user.id;
  thread.deletedAt = new Date();
  await thread.save();
  await logAction({ actorId: req.user.id, action: 'delete', targetType: 'thread', targetId: thread.id, note: req.body?.note });
  res.json({ thread: threadSummaryDto(thread, { viewerId: req.user.id }) });
});

router.post('/threads/:id/restore', requireForumModerator, param('id').isUUID(), handleValidation, async (req, res) => {
  const thread = await ForumThread.findByPk(req.params.id);
  if (!thread) return res.status(404).json({ message: 'Thread not found' });
  if (!thread.isDeleted) return res.json({ thread: threadSummaryDto(thread, { viewerId: req.user.id, isMod: true }) });
  thread.isDeleted = false;
  thread.deletedById = null;
  thread.deletedAt = null;
  await thread.save();
  if (thread.status === 'approved') {
    const category = await ForumCategory.findByPk(thread.categoryId);
    if (category) {
      category.threadCount += 1;
      category.postCount += thread.replyCount;
      await category.save();
    }
    if (thread.authorId) await adjustStats(thread.authorId, { approvedThreadCount: 1 });
  }
  await logAction({ actorId: req.user.id, action: 'restore', targetType: 'thread', targetId: thread.id });
  res.json({ thread: threadSummaryDto(thread, { viewerId: req.user.id, isMod: true }) });
});

async function togglePinLock(req, res, field, action) {
  const thread = await ForumThread.findByPk(req.params.id);
  if (!thread || thread.isDeleted) return res.status(404).json({ message: 'Thread not found' });
  thread[field] = action.startsWith('un') ? false : true;
  await thread.save();
  await logAction({ actorId: req.user.id, action, targetType: 'thread', targetId: thread.id });
  res.json({ thread: threadSummaryDto(thread, { viewerId: req.user.id, isMod: true }) });
}
router.post('/threads/:id/pin', requireForumModerator, param('id').isUUID(), handleValidation, (req, res) => togglePinLock(req, res, 'isPinned', 'pin'));
router.post('/threads/:id/unpin', requireForumModerator, param('id').isUUID(), handleValidation, (req, res) => togglePinLock(req, res, 'isPinned', 'unpin'));
router.post('/threads/:id/lock', requireForumModerator, param('id').isUUID(), handleValidation, (req, res) => togglePinLock(req, res, 'isLocked', 'lock'));
router.post('/threads/:id/unlock', requireForumModerator, param('id').isUUID(), handleValidation, (req, res) => togglePinLock(req, res, 'isLocked', 'unlock'));

// Master-resource megathreads — curated, mod-pinned study hubs per subject
// (repurposed "stickied megathread"). Always pinned while marked.
router.post('/threads/:id/megathread', requireForumModerator, param('id').isUUID(), handleValidation, async (req, res) => {
  const thread = await ForumThread.findByPk(req.params.id);
  if (!thread || thread.isDeleted) return res.status(404).json({ message: 'Thread not found' });
  thread.isMegathread = true;
  thread.isPinned = true;
  await thread.save();
  await logAction({ actorId: req.user.id, action: 'pin', targetType: 'thread', targetId: thread.id, note: 'marked as megathread' });
  res.json({ thread: threadSummaryDto(thread, { viewerId: req.user.id, isMod: true }) });
});
router.post('/threads/:id/megathread/clear', requireForumModerator, param('id').isUUID(), handleValidation, async (req, res) => {
  const thread = await ForumThread.findByPk(req.params.id);
  if (!thread || thread.isDeleted) return res.status(404).json({ message: 'Thread not found' });
  thread.isMegathread = false;
  await thread.save();
  await logAction({ actorId: req.user.id, action: 'unpin', targetType: 'thread', targetId: thread.id, note: 'unmarked as megathread' });
  res.json({ thread: threadSummaryDto(thread, { viewerId: req.user.id, isMod: true }) });
});

router.post(
  '/threads/:id/best-answer',
  requireAuth,
  param('id').isUUID(),
  body('postId').isUUID(),
  handleValidation,
  async (req, res) => {
    const thread = await ForumThread.findByPk(req.params.id);
    if (!thread || thread.isDeleted) return res.status(404).json({ message: 'Thread not found' });
    const access = await moderatorOrAuthor(req, res, thread);
    if (!access.ok) return res.status(403).json({ message: 'Only the thread author or a moderator can mark a best answer.' });
    const post = await ForumPost.findOne({ where: { id: req.body.postId, threadId: thread.id, status: 'approved', isDeleted: false } });
    if (!post) return res.status(404).json({ message: 'Reply not found' });
    const previousBestAnswerPostId = thread.bestAnswerPostId;
    thread.bestAnswerPostId = post.id;
    await thread.save();
    if (previousBestAnswerPostId && previousBestAnswerPostId !== post.id) {
      const previousPost = await ForumPost.findByPk(previousBestAnswerPostId);
      if (previousPost?.authorId) await adjustStats(previousPost.authorId, { bestAnswerCount: -1 });
    }
    if (post.authorId) await adjustStats(post.authorId, { bestAnswerCount: 1 });
    await logAction({ actorId: req.user.id, action: 'mark_best_answer', targetType: 'post', targetId: post.id });
    res.json({ thread: threadSummaryDto(thread, { viewerId: req.user.id }) });
  }
);

router.post('/threads/:id/best-answer/clear', requireAuth, param('id').isUUID(), handleValidation, async (req, res) => {
  const thread = await ForumThread.findByPk(req.params.id);
  if (!thread) return res.status(404).json({ message: 'Thread not found' });
  const access = await moderatorOrAuthor(req, res, thread);
  if (!access.ok) return res.status(403).json({ message: 'Not allowed' });
  const previousBestAnswerPostId = thread.bestAnswerPostId;
  thread.bestAnswerPostId = null;
  await thread.save();
  if (previousBestAnswerPostId) {
    const previousPost = await ForumPost.findByPk(previousBestAnswerPostId);
    if (previousPost?.authorId) await adjustStats(previousPost.authorId, { bestAnswerCount: -1 });
  }
  await logAction({ actorId: req.user.id, action: 'unmark_best_answer', targetType: 'thread', targetId: thread.id });
  res.json({ thread: threadSummaryDto(thread, { viewerId: req.user.id }) });
});

// ---------------------------------------------------------------------------
// Posts (replies)
// ---------------------------------------------------------------------------

router.post(
  '/threads/:id/posts',
  requireAuth,
  postCreateLimiter,
  param('id').isUUID(),
  body('content').optional({ checkFalsy: true }).trim().isLength({ max: 4000 }),
  body('blocks').optional().isArray({ max: 40 }),
  body('isAnonymous').optional().isBoolean(),
  body('parentPostId').optional({ nullable: true }).isUUID(),
  handleValidation,
  async (req, res) => {
    try {
      await assertCanPost(req.user.id);
    } catch (error) {
      return res.status(error.status || 403).json({ message: error.message, code: error.code });
    }
    const thread = await ForumThread.findByPk(req.params.id);
    if (!thread || thread.isDeleted || thread.status !== 'approved') return res.status(404).json({ message: 'Thread not found' });
    if (thread.isLocked) return res.status(403).json({ message: 'This thread is locked.' });

    let blocks;
    try {
      blocks = await validateAndSanitizeBlocks(req.body.blocks, req.user.id);
    } catch (error) {
      return res.status(error.status || 400).json({ message: error.message });
    }
    const contentText = (req.body.content || '').trim() || deriveTextFromBlocks(blocks);
    if (!contentText && !blocks.length) {
      return res.status(400).json({ message: 'Your reply needs some content — write something or add a block.' });
    }

    const { flagged, reasons } = computeAutoFlag(contentText);
    const post = await ForumPost.create({
      threadId: thread.id,
      authorId: req.user.id,
      parentPostId: req.body.parentPostId || null,
      content: contentText,
      contentBlocks: blocks,
      isAnonymous: !!req.body.isAnonymous,
      status: 'pending',
      autoFlagged: flagged,
      autoFlagReasons: reasons,
    });
    res.status(201).json({
      post: postDto(post, { viewerId: req.user.id }),
      message: 'Your reply has been submitted and will appear once a moderator approves it.',
    });
  }
);

router.patch(
  '/posts/:id',
  requireAuth,
  param('id').isUUID(),
  body('content').optional({ checkFalsy: true }).trim().isLength({ max: 4000 }),
  body('blocks').optional().isArray({ max: 40 }),
  handleValidation,
  async (req, res) => {
    const post = await ForumPost.findByPk(req.params.id);
    if (!post || post.isDeleted) return res.status(404).json({ message: 'Reply not found' });
    if (post.authorId !== req.user.id) return res.status(403).json({ message: 'You can only edit your own reply.' });
    let blocks = post.contentBlocks;
    if (req.body.blocks !== undefined) {
      try {
        blocks = await validateAndSanitizeBlocks(req.body.blocks, req.user.id);
      } catch (error) {
        return res.status(error.status || 400).json({ message: error.message });
      }
      post.contentBlocks = blocks;
    }
    if (req.body.content !== undefined) post.content = req.body.content.trim();
    else if (req.body.blocks !== undefined) post.content = deriveTextFromBlocks(blocks);
    if (!post.content && !blocks.length) {
      return res.status(400).json({ message: 'Your reply needs some content — write something or add a block.' });
    }
    const { flagged, reasons } = computeAutoFlag(post.content);
    post.status = 'pending';
    post.reviewedById = null;
    post.reviewedAt = null;
    post.moderationNote = null;
    post.autoFlagged = flagged;
    post.autoFlagReasons = reasons;
    post.editedAt = new Date();
    await post.save();
    res.json({ post: postDto(post, { viewerId: req.user.id }), message: 'Your edit has been submitted for re-review.' });
  }
);

router.post('/posts/:id/delete', requireAuth, param('id').isUUID(), handleValidation, async (req, res) => {
  const post = await ForumPost.findByPk(req.params.id);
  if (!post) return res.status(404).json({ message: 'Reply not found' });
  const forumRole = await currentForumRole(req.user.id, req.user.role);
  if (!forumRole && post.authorId !== req.user.id) return res.status(403).json({ message: 'Not allowed' });
  if (post.isDeleted) return res.json({ post: postDto(post, { viewerId: req.user.id }) });

  if (post.status === 'approved') {
    const thread = await ForumThread.findByPk(post.threadId);
    if (thread) { thread.replyCount = Math.max(0, thread.replyCount - 1); await thread.save(); }
    const category = thread && await ForumCategory.findByPk(thread.categoryId);
    if (category) { category.postCount = Math.max(0, category.postCount - 1); await category.save(); }
    if (post.authorId) await adjustStats(post.authorId, { approvedPostCount: -1 });
  }
  post.isDeleted = true;
  post.deletedById = req.user.id;
  post.deletedAt = new Date();
  await post.save();
  await logAction({ actorId: req.user.id, action: 'delete', targetType: 'post', targetId: post.id, note: req.body?.note });
  res.json({ post: postDto(post, { viewerId: req.user.id }) });
});

router.post('/posts/:id/restore', requireForumModerator, param('id').isUUID(), handleValidation, async (req, res) => {
  const post = await ForumPost.findByPk(req.params.id);
  if (!post) return res.status(404).json({ message: 'Reply not found' });
  if (!post.isDeleted) return res.json({ post: postDto(post, { viewerId: req.user.id, isMod: true }) });
  post.isDeleted = false;
  post.deletedById = null;
  post.deletedAt = null;
  await post.save();
  if (post.status === 'approved') {
    const thread = await ForumThread.findByPk(post.threadId);
    if (thread) { thread.replyCount += 1; await thread.save(); }
    const category = thread && await ForumCategory.findByPk(thread.categoryId);
    if (category) { category.postCount += 1; await category.save(); }
    if (post.authorId) await adjustStats(post.authorId, { approvedPostCount: 1 });
  }
  await logAction({ actorId: req.user.id, action: 'restore', targetType: 'post', targetId: post.id });
  res.json({ post: postDto(post, { viewerId: req.user.id, isMod: true }) });
});

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

async function toggleLike(req, res, { model, likeableType }) {
  const target = await model.findByPk(req.params.id);
  if (!target || target.isDeleted || target.status !== 'approved') return res.status(404).json({ message: 'Not found' });
  if (req.method === 'POST') {
    try {
      await ForumLike.create({ userId: req.user.id, likeableType, likeableId: target.id });
      target.likeCount += 1;
      await target.save();
    } catch {
      // Already liked — unique constraint hit. Treat as idempotent success.
    }
  } else {
    const deleted = await ForumLike.destroy({ where: { userId: req.user.id, likeableType, likeableId: target.id } });
    if (deleted) { target.likeCount = Math.max(0, target.likeCount - 1); await target.save(); }
  }
  res.json({ likeCount: target.likeCount });
}
router.post('/threads/:id/like', requireAuth, likeLimiter, param('id').isUUID(), handleValidation, (req, res) => toggleLike(req, res, { model: ForumThread, likeableType: 'thread' }));
router.delete('/threads/:id/like', requireAuth, likeLimiter, param('id').isUUID(), handleValidation, (req, res) => toggleLike(req, res, { model: ForumThread, likeableType: 'thread' }));
router.post('/posts/:id/like', requireAuth, likeLimiter, param('id').isUUID(), handleValidation, (req, res) => toggleLike(req, res, { model: ForumPost, likeableType: 'post' }));
router.delete('/posts/:id/like', requireAuth, likeLimiter, param('id').isUUID(), handleValidation, (req, res) => toggleLike(req, res, { model: ForumPost, likeableType: 'post' }));

// ---------------------------------------------------------------------------
// Study reactions — named learning signals beyond the plain like, e.g.
// "Helpful" / "Clear explanation" / "This helped me". A user can give a
// target several different reaction types at once, but only one of each.
// Every reaction received also feeds the recipient's Contribution score.
// ---------------------------------------------------------------------------

async function toggleReaction(req, res, { model, reactableType }) {
  const target = await model.findByPk(req.params.id);
  if (!target || target.isDeleted || target.status !== 'approved') return res.status(404).json({ message: 'Not found' });
  const reactionType = req.method === 'POST' ? req.body.type : req.params.type;

  if (req.method === 'POST') {
    try {
      await ForumReaction.create({ userId: req.user.id, reactableType, reactableId: target.id, reactionType });
      const counts = { ...target.reactionCounts };
      counts[reactionType] = (counts[reactionType] || 0) + 1;
      target.reactionCounts = counts;
      await target.save();
      if (target.authorId && target.authorId !== req.user.id) {
        await adjustStats(target.authorId, { helpfulReactionsReceived: 1 });
      }
    } catch (error) {
      if (error.name !== 'SequelizeUniqueConstraintError') throw error;
      // Already gave this exact reaction — idempotent no-op.
    }
  } else {
    const deleted = await ForumReaction.destroy({ where: { userId: req.user.id, reactableType, reactableId: target.id, reactionType } });
    if (deleted) {
      const counts = { ...target.reactionCounts };
      counts[reactionType] = Math.max(0, (counts[reactionType] || 0) - 1);
      target.reactionCounts = counts;
      await target.save();
      if (target.authorId && target.authorId !== req.user.id) {
        await adjustStats(target.authorId, { helpfulReactionsReceived: -1 });
      }
    }
  }
  res.json({ reactionCounts: target.reactionCounts });
}
router.post('/threads/:id/reactions', requireAuth, likeLimiter, param('id').isUUID(), body('type').isIn(ForumReaction.REACTION_TYPES), handleValidation, (req, res) => toggleReaction(req, res, { model: ForumThread, reactableType: 'thread' }));
router.delete('/threads/:id/reactions/:type', requireAuth, likeLimiter, param('id').isUUID(), param('type').isIn(ForumReaction.REACTION_TYPES), handleValidation, (req, res) => toggleReaction(req, res, { model: ForumThread, reactableType: 'thread' }));
router.post('/posts/:id/reactions', requireAuth, likeLimiter, param('id').isUUID(), body('type').isIn(ForumReaction.REACTION_TYPES), handleValidation, (req, res) => toggleReaction(req, res, { model: ForumPost, reactableType: 'post' }));
router.delete('/posts/:id/reactions/:type', requireAuth, likeLimiter, param('id').isUUID(), param('type').isIn(ForumReaction.REACTION_TYPES), handleValidation, (req, res) => toggleReaction(req, res, { model: ForumPost, reactableType: 'post' }));

// ---------------------------------------------------------------------------
// Saves — personal "Revision list" (repurposed bookmark). Thread-level only.
// ---------------------------------------------------------------------------

router.post('/threads/:id/save', requireAuth, param('id').isUUID(), handleValidation, async (req, res) => {
  const thread = await ForumThread.findByPk(req.params.id);
  if (!thread || thread.isDeleted || thread.status !== 'approved') return res.status(404).json({ message: 'Thread not found' });
  try {
    await ForumSave.create({ userId: req.user.id, threadId: thread.id });
  } catch (error) {
    if (error.name !== 'SequelizeUniqueConstraintError') throw error;
  }
  res.json({ saved: true });
});
router.delete('/threads/:id/save', requireAuth, param('id').isUUID(), handleValidation, async (req, res) => {
  await ForumSave.destroy({ where: { userId: req.user.id, threadId: req.params.id } });
  res.json({ saved: false });
});
router.get('/me/saved', requireAuth, async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const { rows, count } = await ForumSave.findAndCountAll({
    where: { userId: req.user.id },
    include: [{ association: 'thread', include: [{ association: 'author' }, { association: 'category' }] }],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });
  const threads = rows.map((r) => r.thread).filter((t) => t && !t.isDeleted);
  const ids = threads.map((t) => t.id);
  const likedSet = await withMyLike(req.user.id, 'thread', ids);
  res.json({
    threads: threads.map((t) => threadSummaryDto(t, { viewerId: req.user.id, likedSet, savedSet: new Set(ids) })),
    page,
    limit,
    total: count,
  });
});

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

async function fileReport(req, res, { model, reportableType }) {
  const target = await model.findByPk(req.params.id);
  if (!target) return res.status(404).json({ message: 'Not found' });
  const reason = req.body.reason;
  const reviewQueue = REPORT_REASON_TO_QUEUE[reason] || 'moderator';
  try {
    const report = await ForumReport.create({
      reportableType,
      reportableId: target.id,
      reportedById: req.user.id,
      contentAuthorId: target.authorId || null,
      reason,
      details: req.body.details || null,
      contentSnapshot: (reportableType === 'thread' ? target.body : target.content || '').slice(0, 2000),
      reviewQueue,
      priority: reviewQueue === 'admin' ? 'high' : 'standard',
    });
    target.flagCount += 1;
    await target.save();
    res.status(201).json({ report: { id: report.id, status: report.status } });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'You have already reported this.' });
    }
    throw error;
  }
}
router.post(
  '/threads/:id/reports', requireAuth, reportLimiter, param('id').isUUID(),
  body('reason').isIn(ForumReport.REASONS), body('details').optional({ nullable: true }).isLength({ max: 1000 }),
  handleValidation, (req, res) => fileReport(req, res, { model: ForumThread, reportableType: 'thread' })
);
router.post(
  '/posts/:id/reports', requireAuth, reportLimiter, param('id').isUUID(),
  body('reason').isIn(ForumReport.REASONS), body('details').optional({ nullable: true }).isLength({ max: 1000 }),
  handleValidation, (req, res) => fileReport(req, res, { model: ForumPost, reportableType: 'post' })
);

// ---------------------------------------------------------------------------
// Moderation queue
// ---------------------------------------------------------------------------

router.get('/moderation/pending', requireForumModerator, async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const [threads, posts] = await Promise.all([
    ForumThread.findAll({
      where: { status: 'pending', isDeleted: false },
      include: [{ association: 'author' }, { association: 'category' }],
      order: [['autoFlagged', 'DESC'], ['createdAt', 'ASC']],
      limit, offset,
    }),
    ForumPost.findAll({
      where: { status: 'pending', isDeleted: false },
      include: [{ association: 'author' }, { association: 'thread', attributes: ['id', 'title'] }],
      order: [['autoFlagged', 'DESC'], ['createdAt', 'ASC']],
      limit, offset,
    }),
  ]);
  res.json({
    threads: threads.map((t) => ({ ...threadSummaryDto(t, { viewerId: req.user.id, isMod: true }), body: t.body, contentBlocks: t.contentBlocks })),
    posts: posts.map((p) => ({ ...postDto(p, { viewerId: req.user.id, isMod: true }), threadTitle: p.thread?.title || null })),
    page,
    limit,
  });
});

async function notifySubscribers(thread, category) {
  const subs = await ForumSubscription.findAll({ where: { categoryId: category.id }, attributes: ['userId'] });
  const recipientIds = subs.map((s) => s.userId).filter((id) => id !== thread.authorId);
  if (!recipientIds.length) return;
  await ForumNotification.bulkCreate(recipientIds.map((userId) => ({
    userId,
    type: 'new_thread_in_subject',
    threadId: thread.id,
    categoryId: category.id,
    message: `New thread in ${category.name}: "${thread.title}"`,
  })));
}

async function approveThread(req, res) {
  const thread = await ForumThread.findByPk(req.params.id);
  if (!thread) return res.status(404).json({ message: 'Thread not found' });
  if (thread.status !== 'pending') return res.status(409).json({ message: 'Thread is not pending review.' });
  thread.status = 'approved';
  thread.reviewedById = req.user.id;
  thread.reviewedAt = new Date();
  thread.moderationNote = null;
  thread.lastActivityAt = new Date();
  await thread.save();
  const category = await ForumCategory.findByPk(thread.categoryId);
  if (category) { category.threadCount += 1; category.lastActivityAt = new Date(); await category.save(); }
  if (thread.authorId) await adjustStats(thread.authorId, { approvedThreadCount: 1 });
  if (category) await notifySubscribers(thread, category);
  await logAction({ actorId: req.user.id, action: 'approve_thread', targetType: 'thread', targetId: thread.id });
  res.json({ thread: threadSummaryDto(thread, { viewerId: req.user.id, isMod: true }) });
}
async function rejectThread(req, res) {
  const thread = await ForumThread.findByPk(req.params.id);
  if (!thread) return res.status(404).json({ message: 'Thread not found' });
  if (thread.status !== 'pending') return res.status(409).json({ message: 'Thread is not pending review.' });
  thread.status = 'rejected';
  thread.reviewedById = req.user.id;
  thread.reviewedAt = new Date();
  thread.moderationNote = req.body.note || null;
  await thread.save();
  await logAction({ actorId: req.user.id, action: 'reject_thread', targetType: 'thread', targetId: thread.id, note: req.body.note });
  res.json({ thread: threadSummaryDto(thread, { viewerId: req.user.id, isMod: true }) });
}
router.post('/moderation/threads/:id/approve', requireForumModerator, param('id').isUUID(), handleValidation, approveThread);
router.post('/moderation/threads/:id/reject', requireForumModerator, param('id').isUUID(), body('note').optional({ nullable: true }).isLength({ max: 1000 }), handleValidation, rejectThread);

async function approvePost(req, res) {
  const post = await ForumPost.findByPk(req.params.id);
  if (!post) return res.status(404).json({ message: 'Reply not found' });
  if (post.status !== 'pending') return res.status(409).json({ message: 'Reply is not pending review.' });
  post.status = 'approved';
  post.reviewedById = req.user.id;
  post.reviewedAt = new Date();
  post.moderationNote = null;
  await post.save();
  const thread = await ForumThread.findByPk(post.threadId);
  if (thread) { thread.replyCount += 1; thread.lastActivityAt = new Date(); await thread.save(); }
  const category = thread && await ForumCategory.findByPk(thread.categoryId);
  if (category) { category.postCount += 1; category.lastActivityAt = new Date(); await category.save(); }
  if (post.authorId) await adjustStats(post.authorId, { approvedPostCount: 1 });
  await logAction({ actorId: req.user.id, action: 'approve_post', targetType: 'post', targetId: post.id });
  res.json({ post: postDto(post, { viewerId: req.user.id, isMod: true }) });
}
async function rejectPost(req, res) {
  const post = await ForumPost.findByPk(req.params.id);
  if (!post) return res.status(404).json({ message: 'Reply not found' });
  if (post.status !== 'pending') return res.status(409).json({ message: 'Reply is not pending review.' });
  post.status = 'rejected';
  post.reviewedById = req.user.id;
  post.reviewedAt = new Date();
  post.moderationNote = req.body.note || null;
  await post.save();
  await logAction({ actorId: req.user.id, action: 'reject_post', targetType: 'post', targetId: post.id, note: req.body.note });
  res.json({ post: postDto(post, { viewerId: req.user.id, isMod: true }) });
}
router.post('/moderation/posts/:id/approve', requireForumModerator, param('id').isUUID(), handleValidation, approvePost);
router.post('/moderation/posts/:id/reject', requireForumModerator, param('id').isUUID(), body('note').optional({ nullable: true }).isLength({ max: 1000 }), handleValidation, rejectPost);

router.get('/moderation/reports', requireForumModerator, query('status').optional().isIn(ForumReport.STATUSES), async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const where = {};
  if (req.forumRole !== 'admin') where.reviewQueue = 'moderator';
  where.status = req.query.status || 'pending';
  const { rows, count } = await ForumReport.findAndCountAll({
    where,
    include: [{ association: 'reporter' }, { association: 'contentAuthor' }, { association: 'reviewer' }],
    order: [['priority', 'DESC'], ['createdAt', 'ASC']],
    limit, offset,
  });
  res.json({
    reports: rows.map((r) => ({
      id: r.id,
      reportableType: r.reportableType,
      reportableId: r.reportableId,
      reason: r.reason,
      details: r.details,
      contentSnapshot: r.contentSnapshot,
      status: r.status,
      reviewQueue: r.reviewQueue,
      priority: r.priority,
      reporter: userDto(r.reporter),
      contentAuthor: userDto(r.contentAuthor),
      reviewer: userDto(r.reviewer),
      reviewedAt: r.reviewedAt,
      createdAt: r.createdAt,
    })),
    page,
    limit,
    total: count,
  });
});

router.patch(
  '/moderation/reports/:id',
  requireForumModerator,
  param('id').isUUID(),
  body('status').isIn(['dismissed', 'actioned']),
  body('note').optional({ nullable: true }).isLength({ max: 1000 }),
  handleValidation,
  async (req, res) => {
    const report = await ForumReport.findByPk(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });
    if (report.reviewQueue === 'admin' && req.forumRole !== 'admin') {
      return res.status(403).json({ message: 'This report requires admin review.' });
    }
    report.status = req.body.status;
    report.reviewedById = req.user.id;
    report.reviewedAt = new Date();
    await report.save();
    await logAction({
      actorId: req.user.id,
      action: req.body.status === 'actioned' ? 'action_report' : 'dismiss_report',
      targetType: 'report',
      targetId: report.id,
      reportId: report.id,
      note: req.body.note,
    });
    res.json({ report: { id: report.id, status: report.status } });
  }
);

router.get('/moderation/actions', requireForumModerator, async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const { rows, count } = await ForumModerationAction.findAndCountAll({
    include: [{ association: 'actor' }],
    order: [['createdAt', 'DESC']],
    limit, offset,
  });
  res.json({
    actions: rows.map((a) => ({
      id: a.id, action: a.action, targetType: a.targetType, targetId: a.targetId,
      actor: userDto(a.actor), note: a.note, createdAt: a.createdAt,
    })),
    page, limit, total: count,
  });
});

// ---------------------------------------------------------------------------
// Sanctions (mute / ban)
// ---------------------------------------------------------------------------

router.get('/moderation/sanctions', requireForumModerator, async (req, res) => {
  const sanctions = await ForumSanction.findAll({
    where: { active: true },
    include: [{ association: 'user' }, { association: 'issuedBy' }],
    order: [['createdAt', 'DESC']],
  });
  res.json({
    sanctions: sanctions.map((s) => ({
      id: s.id, type: s.type, reason: s.reason, expiresAt: s.expiresAt,
      user: userDto(s.user), issuedBy: userDto(s.issuedBy), createdAt: s.createdAt,
    })),
  });
});

router.post(
  '/moderation/users/:userId/sanctions',
  requireForumModerator,
  param('userId').isUUID(),
  body('type').isIn(['mute', 'ban']),
  body('reason').trim().isLength({ min: 1, max: 1000 }),
  body('expiresAt').optional({ nullable: true }).isISO8601(),
  handleValidation,
  async (req, res) => {
    if (req.body.type === 'ban' && req.forumRole !== 'admin') {
      return res.status(403).json({ message: 'Only an admin can ban a user.' });
    }
    const existing = await getActiveSanction(req.params.userId);
    if (existing) {
      existing.active = false;
      existing.liftedAt = new Date();
      existing.liftedById = req.user.id;
      await existing.save();
    }
    const sanction = await ForumSanction.create({
      userId: req.params.userId,
      type: req.body.type,
      reason: req.body.reason.trim(),
      issuedById: req.user.id,
      expiresAt: req.body.expiresAt || null,
    });
    await logAction({ actorId: req.user.id, action: req.body.type, targetType: 'user', targetId: req.params.userId, note: req.body.reason });
    res.status(201).json({ sanction: { id: sanction.id, type: sanction.type, expiresAt: sanction.expiresAt } });
  }
);

router.post('/moderation/sanctions/:id/lift', requireForumModerator, param('id').isUUID(), handleValidation, async (req, res) => {
  const sanction = await ForumSanction.findByPk(req.params.id);
  if (!sanction) return res.status(404).json({ message: 'Sanction not found' });
  if (sanction.type === 'ban' && req.forumRole !== 'admin') {
    return res.status(403).json({ message: 'Only an admin can lift a ban.' });
  }
  sanction.active = false;
  sanction.liftedAt = new Date();
  sanction.liftedById = req.user.id;
  await sanction.save();
  await logAction({ actorId: req.user.id, action: 'lift_sanction', targetType: 'user', targetId: sanction.userId });
  res.json({ sanction: { id: sanction.id, active: sanction.active } });
});

// ---------------------------------------------------------------------------
// Profiles — Contribution score + badges, surfaced next to a member's name.
// ---------------------------------------------------------------------------

router.get('/users/:userId/profile', requireAuth, param('userId').isUUID(), handleValidation, async (req, res) => {
  const user = await User.findByPk(req.params.userId, { attributes: ['id', 'firstName', 'lastName', 'createdAt'] });
  if (!user) return res.status(404).json({ message: 'Member not found' });
  const stats = await getOrCreateStats(user.id);
  // Anonymous threads are excluded from the public profile listing — showing
  // them here would defeat the anonymity the author was promised.
  const recentThreads = await ForumThread.findAll({
    where: { authorId: user.id, status: 'approved', isDeleted: false, isAnonymous: false },
    include: [{ association: 'category' }, { association: 'author' }],
    order: [['createdAt', 'DESC']],
    limit: 10,
  });
  res.json({
    user: userDto(user),
    memberSince: user.createdAt,
    stats: {
      contributionScore: stats.contributionScore,
      bestAnswerCount: stats.bestAnswerCount,
      helpfulReactionsReceived: stats.helpfulReactionsReceived,
      approvedThreadCount: stats.approvedThreadCount,
      approvedPostCount: stats.approvedPostCount,
      badges: stats.badges.map((key) => ForumUserStats.BADGES.find((b) => b.key === key)).filter(Boolean),
    },
    recentThreads: recentThreads.map((t) => threadSummaryDto(t, { viewerId: req.user.id })),
  });
});

// ---------------------------------------------------------------------------
// Polls — "study check" attached to a thread (which-answer-is-correct,
// confidence checks). Created alongside the thread; this only handles votes.
// ---------------------------------------------------------------------------

router.post(
  '/polls/:id/vote',
  requireAuth,
  param('id').isUUID(),
  body('optionId').isUUID(),
  handleValidation,
  async (req, res) => {
    const poll = await ForumPoll.findByPk(req.params.id, { include: [{ association: 'thread' }] });
    if (!poll) return res.status(404).json({ message: 'Poll not found' });
    if (!poll.thread || poll.thread.isDeleted || poll.thread.status !== 'approved') return res.status(404).json({ message: 'Poll not found' });
    if (poll.closesAt && new Date(poll.closesAt).getTime() < Date.now()) return res.status(403).json({ message: 'This poll is closed.' });
    const option = await ForumPollOption.findOne({ where: { id: req.body.optionId, pollId: poll.id } });
    if (!option) return res.status(404).json({ message: 'Option not found' });

    if (!poll.allowMultiple) {
      await ForumPollVote.destroy({ where: { pollId: poll.id, userId: req.user.id } });
    }
    try {
      await ForumPollVote.create({ pollId: poll.id, optionId: option.id, userId: req.user.id });
    } catch (error) {
      if (error.name !== 'SequelizeUniqueConstraintError') throw error;
    }

    const refreshed = await ForumPoll.findByPk(poll.id, {
      include: [{ association: 'options', include: [{ association: 'votes', attributes: ['id', 'userId'] }] }],
    });
    const userVotedOptionIds = new Set(
      (refreshed.options || []).filter((o) => (o.votes || []).some((v) => v.userId === req.user.id)).map((o) => o.id)
    );
    res.json({ poll: pollDto(refreshed, { userVotedOptionIds }) });
  }
);

router.delete('/polls/:id/vote', requireAuth, param('id').isUUID(), handleValidation, async (req, res) => {
  await ForumPollVote.destroy({ where: { pollId: req.params.id, userId: req.user.id } });
  const refreshed = await ForumPoll.findByPk(req.params.id, {
    include: [{ association: 'options', include: [{ association: 'votes', attributes: ['id', 'userId'] }] }],
  });
  if (!refreshed) return res.status(404).json({ message: 'Poll not found' });
  res.json({ poll: pollDto(refreshed, { userVotedOptionIds: new Set() }) });
});

// ---------------------------------------------------------------------------
// Current-user helpers
// ---------------------------------------------------------------------------

router.get('/me/status', requireAuth, async (req, res) => {
  const forumRole = await currentForumRole(req.user.id, req.user.role);
  const sanction = await getActiveSanction(req.user.id);
  res.json({
    isAdmin: req.user.role === 'admin',
    isModerator: !!forumRole,
    forumRole,
    sanction: sanction ? { type: sanction.type, reason: sanction.reason, expiresAt: sanction.expiresAt } : null,
  });
});

router.get('/me/threads', requireAuth, async (req, res) => {
  const threads = await ForumThread.findAll({
    where: { authorId: req.user.id },
    include: [{ association: 'category' }, { association: 'author' }],
    order: [['createdAt', 'DESC']],
    limit: 50,
  });
  res.json({ threads: threads.map((t) => threadSummaryDto(t, { viewerId: req.user.id })) });
});

// ---------------------------------------------------------------------------
// Notifications — in-app only (no email/push infra). Fanned out on thread
// approval to followers of that subject; see notifySubscribers() above.
// ---------------------------------------------------------------------------

router.get('/me/notifications', requireAuth, async (req, res) => {
  const { page, limit, offset } = paginate(req);
  const [{ rows, count }, unreadCount] = await Promise.all([
    ForumNotification.findAndCountAll({
      where: { userId: req.user.id },
      include: [{ association: 'thread', attributes: ['id', 'title'] }, { association: 'category', attributes: ['id', 'name', 'slug'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    }),
    ForumNotification.count({ where: { userId: req.user.id, isRead: false } }),
  ]);
  res.json({
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      message: n.message,
      isRead: n.isRead,
      thread: n.thread ? { id: n.thread.id, title: n.thread.title } : null,
      category: n.category ? { id: n.category.id, name: n.category.name, slug: n.category.slug } : null,
      createdAt: n.createdAt,
    })),
    unreadCount,
    page,
    limit,
    total: count,
  });
});

router.post('/me/notifications/:id/read', requireAuth, param('id').isUUID(), handleValidation, async (req, res) => {
  const [updated] = await ForumNotification.update({ isRead: true }, { where: { id: req.params.id, userId: req.user.id } });
  if (!updated) return res.status(404).json({ message: 'Notification not found' });
  res.json({ ok: true });
});

router.post('/me/notifications/read-all', requireAuth, async (req, res) => {
  await ForumNotification.update({ isRead: true }, { where: { userId: req.user.id, isRead: false } });
  res.json({ ok: true });
});

module.exports = router;
