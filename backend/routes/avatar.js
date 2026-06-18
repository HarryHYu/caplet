const express = require('express');
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const { requireAuth } = require('../middleware/auth');
const { sanitizeAvatarConfig, levelInfo } = require('../config/avatar');

const router = express.Router();
router.use(requireAuth);

// GET /api/avatar — current user's avatar config + derived level.
router.get('/', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'avatarConfig'] });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const completed = await UserProgress.count({
      where: { userId: req.user.id, status: 'completed' },
    });

    res.json({
      avatarConfig: user.avatarConfig || null,
      ...levelInfo(completed),
    });
  } catch (e) {
    console.error('Get avatar error:', e.message || e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/avatar — save the user's selected avatar options.
router.put('/', async (req, res) => {
  try {
    const clean = sanitizeAvatarConfig(req.body?.avatarConfig);
    if (!clean) {
      return res.status(400).json({ message: 'Invalid avatar config.' });
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
