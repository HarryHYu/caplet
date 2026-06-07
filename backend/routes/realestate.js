const express = require('express');
const { sequelize } = require('../config/database');
const Property = require('../models/Property');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Allowed customization options (validated server-side).
const HOUSE_STYLES = ['cottage', 'townhouse', 'modern', 'villa', 'mansion', 'castle'];
const HOUSE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#78716c', '#0ea5e9'];
const SELL_REFUND = 0.7; // 70% back on sell
const DEFAULT_STYLE = 'cottage';
const DEFAULT_COLOR = '#cbd5e1';

function ownerView(owner) {
  if (!owner) return null;
  return {
    id: owner.id,
    name: [owner.firstName, owner.lastName].filter(Boolean).join(' ') || 'A Caplet learner',
    avatarConfig: owner.avatarConfig || null,
  };
}

// GET /api/realestate — the whole map + the player's balance + option lists.
router.get('/', async (req, res) => {
  try {
    const [properties, me] = await Promise.all([
      Property.findAll({
        include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName', 'avatarConfig'] }],
        order: [['gridY', 'ASC'], ['gridX', 'ASC']],
      }),
      User.findByPk(req.user.id, { attributes: ['capletCoins'] }),
    ]);

    res.json({
      capletCoins: me?.capletCoins ?? 0,
      styles: HOUSE_STYLES,
      colors: HOUSE_COLORS,
      properties: properties.map((p) => ({
        id: p.id,
        name: p.name,
        neighborhood: p.neighborhood,
        tier: p.tier,
        gridX: p.gridX,
        gridY: p.gridY,
        price: p.price,
        houseStyle: p.houseStyle,
        houseColor: p.houseColor,
        owner: ownerView(p.owner),
        mine: p.ownerId === req.user.id,
      })),
    });
  } catch (e) {
    console.error('Get realestate error:', e.message || e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/realestate/:id/buy — purchase an unowned plot with Caplet Coins.
router.post('/:id/buy', async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
      const property = await Property.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!property) throw Object.assign(new Error('Property not found'), { status: 404 });
      if (property.ownerId) throw Object.assign(new Error('That property is already owned.'), { status: 409 });

      const user = await User.findByPk(req.user.id, { transaction: t, lock: t.LOCK.UPDATE });
      if (user.capletCoins < property.price) {
        throw Object.assign(new Error('Not enough Caplet Coins. Complete more lessons to earn coins!'), { status: 400 });
      }

      user.capletCoins -= property.price;
      property.ownerId = user.id;
      await user.save({ transaction: t });
      await property.save({ transaction: t });
      return { capletCoins: user.capletCoins, propertyId: property.id };
    });
    res.json({ ...result, owned: true });
  } catch (e) {
    const status = e.status || 500;
    console.error('Buy property error:', e.message || e);
    res.status(status).json({ message: e.message || 'Purchase failed' });
  }
});

// PUT /api/realestate/:id/customize — owner sets house style + colour.
router.put('/:id/customize', async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (property.ownerId !== req.user.id) return res.status(403).json({ message: 'You do not own this property.' });

    const style = req.body?.houseStyle;
    const color = req.body?.houseColor;
    if (style && !HOUSE_STYLES.includes(style)) return res.status(400).json({ message: 'Invalid house style.' });
    if (color && !HOUSE_COLORS.includes(color)) return res.status(400).json({ message: 'Invalid house colour.' });

    if (style) property.houseStyle = style;
    if (color) property.houseColor = color;
    await property.save();
    res.json({ houseStyle: property.houseStyle, houseColor: property.houseColor });
  } catch (e) {
    console.error('Customize property error:', e.message || e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/realestate/:id/sell — sell an owned plot back for a partial refund.
router.post('/:id/sell', async (req, res) => {
  try {
    const result = await sequelize.transaction(async (t) => {
      const property = await Property.findByPk(req.params.id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!property) throw Object.assign(new Error('Property not found'), { status: 404 });
      if (property.ownerId !== req.user.id) throw Object.assign(new Error('You do not own this property.'), { status: 403 });

      const refund = Math.floor(property.price * SELL_REFUND);
      const user = await User.findByPk(req.user.id, { transaction: t, lock: t.LOCK.UPDATE });
      user.capletCoins += refund;
      property.ownerId = null;
      property.houseStyle = DEFAULT_STYLE;
      property.houseColor = DEFAULT_COLOR;
      await user.save({ transaction: t });
      await property.save({ transaction: t });
      return { capletCoins: user.capletCoins, refund, propertyId: property.id };
    });
    res.json({ ...result, owned: false });
  } catch (e) {
    const status = e.status || 500;
    console.error('Sell property error:', e.message || e);
    res.status(status).json({ message: e.message || 'Sell failed' });
  }
});

module.exports = router;
