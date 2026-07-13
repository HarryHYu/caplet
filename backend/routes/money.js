const express = require('express');
const { createRateLimiter } = require('../middleware/rateLimit');
const { getIndicatorHistory, listIndicatorSummaries } = require('../services/moneyData');
const { resolveEconomicsEdition } = require('../services/curriculumEdition');

const router = express.Router();
const publicLimiter = createRateLimiter({ scope: 'money_public_data', windowMs: 60000, max: 60 });

router.get('/indicators', publicLimiter, async (_req, res) => {
  try {
    const indicators = await listIndicatorSummaries();
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    return res.json({ schemaVersion: 1, generatedAt: new Date().toISOString(), indicators });
  } catch (error) {
    console.error('Money indicators error:', error.message);
    return res.status(503).json({ message: 'Money indicators are temporarily unavailable.' });
  }
});

router.get('/indicators/:key', publicLimiter, async (req, res) => {
  const rawLimit = req.query.limit === undefined ? 24 : Number(req.query.limit);
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 120) {
    return res.status(400).json({ message: 'limit must be an integer from 1 to 120.' });
  }
  try {
    const result = await getIndicatorHistory(req.params.key, { limit: rawLimit });
    if (!result) return res.status(404).json({ message: 'Indicator not found.' });
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    return res.json({ schemaVersion: 1, generatedAt: new Date().toISOString(), ...result });
  } catch (error) {
    console.error('Money indicator history error:', error.message);
    return res.status(503).json({ message: 'Money indicator history is temporarily unavailable.' });
  }
});

router.get('/curriculum/resolve', publicLimiter, async (req, res) => {
  const year = Number(req.query.hscCohortYear);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ message: 'hscCohortYear must be an integer from 2000 to 2100.' });
  }
  try {
    const edition = await resolveEconomicsEdition(year);
    if (!edition) return res.status(404).json({ message: 'No Economics syllabus edition matches that HSC cohort.' });
    return res.json({ schemaVersion: 1, hscCohortYear: year, edition });
  } catch (error) {
    console.error('Money curriculum resolution error:', error.message);
    return res.status(503).json({ message: 'Curriculum resolution is temporarily unavailable.' });
  }
});

module.exports = router;
