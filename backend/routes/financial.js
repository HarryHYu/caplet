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
  body('message').notEmpty().trim().withMessage('Message is required'),
  body('monthlyExpenses').optional().isObject().custom((value) => {
    if (value === null || value === undefined) return true;
    if (typeof value !== 'object') return false;
    return true;
  }).withMessage('Monthly expenses must be an object'),
  body('monthlyIncome').optional().custom((value) => {
    if (value === null || value === undefined || value === '') return true;
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  }).withMessage('Monthly income must be a valid number')
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

    // Financial data will be extracted by AI in generateFinancialPlan
    // Prepare manual input if provided (takes priority)
    const manualIncome = monthlyIncome ? parseFloat(monthlyIncome) : null;
    const manualExpenses = (monthlyExpenses && Object.keys(monthlyExpenses).length > 0) ? monthlyExpenses : null;

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

    // Get previous plan for comparison
    const previousPlan = await FinancialPlan.findOne({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    // Generate response using AI - AI will extract data AND generate response in one call
    const aiResponse = await generateFinancialPlan({
      userId: req.user.id,
      state: {
        monthlyIncome: parseFloat(state.monthlyIncome) || 0,
        monthlyExpenses: parseFloat(state.monthlyExpenses) || 0,
        savingsRate: parseFloat(state.savingsRate) || 0,
        accounts: state.accounts || [],
        debts: state.debts || [],
        goals: state.goals || []
      },
      checkIn: {
        message: message || '',
        monthlyIncome: manualIncome, // Pass manual input if provided
        monthlyExpenses: manualExpenses, // Pass manual input if provided
        isMonthlyCheckIn: isMonthlyCheckIn || false
      },
      summary: summary.content || '', // Pass current summary
      previousPlan: previousPlan ? {
        budgetAllocation: previousPlan.budgetAllocation,
        savingsStrategy: previousPlan.savingsStrategy,
        debtStrategy: previousPlan.debtStrategy,
        goalTimelines: previousPlan.goalTimelines
      } : null
    });

    // Now update financial state with AI-extracted data (if provided)
    // Priority: Manual input > AI extracted > Budget allocation > Keep existing
    const extractedData = aiResponse.extractedFinancialData;
    
    // Update income: manual takes priority, then AI extracted, then keep existing
    if (manualIncome !== null) {
      state.monthlyIncome = manualIncome;
    } else if (extractedData?.monthlyIncome !== null && extractedData?.monthlyIncome !== undefined) {
      state.monthlyIncome = parseFloat(extractedData.monthlyIncome);
    }

    // Update expenses: manual takes priority, then AI extracted, then budget allocation, then keep existing
    if (manualExpenses) {
      const totalExpenses = Object.values(manualExpenses).reduce(
        (sum, val) => sum + (parseFloat(val) || 0), 0
      );
      state.monthlyExpenses = totalExpenses;
      console.log('✅ Expenses updated from manual input:', totalExpenses);
    } else if (extractedData?.expenses && Object.keys(extractedData.expenses).length > 0) {
      // Filter out null values and calculate total
      const validExpenses = Object.entries(extractedData.expenses).filter(([_, val]) => val !== null && val !== undefined);
      const expensesObj = Object.fromEntries(validExpenses.map(([key, val]) => [key, parseFloat(val)]));
      const totalExpenses = Object.values(expensesObj).reduce((sum, val) => sum + (val || 0), 0);
      if (totalExpenses > 0) {
        state.monthlyExpenses = totalExpenses;
        console.log('✅ Expenses updated from extracted data:', totalExpenses);
      }
    } else if (aiResponse.budgetAllocation && Object.keys(aiResponse.budgetAllocation).length > 0) {
      // Fallback: Calculate expenses from budget allocation (exclude savings)
      const budgetExpenses = { ...aiResponse.budgetAllocation };
      delete budgetExpenses.savings; // Don't count savings as an expense
      console.log('📊 Budget allocation (excluding savings):', JSON.stringify(budgetExpenses));
      const totalExpenses = Object.values(budgetExpenses).reduce((sum, val) => {
        // Handle string values with $, commas, etc.
        let cleanVal = val;
        if (typeof val === 'string') {
          cleanVal = val.replace(/[$,]/g, '').trim();
        }
        const numVal = parseFloat(cleanVal) || 0;
        console.log(`  - Value: ${val} (type: ${typeof val}, cleaned: ${cleanVal}, parsed: ${numVal})`);
        return sum + numVal;
      }, 0);
      console.log('💰 Total expenses calculated from budget:', totalExpenses);
      if (totalExpenses > 0) {
        state.monthlyExpenses = totalExpenses;
        console.log('✅ Expenses updated from budget allocation:', totalExpenses);
      } else {
        console.log('⚠️ Total expenses is 0, not updating');
      }
    } else {
      console.log('⚠️ No expenses data found - manual:', !!manualExpenses, 'extracted:', !!extractedData?.expenses, 'budget:', !!aiResponse.budgetAllocation);
    }

    // Update accounts (merge, avoid duplicates) - only if extractedData exists
    if (extractedData?.accounts && extractedData.accounts.length > 0) {
      const existingAccounts = state.accounts || [];
      const newAccounts = extractedData.accounts.filter(newAcc => 
        !existingAccounts.some(existing => existing.name === newAcc.name)
      );
      state.accounts = [...existingAccounts, ...newAccounts];
    }

    // Update debts (merge, avoid duplicates) - only if extractedData exists
    if (extractedData?.debts && extractedData.debts.length > 0) {
      const existingDebts = state.debts || [];
      const newDebts = extractedData.debts.filter(newDebt => 
        !existingDebts.some(existing => existing.name === newDebt.name)
      );
      state.debts = [...existingDebts, ...newDebts];
    }

    // Update goals (merge, avoid duplicates) - only if extractedData exists
    if (extractedData?.goals && extractedData.goals.length > 0) {
      const existingGoals = state.goals || [];
      const newGoals = extractedData.goals.filter(newGoal => 
        !existingGoals.some(existing => existing.name === newGoal.name)
      );
      state.goals = [...existingGoals, ...newGoals];
    }

    // Calculate savings rate
    if (state.monthlyIncome > 0) {
      state.savingsRate = ((state.monthlyIncome - (state.monthlyExpenses || 0)) / state.monthlyIncome) * 100;
    }

    console.log('💾 Saving financial state:', {
      monthlyIncome: state.monthlyIncome,
      monthlyExpenses: state.monthlyExpenses,
      savingsRate: state.savingsRate
    });
    await state.save();
    console.log('✅ Financial state saved successfully');

    // Update summary with new check-in information
    const finalIncome = state.monthlyIncome;
    const finalExpensesObj = manualExpenses || (extractedData?.expenses && Object.keys(extractedData.expenses).length > 0 
      ? Object.fromEntries(
          Object.entries(extractedData.expenses)
            .filter(([_, val]) => val !== null && val !== undefined)
            .map(([key, val]) => [key, parseFloat(val)])
        )
      : {});

    const updatedSummary = await updateSummary({
      currentSummary: summary.content || '',
      newCheckIn: {
        message: message || '',
        monthlyIncome: finalIncome || null,
        monthlyExpenses: finalExpensesObj || {}
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
            summary: aiResponse.summary || null,
            detailedBreakdown: aiResponse.detailedBreakdown || null,
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

    // Delete only personal/user-specific data (NOT courses or lessons)
    await FinancialState.destroy({ where: { userId } });
    await CheckIn.destroy({ where: { userId } });
    await FinancialPlan.destroy({ where: { userId } });
    await Summary.destroy({ where: { userId } });
    await UserProgress.destroy({ where: { userId } });

    res.json({ message: 'All personal data deleted successfully. Courses and lessons are preserved.' });
  } catch (error) {
    console.error('Delete all data error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

