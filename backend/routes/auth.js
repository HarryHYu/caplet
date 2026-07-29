const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const { Op, fn, col, where } = require('sequelize');
const User = require('../models/User');
const { JWT_SECRET, requireAuth } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');
const { sendPasswordResetEmail } = require('../services/passwordResetDelivery');

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign({ userId: user.id, tokenVersion: Number(user.tokenVersion || 0) }, JWT_SECRET, { expiresIn: '90d' });
};
const hashResetToken = (token) => crypto.createHash('sha256').update(String(token || '')).digest('hex');
const resetRequestLimiter = createRateLimiter({ scope: 'password_reset_request', windowMs: 15 * 60 * 1000, max: 5 });
const resetSubmitLimiter = createRateLimiter({ scope: 'password_reset_submit', windowMs: 15 * 60 * 1000, max: 12 });
const genericResetMessage = 'If an account can use that email, a password reset link will be sent shortly.';

const normalizeGoogleNames = (payload = {}) => {
  const fallbackName = typeof payload.name === 'string' ? payload.name.trim() : '';
  const splitName = fallbackName ? fallbackName.split(/\s+/) : [];

  const firstName = (payload.given_name || splitName[0] || 'Google').slice(0, 50);
  const lastName = (payload.family_name || splitName.slice(1).join(' ') || 'User').slice(0, 50);

  return { firstName, lastName };
};

const normalizeEmailInput = (email = '') => String(email).trim().toLowerCase();

const splitEmail = (normalizedEmail) => {
  const [local, domain] = normalizedEmail.split('@');
  return {
    local,
    domain: domain?.toLowerCase()
  };
};

const isGmailDomain = (domain) => domain === 'gmail.com' || domain === 'googlemail.com';

const toCanonicalEmail = (normalizedEmail) => {
  const { local, domain } = splitEmail(normalizedEmail);
  if (!local || !domain) return normalizedEmail;

  // Gmail addresses ignore dots and "+" subaddressing in the local part.
  if (isGmailDomain(domain)) {
    const baseLocal = local.split('+')[0];
    const compactLocal = baseLocal.replace(/\./g, '');
    return `${compactLocal}@gmail.com`;
  }

  return normalizedEmail;
};

const normalizeEmailForStorage = (email) => toCanonicalEmail(normalizeEmailInput(email));

const findUserByEmailVariants = async (email) => {
  const normalizedEmail = normalizeEmailInput(email);
  if (!normalizedEmail.includes('@')) return null;

  const exactUser = await User.findOne({
    where: where(fn('LOWER', col('email')), normalizedEmail)
  });
  if (exactUser) {
    return exactUser;
  }

  const { domain } = splitEmail(normalizedEmail);
  if (!isGmailDomain(domain)) return null;

  const canonicalEmail = toCanonicalEmail(normalizedEmail);
  const gmailUsers = await User.findAll({
    where: {
      [Op.or]: [
        where(fn('LOWER', col('email')), { [Op.like]: '%@gmail.com' }),
        where(fn('LOWER', col('email')), { [Op.like]: '%@googlemail.com' })
      ]
    }
  });

  return gmailUsers.find((candidate) => {
    const candidateCanonical = toCanonicalEmail(normalizeEmailInput(candidate.email));
    return candidateCanonical === canonicalEmail;
  }) || null;
};

