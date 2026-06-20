const express = require('express');
const { sequelize } = require('../config/database');
const Property = require('../models/Property');
const PropertyTransaction = require('../models/PropertyTransaction');
const User = require('../models/User');
const ClassMembership = require('../models/ClassMembership');
const { requireAuth } = require('../middleware/auth');
const { emitToAcademy } = require('../services/realtime');
const { getCityPlan, getPlotAt } = require('../services/cityPlan');

// mergeParams so :classroomId from the mount path is visible here.
const router = express.Router({ mergeParams: true });
router.use(requireAuth);

// Allowed customization options (validated server-side). Mirrors the legacy
// realestate route so houses look consistent across the app.
const HOUSE_STYLES = ['cottage', 'townhouse', 'modern', 'villa', 'mansion', 'castle'];
const HOUSE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#78716c', '#0ea5e9'];
const SELL_REFUND = 0.7; // 70% of market value back on a bank sell.
const DEFAULT_STYLE = 'cottage';
const DEFAULT_COLOR = '#cbd5e1';

// Gate every route on academy membership.
router.use(async (req, res, next) => {
  try {
    const classroomId = req.params.classroomId;
    const membership = await ClassMembership.findOne({
      where: { classroomId, userId: req.user.id },
    });
    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this academy.' });
    }
    req.membership = membership;
    next();
  } catch (e) {
    console.error('Academy estate membership check error:', e.message || e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

function ownerView(owner) {
  if (!owner) return null;
  return {
    id: owner.id,
    name: [owner.firstName, owner.lastName].filter(Boolean).join(' ') || 'A Caplet learner',
  };
}

// Shape a Property row for the client, from the current user's perspective.
function plotView(p, userId) {
  return {
    id: p.id,
    name: p.name,
    neighborhood: p.neighborhood,
    tier: p.tier,
    gridX: p.gridX,
    gridY: p.gridY,
    price: p.price,
    marketValue: p.marketValue,
    purchasePrice: p.ownerId === userId ? p.purchasePrice : null,
    forSale: p.forSale,
    askingPrice: p.forSale ? p.askingPrice : null,
    houseStyle: p.houseStyle,
    houseColor: p.houseColor,
    owner: ownerView(p.owner),
    mine: p.ownerId === userId,
  };
}

// Load the full plot (with owner) and return a client view — used to build the
// broadcast payload after a mutation. Perspective-neutral fields only.
async function broadcastPlot(classroomId, propertyId, activity) {
  const p = await Property.findByPk(propertyId, {
    include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }],
  });
  if (!p) return;
  emitToAcademy(classroomId, 'estate:patch', {
    plots: [plotView(p, null)],
    activity: activity || null,
  });
}

// GET / — the academy layout + balances + OWNED plots and landmark deeds only.
// At v5 scale (~50k plots) the client derives unowned plots locally from
// `layout.cells` + `layout.districtGeo`; shipping every row would be megabytes.
router.get('/', async (req, res) => {
  try {
    const classroomId = req.params.classroomId;
    const { Op } = require('sequelize');
    const [properties, me] = await Promise.all([
      Property.findAll({
        where: {
          classroomId,
          [Op.or]: [{ ownerId: { [Op.ne]: null } }, { tier: 'Landmark' }],
        },
        include: [{ model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] }],
        order: [['gridY', 'ASC'], ['gridX', 'ASC']],
      }),
      User.findByPk(req.user.id, { attributes: ['capletCoins'] }),
    ]);

    res.json({
      capletCoins: me?.capletCoins ?? 0,
      styles: HOUSE_STYLES,
      colors: HOUSE_COLORS,
      layout: getCityPlan().infra,
      properties: properties.map((p) => plotView(p, req.user.id)),
    });
  } catch (e) {
    console.error('Get academy estate error:', e.message || e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Resolve a plot row by grid coordinates (the client's only stable address —
// unowned plots never travel over the API).
function plotCoords(req) {
  const gridX = Number(req.body?.gridX);
  const gridY = Number(req.body?.gridY);
  if (!Number.isInteger(gridX) || !Number.isInteger(gridY)) return null;
  return { gridX, gridY };
}

// POST /buy {gridX, gridY} — claim an unowned plot from the bank at market value.
router.post('/buy', async (req, res) => {
  const classroomId = req.params.classroomId;
  const coords = plotCoords(req);
  if (!coords) return res.status(400).json({ message: 'gridX and gridY are required.' });
  try {
    const result = await sequelize.transaction(async (t) => {
      let property = await Property.findOne({
        where: { classroomId, gridX: coords.gridX, gridY: coords.gridY },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      // Ordinary plots aren't pre-seeded (there are ~50k) — materialise the row
      // from the deterministic plan the first time someone buys it.
      if (!property) {
        const spec = getPlotAt(coords.gridX, coords.gridY);
        if (!spec) throw Object.assign(new Error('There is no buyable plot here.'), { status: 404 });
        property = await Property.create({
          classroomId,
          name: spec.name,
          neighborhood: spec.neighborhood,
          tier: spec.tier,
          gridX: spec.gridX,
          gridY: spec.gridY,
          price: spec.price,
          marketValue: spec.price,
        }, { transaction: t });
      }
      if (property.ownerId) throw Object.assign(new Error('That property is already owned.'), { status: 409 });

      const price = property.marketValue;
      const user = await User.findByPk(req.user.id, { transaction: t, lock: t.LOCK.UPDATE });
      if (user.capletCoins < price) {
        throw Object.assign(new Error('Not enough Caplet Coins. Complete more lessons to earn coins!'), { status: 400 });
      }

      user.capletCoins -= price;
      property.ownerId = user.id;
      property.purchasePrice = price;
      property.lastRentAt = new Date();
      await user.save({ transaction: t });
      await property.save({ transaction: t });
      await PropertyTransaction.create({
        classroomId, propertyId: property.id, actorId: user.id, kind: 'bank_buy', amount: price,
      }, { transaction: t });

      return { capletCoins: user.capletCoins, propertyId: property.id, price, name: property.name };
    });

    await broadcastPlot(classroomId, result.propertyId, { kind: 'bank_buy', actor: actorName(req.user), name: result.name, amount: result.price });
    res.json({ capletCoins: result.capletCoins, propertyId: result.propertyId, owned: true });
  } catch (e) {
    const status = e.status || 500;
    console.error('Buy academy property error:', e.message || e);
    res.status(status).json({ message: e.message || 'Purchase failed' });
  }
});

// POST /sell {gridX, gridY} — sell an owned plot back to the bank for a partial refund.
router.post('/sell', async (req, res) => {
  const classroomId = req.params.classroomId;
  const coords = plotCoords(req);
  if (!coords) return res.status(400).json({ message: 'gridX and gridY are required.' });
  try {
    const result = await sequelize.transaction(async (t) => {
      const property = await Property.findOne({
        where: { classroomId, gridX: coords.gridX, gridY: coords.gridY },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!property) throw Object.assign(new Error('Property not found'), { status: 404 });
      if (property.ownerId !== req.user.id) throw Object.assign(new Error('You do not own this property.'), { status: 403 });

      const refund = Math.floor(property.marketValue * SELL_REFUND);
      const user = await User.findByPk(req.user.id, { transaction: t, lock: t.LOCK.UPDATE });
      user.capletCoins += refund;
      property.ownerId = null;
      property.purchasePrice = null;
      property.lastRentAt = null;
      property.forSale = false;
      property.askingPrice = null;
      property.houseStyle = DEFAULT_STYLE;
      property.houseColor = DEFAULT_COLOR;
      await user.save({ transaction: t });
      await property.save({ transaction: t });
      await PropertyTransaction.create({
        classroomId, propertyId: property.id, actorId: user.id, kind: 'bank_sell', amount: refund,
      }, { transaction: t });

      return { capletCoins: user.capletCoins, refund, propertyId: property.id, name: property.name };
    });

    await broadcastPlot(classroomId, result.propertyId, { kind: 'bank_sell', actor: actorName(req.user), name: result.name, amount: result.refund });
    res.json({ capletCoins: result.capletCoins, refund: result.refund, propertyId: result.propertyId, owned: false });
  } catch (e) {
    const status = e.status || 500;
    console.error('Sell academy property error:', e.message || e);
    res.status(status).json({ message: e.message || 'Sell failed' });
  }
});

// PUT /customize {gridX, gridY, houseStyle?, houseColor?} — owner styling.
router.put('/customize', async (req, res) => {
  const classroomId = req.params.classroomId;
  const coords = plotCoords(req);
  if (!coords) return res.status(400).json({ message: 'gridX and gridY are required.' });
  try {
    const property = await Property.findOne({ where: { classroomId, gridX: coords.gridX, gridY: coords.gridY } });
    if (!property) return res.status(404).json({ message: 'Property not found' });
    if (property.ownerId !== req.user.id) return res.status(403).json({ message: 'You do not own this property.' });

    const style = req.body?.houseStyle;
    const color = req.body?.houseColor;
    if (style && !HOUSE_STYLES.includes(style)) return res.status(400).json({ message: 'Invalid house style.' });
    if (color && !HOUSE_COLORS.includes(color)) return res.status(400).json({ message: 'Invalid house colour.' });

    if (style) property.houseStyle = style;
    if (color) property.houseColor = color;
    await property.save();

    await broadcastPlot(classroomId, property.id, null);
    res.json({ houseStyle: property.houseStyle, houseColor: property.houseColor });
  } catch (e) {
    console.error('Customize academy property error:', e.message || e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

function actorName(user) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || 'A learner';
}

module.exports = router;
