const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  archiveSubjectPack,
  createPackOutcome,
  createPackQuestion,
  createBusinessStudiesPack,
  createSubjectPackVersion,
  findAccessiblePack,
  importSubjectPack,
  listSubjectPacks,
  publishSubjectPack,
  reopenReviewItem,
  resolveReviewItem,
  serializePack,
  syncBusinessStudiesTemplate,
  transitionPackQuestion,
  updatePackOutcome,
  updatePackQuestion,
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
    const canManage = req.user.role === 'admin' || String(pack.createdBy) === String(req.user.id);
    const subjectPack = pack.key === 'NSW-BUSINESS-STUDIES-2010-V1' && canManage
      ? await syncBusinessStudiesTemplate(pack, req.user.id)
      : await serializePack(pack);
    res.json({ subjectPack });
  } catch (error) {
    next(error);
  }
});

router.post('/:packId/outcomes', requireSubjectAuthor, async (req, res, next) => {
  try {
    res.status(201).json(await createPackOutcome(req.params.packId, req.user, req.body || {}));
  } catch (error) {
    next(error);
  }
});

router.patch('/:packId/outcomes/:outcomeId', requireSubjectAuthor, async (req, res, next) => {
  try {
    res.json(await updatePackOutcome(req.params.packId, req.params.outcomeId, req.user, req.body || {}));
  } catch (error) {
    next(error);
  }
});

router.post('/:packId/questions', requireSubjectAuthor, async (req, res, next) => {
  try {
    res.status(201).json(await createPackQuestion(req.params.packId, req.user, req.body || {}));
  } catch (error) {
    next(error);
  }
});

router.put('/:packId/questions/:questionId', requireSubjectAuthor, async (req, res, next) => {
  try {
    res.json(await updatePackQuestion(req.params.packId, req.params.questionId, req.user, req.body || {}));
  } catch (error) {
    next(error);
  }
});

router.post('/:packId/questions/:questionId/lifecycle', requireSubjectAuthor, async (req, res, next) => {
  try {
    res.json(await transitionPackQuestion(req.params.packId, req.params.questionId, req.user, req.body || {}));
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

router.post('/:packId/versions', requireSubjectAuthor, async (req, res, next) => {
  try {
    res.status(201).json({ subjectPack: await createSubjectPackVersion(req.params.packId, req.user) });
  } catch (error) {
    next(error);
  }
});

router.post('/:packId/archive', requireSubjectAuthor, async (req, res, next) => {
  try {
    res.json({ subjectPack: await archiveSubjectPack(req.params.packId, req.user) });
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
    ...(error.validation ? { validation: error.validation } : {}),
  });
});

module.exports = router;
