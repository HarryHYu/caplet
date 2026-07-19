const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  createBusinessStudiesPack,
  findAccessiblePack,
  importSubjectPack,
  listSubjectPacks,
  publishSubjectPack,
  reopenReviewItem,
  resolveReviewItem,
  serializePack,
} = require('../services/subjectPackService');

const router = express.Router();
router.use(requireAuth);

function requireSubjectAuthor(req, res, next) {
  if (!['instructor', 'admin'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Teacher access is required to build subject packs.' });
  }
  next();
}

router.get('/', async (req, res, next) => {
  try {
    res.json({ subjectPacks: await listSubjectPacks(req.user) });
  } catch (error) {
    next(error);
  }
});

router.post('/import', requireSubjectAuthor, async (req, res, next) => {
  try {
    const subjectPack = await importSubjectPack(req.user.id, req.body || {});
    res.status(201).json({ subjectPack });
  } catch (error) {
    next(error);
  }
});

router.post('/templates/business-studies-2010', requireSubjectAuthor, async (req, res, next) => {
  try {
    const subjectPack = await createBusinessStudiesPack(req.user.id);
    res.status(201).json({ subjectPack });
  } catch (error) {
    next(error);
  }
});

router.get('/:packId', async (req, res, next) => {
  try {
    const pack = await findAccessiblePack(req.params.packId, req.user);
    res.json({ subjectPack: await serializePack(pack) });
  } catch (error) {
    next(error);
  }
});

router.post('/:packId/review-items/:itemId/resolve', async (req, res, next) => {
  try {
    const subjectPack = await resolveReviewItem(req.params.packId, req.params.itemId, req.user, req.body || {});
    res.json({ subjectPack });
  } catch (error) {
    next(error);
  }
});

router.post('/:packId/review-items/:itemId/reopen', async (req, res, next) => {
  try {
    const subjectPack = await reopenReviewItem(req.params.packId, req.params.itemId, req.user);
    res.json({ subjectPack });
  } catch (error) {
    next(error);
  }
});

router.post('/:packId/publish', async (req, res, next) => {
  try {
    const subjectPack = await publishSubjectPack(req.params.packId, req.user);
    res.json({ subjectPack });
  } catch (error) {
    next(error);
  }
});

router.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if ((error.status || 500) >= 500) console.error('Subject pack error:', error);
  res.status(error.status || 500).json({
    message: error.status ? error.message : 'Could not complete the subject-pack request.',
    ...(error.readiness ? { readiness: error.readiness } : {}),
  });
});

module.exports = router;
