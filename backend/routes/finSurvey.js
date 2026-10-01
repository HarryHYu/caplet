const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, FinSurveyResponse } = require('../models');
const {
  normalizeEmailInput,
  normalizeEmailForStorage,
  findUserByEmailVariants,
} = require('../utils/emailIdentity');

const router = express.Router();

/**
 * Financial-literacy survey (temporary, hidden pages — /fin-survey and
 * /fin-survey/results on the frontend). Deliberately ungated both ways:
 * anyone with the link can respond, anyone with the other link can read the
 * aggregates. The results endpoint therefore masks respondent emails; full
 * addresses stay in the database only.
 *
 * Signing up is part of the survey: if the respondent's email has no Caplet
 * account and they chose a password, we create a student account for them —
 * same identity rules as /api/auth/register. One response per email;
 * resubmitting replaces the earlier answers.
 */

const maskEmail = (email) => {
  const [local, domain] = String(email).split('@');
  if (!domain) return '***';
  const head = local.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
};

router.post('/', [
  body('name').trim().isLength({ min: 1, max: 120 }).withMessage('Tell us your name.'),
  body('email').isEmail().withMessage('Enter a valid email.').normalizeEmail({
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false,
  }),
  body('password').optional({ values: 'falsy' }).isLength({ min: 8 }).withMessage('Password needs at least 8 characters.'),
  body('school').optional({ values: 'falsy' }).trim().isLength({ max: 160 }),
  body('answers').isObject().withMessage('Answers missing.'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { name, email, password, school, answers } = req.body;
    if (JSON.stringify(answers).length > 20000) {
      return res.status(400).json({ message: 'Answers are too long.' });
    }

    const normalizedEmail = normalizeEmailInput(email);
    const storageEmail = normalizeEmailForStorage(email);

    // The signup half: create a student account unless one already exists.
    let accountCreated = false;
    let accountExisted = false;
    const existingUser = await findUserByEmailVariants(normalizedEmail);
    if (existingUser) {
      accountExisted = true;
    } else if (password) {
      const parts = String(name).trim().split(/\s+/);
      const firstName = parts[0].slice(0, 50);
      const lastName = (parts.slice(1).join(' ') || '—').slice(0, 50);
      try {
        await User.create({
          email: storageEmail,
          password,
          firstName,
          lastName,
          role: 'student',
          passwordLoginEnabled: true,
        });
        accountCreated = true;
      } catch (createError) {
        if (createError?.name === 'SequelizeUniqueConstraintError') {
          accountExisted = true; // raced another signup; fine
        } else {
          throw createError;
        }
      }
    } else {
      return res.status(400).json({ message: 'Choose a password so we can set up your Caplet account.' });
    }

    // One response per email — a resubmit replaces the old answers.
    const payload = {
      name: String(name).trim(),
      email: storageEmail,
      school: school ? String(school).trim() : null,
      answers,
    };
    const existing = await FinSurveyResponse.findOne({ where: { email: storageEmail } });
    if (existing) {
      await existing.update(payload);
    } else {
      await FinSurveyResponse.create({ ...payload, accountCreated });
    }

    return res.status(201).json({ ok: true, accountCreated, accountExisted, updated: !!existing });
  } catch (error) {
    console.error('Fin-survey submit error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Ungated by design (hidden URL). Emails are masked here; the raw addresses
// never leave the database through this endpoint.
router.get('/results', async (req, res) => {
  try {
    const rows = await FinSurveyResponse.findAll({ order: [['createdAt', 'DESC']] });
    return res.json({
      total: rows.length,
      accountsCreated: rows.filter((r) => r.accountCreated).length,
      responses: rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: maskEmail(r.email),
        school: r.school,
        answers: r.answers,
        accountCreated: r.accountCreated,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('Fin-survey results error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
