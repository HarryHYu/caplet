const express = require('express');
const UserFinancialProfile = require('../models/UserFinancialProfile');
const { requireAuth } = require('../middleware/auth');
const { sequenceDebts, DEFAULT_INDEXATION_RATE } = require('../services/debtEngine');

const router = express.Router();
router.use(requireAuth);

// Parse an optional numeric query param, clamped to [min, max]. Anything
// unparseable falls back to `fallback` — the engine is deterministic and this
// keeps a crafted query string from producing garbage instead of a clean result.
function num(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

// GET the debt sequencing for the current user.
//
// Balances/income come from the saved UserFinancialProfile (the auditable,
// server-persisted source). The projection ASSUMPTIONS are request-time query
// params, because they are scenario inputs rather than stored facts:
//   indexationRate    — assumed annual HELP indexation, as a PERCENT (e.g. 3.2)
//   extraMonthlyAmount — spare $/month the user is deciding how to direct
//   voluntaryAnnual   — assumed voluntary HELP repayment per year ($)
//   incomeGrowthRate  — assumed annual repayment-income growth, as a PERCENT
router.get('/', async (req, res) => {
  try {
    const profile = await UserFinancialProfile.findOne({ where: { userId: req.user.id } });

    const debts = profile ? profile.debts : []; // getter returns a parsed array
    const hecsBalance = profile && profile.hecsBalance ? profile.hecsBalance : 0;
    // "Repayment income" is not gross salary (see debtEngine.js). It is a
    // transient calculation input: callers may pass ?repaymentIncome=... to run a
    // what-if without touching their saved annualIncome. When absent we fall back
    // to the saved annualIncome as a convenience. The tool never writes it back.
    const savedIncome = profile && profile.annualIncome ? profile.annualIncome : 0;
    const hasIncomeParam = req.query.repaymentIncome != null && String(req.query.repaymentIncome).trim() !== '';
    const repaymentIncome = hasIncomeParam ? num(req.query.repaymentIncome, savedIncome, 0, 2147483647) : savedIncome;

    const indexationRate = num(req.query.indexationRate, DEFAULT_INDEXATION_RATE * 100, 0, 20) / 100;
    const extraMonthlyAmount = num(req.query.extraMonthlyAmount, 0, 0, 2147483647);
    const voluntaryAnnual = num(req.query.voluntaryAnnual, 0, 0, 2147483647);
    const incomeGrowthRate = num(req.query.incomeGrowthRate, 0, 0, 100) / 100;

    const hecsProfile = hecsBalance > 0
      ? { balance: hecsBalance, repaymentIncome, indexationRate, voluntaryAnnual, incomeGrowthRate }
      : null;

    const sequence = sequenceDebts({ debts, hecsProfile, extraMonthlyAmount });

    res.json({ sequence });
  } catch (error) {
    console.error('Debt sequencing error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
