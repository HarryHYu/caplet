const { requireAuth } = require('./auth');
const { ForumModerator } = require('../models');

/**
 * requireAuth + must be a site admin OR hold a ForumModerator grant.
 * Attaches req.forumRole = 'admin' | 'moderator' for handlers that need to
 * tell the two apart (e.g. only admins may issue bans).
 */
const requireForumModerator = async (req, res, next) => {
  requireAuth(req, res, async () => {
    try {
      if (req.user?.role === 'admin') {
        req.forumRole = 'admin';
        return next();
      }
      const grant = await ForumModerator.findOne({ where: { userId: req.user.id } });
      if (!grant) {
        return res.status(403).json({ message: 'Forum moderator access required' });
      }
      req.forumRole = 'moderator';
      next();
    } catch {
      res.status(500).json({ message: 'Could not verify moderator access' });
    }
  });
};

module.exports = { requireForumModerator };
