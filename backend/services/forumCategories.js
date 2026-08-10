const { ForumCategory } = require('../models');

// These boards are the forum's own standalone concept — chosen independently
// of, and with no data link to, the app's Course/CurriculumOutcome subject
// taxonomy (the forum shares only the User/auth layer with the rest of
// Caplet; see models/index.js). Seeded via findOrCreate at boot, like
// ensureMoneyRegistry — never destructive, safe to run on every startup.
const DEFAULT_CATEGORIES = [
  { name: 'Announcements', slug: 'announcements', color: 'blue', isLocked: true, sortOrder: 0, description: 'Official updates from moderators and admins.' },
  { name: 'Economics', slug: 'economics', color: 'coral', sortOrder: 1, description: 'Economics questions, discussion, and study help.' },
  { name: 'Business Studies', slug: 'business-studies', color: 'amber', sortOrder: 2, description: 'Business Studies questions, discussion, and study help.' },
  { name: 'Study Skills', slug: 'study-skills', color: 'green', sortOrder: 3, description: 'Techniques, planning, and general study advice.' },
  { name: 'General', slug: 'general', color: 'coral', sortOrder: 4, description: 'Anything else related to school and study.' },
];

async function ensureForumCategories() {
  for (const category of DEFAULT_CATEGORIES) {
    await ForumCategory.findOrCreate({ where: { slug: category.slug }, defaults: category });
  }
}

module.exports = { ensureForumCategories, DEFAULT_CATEGORIES };
