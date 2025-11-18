const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { FinancialState, CheckIn, FinancialPlan, User } = require('../models');
const { generateFinancialPlan } = require('../services/aiService');

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
  body('monthlyExpenses').optional().isObject(),
  body('monthlyIncome').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { majorEvents, monthlyExpenses, goalsUpdate, notes, monthlyIncome } = req.body;

    // Create check-in record
    const checkIn = await CheckIn.create({
      userId: req.user.id,
      majorEvents: majorEvents || [],
      monthlyExpenses: monthlyExpenses || {},
      goalsUpdate: goalsUpdate || [],
      notes: notes || ''
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

    // Update financial state
    if (monthlyExpenses) {
      state.monthlyExpenses = totalExpenses;
    }
    if (monthlyIncome) {
      state.monthlyIncome = parseFloat(monthlyIncome) || 0;
    }

    // Update goals if provided
    if (goalsUpdate && goalsUpdate.length > 0) {
      state.goals = goalsUpdate;
    }

    // Calculate savings rate
    if (state.monthlyIncome > 0) {
      state.savingsRate = ((state.monthlyIncome - state.monthlyExpenses) / state.monthlyIncome) * 100;
    }

    await state.save();

    // Get previous plan for comparison
    const previousPlan = await FinancialPlan.findOne({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    // Generate new plan using AI
    const newPlan = await generateFinancialPlan({
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
        majorEvents: majorEvents || [],
        monthlyExpenses: monthlyExpenses || {},
        goalUpdate: goalsUpdate || [],
        notes: notes || ''
      },
      previousPlan: previousPlan ? {
        budgetAllocation: previousPlan.budgetAllocation,
        savingsStrategy: previousPlan.savingsStrategy,
        debtStrategy: previousPlan.debtStrategy,
        goalTimelines: previousPlan.goalTimelines
      } : null
    });

    // Save new plan
    const plan = await FinancialPlan.create({
      userId: req.user.id,
      checkInId: checkIn.id,
      budgetAllocation: newPlan.budgetAllocation,
      savingsStrategy: newPlan.savingsStrategy,
      debtStrategy: newPlan.debtStrategy,
      goalTimelines: newPlan.goalTimelines,
      actionItems: newPlan.actionItems,
      insights: newPlan.insights
    });

    res.json({
      message: 'Check-in submitted successfully',
      checkIn: {
        id: checkIn.id,
        date: checkIn.createdAt
      },
      plan: {
        budgetAllocation: plan.budgetAllocation,
        savingsStrategy: plan.savingsStrategy,
        debtStrategy: plan.debtStrategy,
        goalTimelines: plan.goalTimelines,
        actionItems: plan.actionItems,
        insights: plan.insights
      }
    });
  } catch (error) {
    console.error('Submit check-in error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

