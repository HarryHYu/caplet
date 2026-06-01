const express = require('express');
const { sequelize } = require('../config/database');
const User = require('../models/User');
const UserItem = require('../models/UserItem');
const { requireAuth } = require('../middleware/auth');
const { CATALOG, getItem } = require('../config/shopCatalog');

const router = express.Router();
router.use(requireAuth);

async function getOwnedSet(userId) {
  const rows = await UserItem.findAll({ where: { userId }, attributes: ['itemId'] });
  return new Set(rows.map((r) => r.itemId));
}

// Build the catalog annotated with owned / affordable flags for this user.
function annotateCatalog(coins, ownedSet) {
  return CATALOG.map((cat) => ({
    key: cat.key,
    label: cat.label,
    type: cat.type,
    options: cat.options.map((opt) => {
      const id = `${cat.key}:${opt.value}`;
      const cost = opt.cost || 0;
      const owned = cost === 0 || ownedSet.has(id);
      return {
        id,
        value: opt.value,
        label: opt.label,
        cost,
        rarity: opt.rarity || null,
        owned,
        affordable: owned || coins >= cost,
      };
    }),
  }));
}

// GET /api/shop — catalog + wallet + ownership for the current user.
router.get('/', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'coins'] });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const ownedSet = await getOwnedSet(req.user.id);
    res.json({
      coins: user.coins,
      ownedItemIds: [...ownedSet],
      catalog: annotateCatalog(user.coins, ownedSet),
    });
  } catch (e) {
    console.error('Get shop error:', e.message || e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/shop/purchase { itemId } — buy a paid item.
router.post('/purchase', async (req, res) => {
  try {
    const itemId = (req.body?.itemId ?? '').toString();
    const item = getItem(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found.' });
    if (item.cost <= 0) return res.status(400).json({ message: 'This item is free — no purchase needed.' });

    // Atomic-ish: do the coin check + deduct + grant inside a transaction.
    const result = await sequelize.transaction(async (t) => {
      const user = await User.findByPk(req.user.id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

      const already = await UserItem.findOne({ where: { userId: user.id, itemId }, transaction: t });
      if (already) return { coins: user.coins, alreadyOwned: true };

      if (user.coins < item.cost) {
        throw Object.assign(new Error('Not enough coins.'), { status: 400 });
      }

      user.coins -= item.cost;
      await user.save({ transaction: t });
      await UserItem.create({ userId: user.id, itemId }, { transaction: t });
      return { coins: user.coins, alreadyOwned: false };
    });

    const ownedSet = await getOwnedSet(req.user.id);
    res.json({ coins: result.coins, itemId, owned: true, ownedItemIds: [...ownedSet] });
  } catch (e) {
    const status = e.status || 500;
    console.error('Purchase error:', e.message || e);
    res.status(status).json({ message: e.message || 'Purchase failed' });
  }
});

module.exports = router;
