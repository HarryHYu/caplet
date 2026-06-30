const express = require('express');
const { body, validationResult } = require('express-validator');
const UserFinancialProfile = require('../models/UserFinancialProfile');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// Shape returned when a user has no profile row yet. GET never writes, so a new
// user always sees this default rather than triggering a create-on-read.
const EMPTY_PROFILE = {
  annualIncome: null,
  savingsBalance: null,
  superBalance: null,
  monthlyExpenses: null,
  currency: 'AUD',
  debts: [],
  goals: []
};

function serialize(profile) {
  if (!profile) return { ...EMPTY_PROFILE };
  return {
    id: profile.id,
    annualIncome: profile.annualIncome,
    savingsBalance: profile.savingsBalance,
    superBalance: profile.superBalance,
    monthlyExpenses: profile.monthlyExpenses,
    currency: profile.currency,
    debts: profile.debts, // getter returns a parsed array
    goals: profile.goals,
    updatedAt: profile.updatedAt
  };
}

// GET current user's financial profile (or an empty default shape).
router.get('/', async (req, res) => {
  try {
    const profile = await UserFinancialProfile.findOne({ where: { userId: req.user.id } });
    res.json({ financialProfile: serialize(profile) });
  } catch (error) {
    console.error('Get financial profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Postgres INT4 ceiling — values above this store fine on SQLite (dev) but throw
// on Postgres (prod), so reject them up front for a clean 400 instead of a 500.
const INT4_MAX = 2147483647;

// Allow whole non-negative dollar amounts (number or numeric string), or null/''
// to clear the field. Rejects negatives, decimals, booleans, arrays, objects,
// whitespace, and values above the INT4 ceiling.
const moneyRule = (field) =>
  body(field)
    .optional({ values: 'null' })
    .customSanitizer((v) => (typeof v === 'string' && v.trim() === '' ? null : v))
    .custom((v) => {
      if (v === null) return true;
      if (typeof v !== 'number' && typeof v !== 'string') return false;
      if (typeof v === 'string' && !/^\d+$/.test(v.trim())) return false;
      const n = Number(v);
      return Number.isInteger(n) && n >= 0 && n <= INT4_MAX;
    })
    .withMessage(`${field} must be a whole number between 0 and ${INT4_MAX}`);

// PUT (upsert) the current user's financial profile. Partial update — only
// fields present in the body are changed.
router.put('/', [
  moneyRule('annualIncome'),
  moneyRule('savingsBalance'),
  moneyRule('superBalance'),
  moneyRule('monthlyExpenses'),
  body('currency').optional().isString().isLength({ min: 1, max: 8 }),
  body('debts').optional().isArray(),
  body('debts.*.label').optional().isString().trim().isLength({ max: 80 }),
  body('debts.*.balance').optional({ values: 'null' }).isFloat({ min: 0 }),
  body('debts.*.rate').optional({ values: 'null' }).isFloat({ min: 0, max: 100 }),
  body('goals').optional().isArray(),
  body('goals.*.label').optional().isString().trim().isLength({ max: 80 }),
  body('goals.*.target').optional({ values: 'null' }).isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const [profile] = await UserFinancialProfile.findOrCreate({
      where: { userId: req.user.id },
      defaults: { userId: req.user.id }
    });

    const b = req.body;
    const updates = {};
    ['annualIncome', 'savingsBalance', 'superBalance', 'monthlyExpenses'].forEach((f) => {
      if (b[f] !== undefined) {
        updates[f] = b[f] === null || b[f] === '' ? null : Number(b[f]);
      }
    });
    if (b.currency !== undefined) updates.currency = b.currency;
    // Normalize to canonical objects, dropping null/non-object entries so a
    // crafted payload (the per-element rules are all optional) can't store a
    // null that would later crash readers.
    if (b.debts !== undefined) {
      updates.debts = (Array.isArray(b.debts) ? b.debts : [])
        .filter((d) => d && typeof d === 'object')
        .map((d) => ({ label: String(d.label || ''), balance: Number(d.balance) || 0, rate: Number(d.rate) || 0 }));
    }
    if (b.goals !== undefined) {
      updates.goals = (Array.isArray(b.goals) ? b.goals : [])
        .filter((g) => g && typeof g === 'object')
        .map((g) => ({ label: String(g.label || ''), target: Number(g.target) || 0 }));
    }

    await profile.update(updates);

    res.json({ message: 'Financial profile updated', financialProfile: serialize(profile) });
  } catch (error) {
    console.error('Update financial profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
