const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
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

const findUserByEmailVariants = async (email) => {
  let user = await User.findOne({ where: { email } });
  if (!user) {
    const [local, domain] = email.split('@');
    if (domain && domain.toLowerCase() === 'gmail.com') {
      const baseLocal = local.split('+')[0];
      const altEmail = `${baseLocal.replace(/\./g, '')}@gmail.com`;
      user = await User.findOne({ where: { email: altEmail } });
    }
  }

  return user;
};

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail({
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_remove_subaddress: false,
    yahoo_remove_subaddress: false
  }),
  body('password').isLength({ min: 6 }),
  body('firstName').trim().isLength({ min: 1, max: 50 }),
  body('lastName').trim().isLength({ min: 1, max: 50 }),
  body('role').optional().isIn(['student', 'instructor'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, dateOfBirth, role } = req.body;

    // Check if user already exists
    const existingUser = await findUserByEmailVariants(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create new user
    const userRole = role === 'instructor' ? 'instructor' : 'student';

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      role: userRole
    });

    const token = generateToken(user.id);

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

// Login
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

    // Find user (support gmail dot/subaddress variants)
    const user = await findUserByEmailVariants(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Validate password
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

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

    const email = payload.email.toLowerCase();
    let user = await findUserByEmailVariants(email);

    if (!user) {
      const { firstName, lastName } = normalizeGoogleNames(payload);
      user = await User.create({
        email,
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