// Register (email + password)
router.post('/register', [
  body('email').isEmail().normalizeEmail({
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false
  }),
  body('password').isLength({ min: 8 }).withMessage('Use at least 8 characters.'),
  body('firstName').trim().isLength({ min: 1, max: 50 }),
  body('lastName').trim().isLength({ min: 1, max: 50 }),
  body('dateOfBirth').optional({ values: 'falsy' }).isISO8601().withMessage('Enter a valid date of birth')
    .custom((value) => new Date(`${value}T00:00:00Z`) <= new Date()).withMessage('Date of birth cannot be in the future')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, dateOfBirth } = req.body;
    const normalizedEmail = normalizeEmailInput(email);
    const storageEmail = normalizeEmailForStorage(email);

    const existingUser = await findUserByEmailVariants(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Role is NOT accepted from the request body — every new account is
    // a student. Elevation to instructor / admin happens through
    // /api/admin/promote, never through self-service signup.
    const user = await User.create({
      email: storageEmail,
      password,
      firstName,
      lastName,
      dateOfBirth,
      role: 'student',
      passwordLoginEnabled: true,
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login (email + password) — same account as Google when email matches
router.post('/login', [
  body('email').isEmail().normalizeEmail({
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false
  }),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const normalizedEmail = normalizeEmailInput(email);

    const user = await findUserByEmailVariants(normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login with Google ID token
router.post('/google', [
  body('idToken').notEmpty().withMessage('Google ID token is required')
], async (req, res) => {
  try {
    if (!GOOGLE_CLIENT_ID || !googleClient) {
      return res.status(500).json({ message: 'Google sign-in is not configured' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { idToken } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ message: 'Google account email is not verified' });
    }

    const email = normalizeEmailInput(payload.email);
    const storageEmail = normalizeEmailForStorage(payload.email);
    let user = await findUserByEmailVariants(email);

    if (!user) {
      const { firstName, lastName } = normalizeGoogleNames(payload);
      user = await User.create({
        email: storageEmail,
        password: crypto.randomBytes(32).toString('hex'),
        firstName,
        lastName,
        isEmailVerified: true,
        profilePicture: payload.picture || null,
        role: 'student',
        passwordLoginEnabled: false,
      });
    } else {
      const updates = {};
      if (!user.isEmailVerified) {
        updates.isEmailVerified = true;
      }
      if (payload.picture && !user.profilePicture) {
        updates.profilePicture = payload.picture;
      }
      if (Object.keys(updates).length) {
        await user.update(updates);
      }
    }

    const token = generateToken(user);

    res.json({
      message: 'Google login successful',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ message: 'Google authentication failed' });
  }
});

router.post('/change-password', requireAuth, [
  body('newPassword').isLength({ min: 8 }).withMessage('Use at least 8 characters.'),
  body('confirmPassword').custom((value, { req }) => value === req.body.newPassword).withMessage('Passwords do not match.'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Check the password fields and try again.',
        validation: Object.fromEntries(errors.array().map((error) => [error.path, error.msg])),
      });
    }
    if (req.user.passwordLoginEnabled !== false) {
      if (!String(req.body.currentPassword || '')) {
        return res.status(400).json({ message: 'Enter your current password.', validation: { currentPassword: 'Enter your current password.' } });
      }
      if (!(await req.user.validatePassword(req.body.currentPassword))) {
        return res.status(400).json({ message: 'Your current password is incorrect.', validation: { currentPassword: 'Your current password is incorrect.' } });
      }
    } else {
      return res.status(409).json({
        message: 'Use the password setup email so Caplet can verify your Google account first.',
        code: 'password_setup_required',
      });
    }

    const { PasswordResetToken } = require('../models');
    const now = new Date();
    await req.user.update({
      password: req.body.newPassword,
      passwordLoginEnabled: true,
      tokenVersion: Number(req.user.tokenVersion || 0) + 1,
    });
    await PasswordResetToken.update({ usedAt: now }, { where: { userId: req.user.id, usedAt: null } });
    return res.json({
      message: 'Password changed. Other signed-in sessions have been ended.',
      token: generateToken(req.user),
    });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Your password could not be changed.' });
  }
});

router.post('/forgot-password', resetRequestLimiter, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const email = normalizeEmailInput(req.body?.email);
  try {
    const user = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? await findUserByEmailVariants(email) : null;
    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = hashResetToken(token);
    if (user) {
      const { PasswordResetToken } = require('../models');
      const now = new Date();
      await PasswordResetToken.update({ usedAt: now }, { where: { userId: user.id, usedAt: null } });
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await PasswordResetToken.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        requestedFromHash: crypto.createHash('sha256').update(String(req.ip || 'unknown')).digest('hex'),
      });
      const frontendURL = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      await sendPasswordResetEmail({
        to: user.email,
        url: `${frontendURL}/reset-password?token=${encodeURIComponent(token)}`,
        expiresAt,
      }).catch((deliveryError) => {
        console.error('Password reset delivery error:', deliveryError.message);
      });
    } else {
      // Keep the unknown-account path doing comparable local cryptographic work.
      crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hashResetToken(token)));
    }
  } catch (error) {
    console.error('Password reset request error:', error);
  }
  return res.status(202).json({ message: genericResetMessage });
});

router.post('/reset-password', resetSubmitLimiter, [
  body('newPassword').isLength({ min: 8 }).withMessage('Use at least 8 characters.'),
  body('confirmPassword').custom((value, { req }) => value === req.body.newPassword).withMessage('Passwords do not match.'),
], async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Check the password fields and try again.',
        validation: Object.fromEntries(errors.array().map((error) => [error.path, error.msg])),
      });
    }
    const rawToken = String(req.body?.token || '');
    if (!/^[A-Za-z0-9_-]{40,200}$/.test(rawToken)) {
      return res.status(400).json({ message: 'This reset link is invalid or expired.' });
    }
    const { PasswordResetToken, sequelize } = require('../models');
    const record = await PasswordResetToken.findOne({
      where: { tokenHash: hashResetToken(rawToken), usedAt: null, expiresAt: { [Op.gt]: new Date() } },
    });
    if (!record) return res.status(400).json({ message: 'This reset link is invalid or expired.' });

    await sequelize.transaction(async (transaction) => {
      const [claimed] = await PasswordResetToken.update(
        { usedAt: new Date() },
        { where: { id: record.id, usedAt: null }, transaction },
      );
      if (claimed !== 1) {
        const error = new Error('This reset link is invalid or expired.');
        error.status = 400;
        throw error;
      }
      const user = await User.findByPk(record.userId, { transaction });
      if (!user) {
        const error = new Error('This reset link is invalid or expired.');
        error.status = 400;
        throw error;
      }
      await user.update({
        password: req.body.newPassword,
        passwordLoginEnabled: true,
        tokenVersion: Number(user.tokenVersion || 0) + 1,
      }, { transaction });
      await PasswordResetToken.update(
        { usedAt: new Date() },
        { where: { userId: user.id, usedAt: null }, transaction },
      );
    });
    return res.json({ message: 'Password reset. You can now sign in.' });
  } catch (error) {
    if ((error.status || 500) >= 500) console.error('Password reset error:', error);
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'Your password could not be reset.' });
  }
});

// Get current user
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user.toJSON() });
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;
