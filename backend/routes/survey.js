const express = require('express');
const { body, validationResult } = require('express-validator');
const Survey = require('../models/Survey');

const router = express.Router();

// Submit survey response
router.post('/', [
  body('age').notEmpty().withMessage('Age is required'),
  body('tracksSpending').isIn(['yes', 'no']).withMessage('Invalid value for tracksSpending'),
  body('taughtAtSchool').isIn(['yes', 'no']).withMessage('Invalid value for taughtAtSchool'),
  body('confidence').isInt({ min: 1, max: 10 }).withMessage('Confidence must be between 1 and 10'),
  body('termsConfusing').isIn(['yes', 'no']).withMessage('Invalid value for termsConfusing'),
  body('helpfulExplanations').isArray({ min: 1 }).withMessage('At least one explanation type must be selected')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { age, tracksSpending, taughtAtSchool, confidence, termsConfusing, helpfulExplanations } = req.body;

    const survey = await Survey.create({
      age,
      tracksSpending,
      taughtAtSchool,
      confidence: parseInt(confidence),
      termsConfusing,
      helpfulExplanations
    });

    res.status(201).json({
      message: 'Survey submitted successfully',
      surveyId: survey.id
    });
  } catch (error) {
    console.error('Submit survey error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all survey responses (admin only - optional, for analytics)
router.get('/', async (req, res) => {
  try {
    const surveys = await Survey.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.json({ surveys });
  } catch (error) {
    console.error('Get surveys error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

