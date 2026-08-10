/**
 * Shared auth middleware.
 *
 * Replaces the per-route authenticateToken copies that used to live in
 * 9 different route files (each with its own `JWT_SECRET || 'your-secret-key-change-in-production'`
 * footgun fallback).
 *
 * - In production, the process exits at startup if JWT_SECRET is missing.
 * - In dev, a deterministic dev-only secret is used so local work isn't blocked,
 *   but the secret name itself screams "not for production" if it ever leaks.
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = (() => {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim()) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ JWT_SECRET is not set. Refusing to start in production.');
    process.exit(1);
  }
  return 'dev-only-jwt-secret-do-not-use-in-production';
})();

/**
 * Verifies a regular user JWT (issued by /api/auth/{login,register,google}).
 * On success, attaches the User model instance to req.user and calls next().
 * On failure, returns 401.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authorization = req.header('Authorization') || '';
    const token = /^Bearer\s+(\S+)$/i.exec(authorization)?.[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded?.userId || decoded.typ === 'refresh') {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (Number(decoded.tokenVersion || 0) !== Number(user.tokenVersion || 0)) {
      return res.status(401).json({ message: 'This session is no longer valid. Sign in again.' });
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * Same as requireAuth, but also requires the user to have role === 'admin'.
 */
const requireAdmin = async (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
};

module.exports = {
  JWT_SECRET,
  requireAuth,
  requireAdmin,
};
