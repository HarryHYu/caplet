const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const generateFinancialPlan = async ({ userId, state, checkIn, previousPlan }) => {
  try {
    // Check if API key is set
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      throw new Error('OpenAI API key not configured');
    }

    const userMessage = checkIn.message || '';
    if (!userMessage) {
      throw new Error('No message provided in check-in');
    }

    const isQuestion = detectIfQuestion(userMessage);
    const isMonthlyCheckIn = checkIn.isMonthlyCheckIn || detectMonthlyCheckIn(userMessage);

    // Build prompt based on intent
    const prompt = buildPrompt(state, checkIn, previousPlan, isQuestion, isMonthlyCheckIn);

    console.log('Calling OpenAI API...');
    console.log('API Key present:', !!process.env.OPENAI_API_KEY);
    console.log('User message:', userMessage.substring(0, 100));
    
    // Try gpt-4o first (most capable), fallback to gpt-4-turbo, then gpt-3.5-turbo
    const models = ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'];
    let lastError = null;
    
    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
        const response = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'system',
              content: `You are a friendly, professional financial advisor specializing in Australian personal finance. 
              You help users with questions, provide advice, and create financial plans. 
              Be conversational, practical, and use Australian financial context (superannuation, tax, etc.).
              Always respond with valid JSON matching the exact structure provided.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        });

            console.log(`OpenAI API response received from ${model}`);
        const content = response.choices[0].message.content;
        const aiData = JSON.parse(content);

        // Return response with optional plan
        return {
          response: aiData.response || aiData.answer || '',
          shouldUpdatePlan: aiData.shouldUpdatePlan || isMonthlyCheckIn,
          budgetAllocation: aiData.budgetAllocation || {},
          savingsStrategy: aiData.savingsStrategy || {},
          debtStrategy: aiData.debtStrategy || {},
          goalTimelines: aiData.goalTimelines || [],
          actionItems: aiData.actionItems || [],
          insights: aiData.insights || [aiData.response || aiData.answer || '']
        };
      } catch (modelError) {
        console.error(`Error with model ${model}:`, modelError.message);
        lastError = modelError;
        // If it's a model-specific error (not available), try next model
        if (modelError.message?.includes('model') || modelError.message?.includes('not found')) {
          continue;
        }
        // Otherwise, break and throw
        throw modelError;
      }
    }
    
    // If we get here, all models failed
    throw lastError || new Error('All models failed');
  } catch (error) {
    console.error('AI plan generation error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      type: error.type,
      status: error.status,
      stack: error.stack?.substring(0, 500),
      hasApiKey: !!process.env.OPENAI_API_KEY
    });
    
    // More helpful error message
    let errorMessage = 'I encountered an error processing your request.';
    if (error.message?.includes('API key') || error.code === 'invalid_api_key') {
      errorMessage = 'OpenAI API key is invalid or not configured. Please check Railway environment variables.';
    } else if (error.message?.includes('rate limit') || error.code === 'rate_limit_exceeded') {
      errorMessage = 'OpenAI API rate limit reached. Please try again in a moment.';
    } else if (error.message?.includes('insufficient_quota') || error.code === 'insufficient_quota') {
      errorMessage = 'OpenAI API quota exceeded. Please check your OpenAI account billing and add credits.';
    } else if (error.message?.includes('model') || error.code === 'model_not_found') {
      errorMessage = 'The AI model is not available. Please check your OpenAI account has access to GPT models.';
    } else {
      errorMessage = `Error: ${error.message || 'Unknown error occurred'}`;
    }
    
    // Fallback response
    return {
      response: errorMessage,
      shouldUpdatePlan: false,
      budgetAllocation: {},
      savingsStrategy: {},
      debtStrategy: {},
      goalTimelines: [],
      actionItems: [],
      insights: []
    };
  }
};

const detectIfQuestion = (message) => {
  if (!message) return false;
  const questionWords = ['how much', 'can i', 'should i', 'what', 'when', 'why', '?', 'afford'];
  const lowerMessage = message.toLowerCase();
  return questionWords.some(word => lowerMessage.includes(word));
};

const detectMonthlyCheckIn = (message) => {
  if (!message) return false;
  const checkInWords = ['monthly', 'check-in', 'checkin', 'spent', 'expenses', 'this month'];
  const lowerMessage = message.toLowerCase();
  return checkInWords.some(word => lowerMessage.includes(word));
};

const buildPrompt = (state, checkIn, previousPlan, isQuestion, isMonthlyCheckIn) => {
  let prompt = '';

  // User's message/query
  prompt += `USER MESSAGE/QUERY:
"${checkIn.message}"

`;

  // Financial state context
  prompt += `USER'S CURRENT FINANCIAL STATE:
- Monthly Income: $${(state.monthlyIncome || 0).toLocaleString()}
- Monthly Expenses: $${(state.monthlyExpenses || 0).toLocaleString()}
- Savings Rate: ${(state.savingsRate || 0).toFixed(2)}%
- Accounts: ${JSON.stringify(state.accounts || [])}
- Debts: ${JSON.stringify(state.debts || [])}
- Goals: ${JSON.stringify(state.goals || [])}

`;

  // Additional context from check-in
  if (checkIn.monthlyIncome) {
    prompt += `- New Monthly Income Provided: $${parseFloat(checkIn.monthlyIncome).toLocaleString()}\n`;
  }
  if (checkIn.monthlyExpenses && Object.keys(checkIn.monthlyExpenses).length > 0) {
    prompt += `- Monthly Expenses Breakdown: ${JSON.stringify(checkIn.monthlyExpenses)}\n`;
  }

  prompt += '\n';

  // Previous plan context
  if (previousPlan) {
    prompt += `PREVIOUS FINANCIAL PLAN:
- Budget Allocation: ${JSON.stringify(previousPlan.budgetAllocation || {})}
- Savings Strategy: ${JSON.stringify(previousPlan.savingsStrategy || {})}
- Debt Strategy: ${JSON.stringify(previousPlan.debtStrategy || {})}
- Goal Timelines: ${JSON.stringify(previousPlan.goalTimelines || [])}

`;
  }

  // Instructions based on intent
  if (isQuestion) {
    prompt += `INSTRUCTIONS:
This appears to be a question or request for advice. Answer the user's question directly and helpfully.
- Provide a clear, direct answer
- Use their financial data to give specific, personalized advice
- Be conversational and friendly
- If they ask "how much can I spend", calculate based on their income, expenses, and goals
- Use Australian financial context

OUTPUT FORMAT (MUST BE VALID JSON):
{
  "response": "<your direct answer to their question, be specific with numbers and advice>",
  "shouldUpdatePlan": false,
  "actionItems": ["<any immediate actions they should take>"],
  "insights": ["<additional helpful insights>"]
}

Answer their question now:`;
  } else if (isMonthlyCheckIn) {
    prompt += `INSTRUCTIONS:
This is a monthly financial check-in. Generate a comprehensive financial plan update.

OUTPUT FORMAT (MUST BE VALID JSON):
{
  "response": "<brief summary of their financial situation and key recommendations>",
  "shouldUpdatePlan": true,
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
    "emergencyFundMonths": <number>,
    "investmentRecommendation": "<percentage or amount>"
  },
  "debtStrategy": {
    "totalDebt": <amount>,
    "recommendedMonthlyPayment": <amount>,
    "payoffTimeline": "<estimated timeline>",
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

Generate the plan now:`;
  } else {
    // General update or statement
    prompt += `INSTRUCTIONS:
The user is sharing financial information or asking for general advice. Provide helpful guidance and optionally update their plan if significant changes are mentioned.

OUTPUT FORMAT (MUST BE VALID JSON):
{
  "response": "<your helpful response addressing their message, provide advice and insights>",
  "shouldUpdatePlan": <true if significant financial changes mentioned, false otherwise>,
  "actionItems": ["<any immediate actions>"],
  "insights": ["<helpful insights>"],
  "budgetAllocation": <only include if shouldUpdatePlan is true>,
  "savingsStrategy": <only include if shouldUpdatePlan is true>,
  "debtStrategy": <only include if shouldUpdatePlan is true>,
  "goalTimelines": <only include if shouldUpdatePlan is true>
}

Respond helpfully now:`;
  }

  return prompt;
};

module.exports = {
  generateFinancialPlan
};
