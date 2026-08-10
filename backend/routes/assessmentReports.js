const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { reserveAIQuota } = require('../middleware/aiQuota');
const { createRateLimiter } = require('../middleware/rateLimit');
const { requireAIConsent } = require('../services/privacyConsent');
const { recordAIInteractionSafely } = require('../services/aiHistory');
const { parseAssessmentReport } = require('../services/assessmentReportParser');
const { publicAIError } = require('../utils/aiErrors');

const router = express.Router();
const MAX_TEXT = 100000;
const reportQuota = reserveAIQuota({ scope: 'assessment-report-import', units: 5 });
const reportLimiter = createRateLimiter({
  scope: 'assessment_report_import',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many report imports. Try again later.',
});

router.post('/parse', requireAuth, reportLimiter, requireAIConsent, reportQuota, async (req, res) => {
  const text = String(req.body?.text || '');
  const fileName = String(req.body?.fileName || '').slice(0, 240);
  const subjects = Array.isArray(req.body?.subjects) ? req.body.subjects : [];
  if (!text.trim()) return res.status(400).json({ message: 'The report has no readable text.' });
  if (text.length > MAX_TEXT) return res.status(413).json({ message: 'The extracted report text is too large.' });
  if (!subjects.length || subjects.length > 30) return res.status(400).json({ message: 'Choose your subjects before importing a report.' });

  try {
    const entries = await parseAssessmentReport(text, subjects);
    await recordAIInteractionSafely({
      userId: req.user.id,
      feature: 'assessment_report_import',
      modelVersion: 'gpt-5.4-mini',
      status: 'completed',
      inputSummary: `${fileName || 'School report'} · ${text.length} extracted characters`,
      outputSummary: `${entries.length} assessment results suggested`,
      metadata: { resultCount: entries.length },
    });
    res.json({ entries });
  } catch (error) {
    const publicError = publicAIError(error, 'The report could not be analysed. Try again shortly.');
    console.error(JSON.stringify({
      event: 'assessment_report_import_error',
      requestId: req.requestId || null,
      errorType: error?.name || 'Error',
      status: publicError.status,
    }));
    res.status(publicError.status).json({ message: publicError.message, requestId: req.requestId || null });
  }
});

module.exports = router;
