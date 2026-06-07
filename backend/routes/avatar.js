const express = require('express');
const User = require('../models/User');
const UserItem = require('../models/UserItem');
const UserProgress = require('../models/UserProgress');
const { requireAuth } = require('../middleware/auth');
const { sanitizeAvatarConfig, levelInfo } = require('../config/avatar');
const { CATALOG, itemId, isFreeValue } = require('../config/shopCatalog');

const router = express.Router();
router.use(requireAuth);

// Avatar option keys that map to catalog items (must be free or owned to equip).
const CATALOG_KEYS = new Set(CATALOG.map((c) => c.key));

async function getOwnedSet(userId) {
  const rows = await UserItem.findAll({ where: { userId }, attributes: ['itemId'] });
  return new Set(rows.map((r) => r.itemId));
}

// GET /api/avatar — config + level + wallet + ownership.
router.get('/', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'avatarConfig', 'coins'] });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const completed = await UserProgress.count({
      where: { userId: req.user.id, status: 'completed' },
    });
    const ownedSet = await getOwnedSet(req.user.id);

    res.json({
      avatarConfig: user.avatarConfig || null,
      coins: user.coins,
      ownedItemIds: [...ownedSet],
      ...levelInfo(completed),
    });
  } catch (e) {
    console.error('Get avatar error:', e.message || e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/avatar — save the user's selected avatar options.
// Equipped options must be free (cost 0) or owned; otherwise rejected.
router.put('/', async (req, res) => {
  try {
    const clean = sanitizeAvatarConfig(req.body?.avatarConfig);
    if (!clean) {
      return res.status(400).json({ message: 'Invalid avatar config.' });
    }

    const ownedSet = await getOwnedSet(req.user.id);
    const locked = [];
    for (const [key, value] of Object.entries(clean)) {
      if (!CATALOG_KEYS.has(key)) continue; // e.g. "seed" — not a catalog item
      if (isFreeValue(key, value)) continue;
      if (ownedSet.has(itemId(key, value))) continue;
      locked.push(itemId(key, value));
    }
    if (locked.length) {
      return res.status(403).json({
        message: 'You don\'t own some of these items yet. Get them in the shop first.',
        locked,
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.avatarConfig = clean;
    await user.save();

    res.json({ avatarConfig: user.avatarConfig });
  } catch (e) {
    console.error('Save avatar error:', e.message || e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
