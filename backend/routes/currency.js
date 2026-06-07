const express = require('express');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/currency — the current user's balances.
// (Earning Caplet Coins happens on lesson completion in the progress route.
//  Caplet Gems are premium/microtransaction — balance only for now.)
router.get('/', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['capletCoins', 'capletGems', 'coins'],
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      capletCoins: user.capletCoins,
      capletGems: user.capletGems,
      shopCoins: user.coins,
    });
  } catch (e) {
    console.error('Get currency error:', e.message || e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
