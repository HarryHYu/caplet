const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const { Op, fn, col, where } = require('sequelize');
const User = require('../models/User');

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

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
        role: 'student'
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

    const token = generateToken(user.id);

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

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;
