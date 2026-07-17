const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getStudyMomentum, parseTimezoneOffset } = require('../services/studyMomentumService');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const timezoneOffset = parseTimezoneOffset(req.query.timezoneOffset ?? 0);
    const momentum = await getStudyMomentum(req.user.id, { timezoneOffset });
    res.json({ momentum });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    console.error('Get study momentum error:', error);
    return res.status(500).json({ message: 'Could not load study momentum' });
  }
});

module.exports = router;
