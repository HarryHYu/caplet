const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { FinancialState, CheckIn, FinancialPlan, User, UserProgress, Summary } = require('../models');
const { generateFinancialPlan, updateSummary } = require('../services/aiService');

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
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get financial state
router.get('/state', authenticateToken, async (req, res) => {
  try {
    let state = await FinancialState.findOne({
      where: { userId: req.user.id }
    });

    if (!state) {
      // Create initial state
      state = await FinancialState.create({
        userId: req.user.id,
        netWorth: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        savingsRate: 0,
        accounts: [],
        debts: [],
        goals: []
      });
    }

    res.json({
      netWorth: parseFloat(state.netWorth),
      monthlyIncome: parseFloat(state.monthlyIncome),
      monthlyExpenses: parseFloat(state.monthlyExpenses),
      savingsRate: parseFloat(state.savingsRate),
      accounts: state.accounts || [],
      debts: state.debts || [],
      goals: state.goals || []
    });
  } catch (error) {
    console.error('Get financial state error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current plan
router.get('/plan', authenticateToken, async (req, res) => {
  try {
    const plan = await FinancialPlan.findOne({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    if (!plan) {
      return res.json({
        budgetAllocation: {},
        savingsStrategy: {},
        debtStrategy: {},
        goalTimelines: [],
        actionItems: [],
        insights: []
      });
    }

    res.json({
      budgetAllocation: plan.budgetAllocation || {},
      savingsStrategy: plan.savingsStrategy || {},
      debtStrategy: plan.debtStrategy || {},
      goalTimelines: plan.goalTimelines || [],
      actionItems: plan.actionItems || [],
      insights: plan.insights || []
    });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get check-in history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const checkIns = await CheckIn.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    res.json(checkIns.map(checkIn => ({
      id: checkIn.id,
      date: checkIn.createdAt,
      majorEvents: checkIn.majorEvents || [],
      monthlyExpenses: checkIn.monthlyExpenses || {},
      goalsUpdate: checkIn.goalsUpdate || [],
      notes: checkIn.notes
    })));
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Submit check-in
router.post('/checkin', authenticateToken, [
  body('message').notEmpty().withMessage('Message is required'),
  body('monthlyExpenses').optional().isObject(),
  body('monthlyIncome').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    return !isNaN(parseFloat(value));
  }).withMessage('Monthly income must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { message, monthlyIncome, monthlyExpenses, isMonthlyCheckIn } = req.body;

    // Create check-in record
    const checkIn = await CheckIn.create({
      userId: req.user.id,
      majorEvents: [],
      monthlyExpenses: monthlyExpenses || {},
      goalsUpdate: [],
      notes: message || ''
    });

    // Get or create financial state
    let state = await FinancialState.findOne({
      where: { userId: req.user.id }
    });

    if (!state) {
      state = await FinancialState.create({
        userId: req.user.id
      });
    }

    // Calculate total monthly expenses
    const totalExpenses = Object.values(monthlyExpenses || {}).reduce(
      (sum, val) => sum + (parseFloat(val) || 0), 0
    );

    // Update monthly income if provided
    if (monthlyIncome) {
      state.monthlyIncome = parseFloat(monthlyIncome);
    }

    // Update financial state
    if (monthlyExpenses && totalExpenses > 0) {
      state.monthlyExpenses = totalExpenses;
    }

    // Calculate savings rate
    if (state.monthlyIncome > 0) {
      state.savingsRate = ((state.monthlyIncome - (state.monthlyExpenses || 0)) / state.monthlyIncome) * 100;
    }

    await state.save();

    // Get or create summary
    let summary = await Summary.findOne({
      where: { userId: req.user.id }
    });

    if (!summary) {
      summary = await Summary.create({
        userId: req.user.id,
        content: ''
      });
    }

    // Update summary with new check-in information
    const updatedSummary = await updateSummary({
      currentSummary: summary.content || '',
      newCheckIn: {
        message: message || '',
        monthlyIncome: monthlyIncome || null,
        monthlyExpenses: monthlyExpenses || {}
      },
      financialState: {
        monthlyIncome: parseFloat(state.monthlyIncome),
        monthlyExpenses: parseFloat(state.monthlyExpenses),
        savingsRate: parseFloat(state.savingsRate),
        accounts: state.accounts || [],
        debts: state.debts || [],
        goals: state.goals || []
      }
    });

    // Save updated summary
    summary.content = updatedSummary;
    await summary.save();

    // Get previous plan for comparison
    const previousPlan = await FinancialPlan.findOne({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    // Generate response using AI (can be a plan, answer, or both)
    const aiResponse = await generateFinancialPlan({
      userId: req.user.id,
      state: {
        monthlyIncome: parseFloat(state.monthlyIncome),
        monthlyExpenses: parseFloat(state.monthlyExpenses),
        savingsRate: parseFloat(state.savingsRate),
        accounts: state.accounts || [],
        debts: state.debts || [],
        goals: state.goals || []
      },
      checkIn: {
        message: message || '',
        monthlyIncome: monthlyIncome || null,
        monthlyExpenses: monthlyExpenses || {},
        isMonthlyCheckIn: isMonthlyCheckIn || false
      },
      summary: updatedSummary, // Pass the summary instead of all check-ins
      previousPlan: previousPlan ? {
        budgetAllocation: previousPlan.budgetAllocation,
        savingsStrategy: previousPlan.savingsStrategy,
        debtStrategy: previousPlan.debtStrategy,
        goalTimelines: previousPlan.goalTimelines
      } : null
    });

    // Save plan if it was generated (for monthly check-ins or plan requests)
    let plan = null;
    if (aiResponse.shouldUpdatePlan) {
      plan = await FinancialPlan.create({
        userId: req.user.id,
        checkInId: checkIn.id,
        budgetAllocation: aiResponse.budgetAllocation || {},
        savingsStrategy: aiResponse.savingsStrategy || {},
        debtStrategy: aiResponse.debtStrategy || {},
        goalTimelines: aiResponse.goalTimelines || [],
        actionItems: aiResponse.actionItems || [],
        insights: aiResponse.insights || []
      });
    }

    res.json({
      message: 'Check-in submitted successfully',
      checkIn: {
        id: checkIn.id,
        date: checkIn.createdAt
      },
      response: aiResponse.response || aiResponse.insights?.[0] || 'Check-in processed',
      plan: plan ? {
        budgetAllocation: plan.budgetAllocation,
        savingsStrategy: plan.savingsStrategy,
        debtStrategy: plan.debtStrategy,
        goalTimelines: plan.goalTimelines,
        actionItems: plan.actionItems,
        insights: plan.insights
      } : null
    });
  } catch (error) {
    console.error('Submit check-in error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get summary
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await Summary.findOne({
      where: { userId: req.user.id }
    });

    res.json({
      content: summary?.content || ''
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/delete-all-data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete all financial data
    await FinancialState.destroy({ where: { userId } });
    await CheckIn.destroy({ where: { userId } });
    await FinancialPlan.destroy({ where: { userId } });
    await Summary.destroy({ where: { userId } });
    await UserProgress.destroy({ where: { userId } });

    res.json({ message: 'All data deleted successfully' });
  } catch (error) {
    console.error('Delete all data error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

