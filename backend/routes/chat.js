const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { ChatMessage, User } = require('../models');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
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

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// GET /api/chat/history - Returns last 50 messages for authenticated user
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const messages = await ChatMessage.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'ASC']],
      limit: 50
    });

    res.json({ messages });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/chat/message - Save a message for authenticated user
router.post('/message',
  authenticateToken,
  body('role').isIn(['user', 'assistant']).notEmpty(),
  body('content').notEmpty().trim(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { role, content } = req.body;

      const message = await ChatMessage.create({
        userId: req.user.id,
        role,
        content
      });

      res.status(201).json({ message });
    } catch (error) {
      console.error('Save chat message error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// DELETE /api/chat/history - Delete all chat messages for authenticated user
router.delete('/history', authenticateToken, async (req, res) => {
  try {
    await ChatMessage.destroy({
      where: { userId: req.user.id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete chat history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
