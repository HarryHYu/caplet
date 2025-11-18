const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const generateFinancialPlan = async ({ userId, state, checkIn, previousPlan }) => {
  try {
    // Build structured prompt
    const prompt = buildFinancialPlanPrompt(state, checkIn, previousPlan);

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a professional financial advisor specializing in Australian personal finance. 
          You create personalized financial plans based on user data. Always respond with valid JSON matching the exact structure provided.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const planData = JSON.parse(response.choices[0].message.content);

    // Validate and structure the response
    return {
      budgetAllocation: planData.budgetAllocation || {},
      savingsStrategy: planData.savingsStrategy || {},
      debtStrategy: planData.debtStrategy || {},
      goalTimelines: planData.goalTimelines || [],
      actionItems: planData.actionItems || [],
      insights: planData.insights || []
    };
  } catch (error) {
    console.error('AI plan generation error:', error);
    
    // Fallback to basic plan if AI fails
    return generateFallbackPlan(state, checkIn);
  }
};

const buildFinancialPlanPrompt = (state, checkIn, previousPlan) => {
  let prompt = `Create a comprehensive financial plan for an Australian user.

USER FINANCIAL STATE:
- Monthly Income: $${state.monthlyIncome.toLocaleString()}
- Monthly Expenses: $${state.monthlyExpenses.toLocaleString()}
- Savings Rate: ${state.savingsRate.toFixed(2)}%
- Accounts: ${JSON.stringify(state.accounts)}
- Debts: ${JSON.stringify(state.debts)}
- Goals: ${JSON.stringify(state.goals)}

RECENT CHECK-IN:
- Major Events: ${JSON.stringify(checkIn.majorEvents)}
- Monthly Expenses Breakdown: ${JSON.stringify(checkIn.monthlyExpenses)}
- Goals Update: ${JSON.stringify(checkIn.goalUpdate)}
- Notes: ${checkIn.notes || 'None'}

`;

  if (previousPlan) {
    prompt += `PREVIOUS PLAN (for comparison):
- Budget Allocation: ${JSON.stringify(previousPlan.budgetAllocation)}
- Savings Strategy: ${JSON.stringify(previousPlan.savingsStrategy)}
- Debt Strategy: ${JSON.stringify(previousPlan.debtStrategy)}
- Goal Timelines: ${JSON.stringify(previousPlan.goalTimelines)}

`;
  }

  prompt += `OUTPUT FORMAT (MUST BE VALID JSON):
{
  "budgetAllocation": {
    "rent": <monthly amount>,
    "food": <monthly amount>,
    "utilities": <monthly amount>,
    "transport": <monthly amount>,
    "entertainment": <monthly amount>,
    "savings": <monthly amount>,
    "other": <monthly amount>
  },
  "savingsStrategy": {
    "recommendedMonthlySavings": <amount>,
    "emergencyFundTarget": <amount>,
    "emergencyFundMonths": <number of months expenses>,
    "investmentRecommendation": <percentage or amount>
  },
  "debtStrategy": {
    "totalDebt": <amount>,
    "recommendedMonthlyPayment": <amount>,
    "payoffTimeline": "<estimated months>",
    "priorityDebt": "<debt name or description>"
  },
  "goalTimelines": [
    {
      "name": "<goal name>",
      "targetDate": "<YYYY-MM-DD>",
      "description": "<how to achieve it>",
      "monthlyContribution": <amount>
    }
  ],
  "actionItems": [
    "<prioritized action item 1>",
    "<prioritized action item 2>",
    "<prioritized action item 3>"
  ],
  "insights": [
    "<insight or recommendation 1>",
    "<insight or recommendation 2>",
    "<insight or recommendation 3>"
  ]
}

RULES:
1. All amounts should be realistic based on Australian costs and the user's income
2. Budget allocation should total to monthly income (or close to it)
3. Use Australian financial context (superannuation, tax, etc.)
4. Be specific with numbers and timelines
5. Prioritize action items by urgency/importance
6. Provide actionable, practical advice
7. If this is an update, note what changed from the previous plan

Generate the plan now:`;

  return prompt;
};

const generateFallbackPlan = (state, checkIn) => {
  // Basic fallback plan if AI fails
  const monthlyIncome = state.monthlyIncome || 0;
  const monthlyExpenses = state.monthlyExpenses || 0;
  const available = monthlyIncome - monthlyExpenses;
  const positiveAvailable = Math.max(0, available);

  return {
    budgetAllocation: {
      rent: Math.round(monthlyIncome * 0.30),
      food: Math.round(monthlyIncome * 0.15),
      utilities: Math.round(monthlyIncome * 0.05),
      transport: Math.round(monthlyIncome * 0.10),
      entertainment: Math.round(monthlyIncome * 0.05),
      savings: Math.round(positiveAvailable * 0.5),
      other: Math.round(positiveAvailable * 0.5)
    },
    savingsStrategy: {
      recommendedMonthlySavings: Math.round(positiveAvailable * 0.3),
      emergencyFundTarget: Math.round(monthlyExpenses * 6),
      emergencyFundMonths: 6,
      investmentRecommendation: '10%'
    },
    debtStrategy: {
      totalDebt: state.debts?.reduce((sum, d) => sum + (parseFloat(d.balance) || 0), 0) || 0,
      recommendedMonthlyPayment: Math.round(positiveAvailable * 0.2),
      payoffTimeline: '12-24 months',
      priorityDebt: state.debts?.[0]?.name || 'None'
    },
    goalTimelines: (state.goals || []).map(goal => ({
      name: goal.name,
      targetDate: goal.deadline || '2025-12-31',
      description: `Save $${Math.max(0, Math.round(((parseFloat(goal.target) || 0) - (parseFloat(goal.current) || 0)) / 12))} per month`,
      monthlyContribution: Math.max(0, Math.round(((parseFloat(goal.target) || 0) - (parseFloat(goal.current) || 0)) / 12))
    })),
    actionItems: [
      'Review your monthly expenses and identify areas to reduce spending',
      'Set up automatic transfers to savings account',
      'Build emergency fund of 3-6 months expenses'
    ],
    insights: [
      'Consider tracking expenses more closely to identify spending patterns',
      'Aim to save at least 20% of your income for long-term goals',
      'Review your financial plan monthly and adjust as needed'
    ]
  };
};

module.exports = {
  generateFinancialPlan
};

