const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * CAPLET AI SERVICE
 *
 * CRITICAL: Caplet is a financial LITERACY and EDUCATION platform — NOT a financial advisory service.
 * The AI must NEVER give financial advice, product recommendations, or tell users what they "should" do.
 * It educates, explains concepts, and helps users understand their own situation.
 * All financial data extracted is for educational personalisation only.
 */

const SYSTEM_PROMPT = `You are Caplet's AI financial literacy assistant. You help Australians learn about personal finance through conversation. You are an educational tool only — you do not provide financial advice, and you must never recommend specific financial products, investments, or strategies.

## Tone for Beginners
Always assume the user may be completely new to personal finance. Explain all financial concepts in plain language before using any jargon. If you use a financial term, briefly define it in parentheses.

## Australian Context
Reference Australian-specific financial concepts and institutions:
- ATO (Australian Taxation Office) — Australia's tax authority
- Superannuation — Australia's retirement savings system (not 401k)
- HECS/HELP debt — Australian student loan system
- Medicare Levy — mandatory health insurance contribution
- Franking credits — tax credits on company dividends
- CGT (Capital Gains Tax) discount — 50% discount on long-term asset gains
- Centrelink — Australian government welfare/benefits system

## Edge Case Handling

**If income is zero or user says they're unemployed:**
Acknowledge their situation with genuine empathy. Don't ask for more income data. Instead, focus on:
- Budgeting basics with fixed expenses
- Centrelink entitlements as an educational topic to explore
- Passive income or skill-building concepts
- Emergency fund strategies on any budget

**If debts exceed income:**
Focus on explaining debt management concepts educationally (avalanche method: paying highest-rate debt first vs snowball method: paying smallest debt first). Do NOT prescribe which strategy they "should" use. Suggest they work with a licensed financial adviser for their specific situation.

**If user provides no financial data:**
Guide them gently with questions rather than demanding numbers. Example: "No worries if you haven't got exact figures. Do you have a rough sense of your monthly take-home pay?" Respect their privacy — they don't have to share numbers.

**If user asks for specific investment advice:**
"Remember: I can explain how [concept] works, but for personalised financial advice suited to your situation, you should speak with a licensed financial adviser."

## Response Style
- Keep responses concise (under 200 words unless explaining a complex concept)
- Use simple language; avoid jargon where possible
- When doing calculations, show the working so users learn the method, not just the result
- End responses with one follow-up question to keep the conversation moving

## Financial Data Extraction
When extracting financial data from the conversation:
- Treat zero values as valid (not skipped or defaulted)
- Handle missing/undefined fields gracefully — don't force users to provide data
- All extracted data is for educational personalisation only
- Never use extracted data to make assumptions about what users "should" do

## Response Format (JSON)
Your response must be valid JSON with this structure:
{
  "response": "Your conversational response to the user",
  "extractedFinancialData": {
    "monthlyIncome": null or number,
    "expenses": { category: amount, ... } or {},
    "accounts": [ { name: string, balance: number }, ... ] or [],
    "debts": [ { name: string, amount: number }, ... ] or [],
    "goals": [ { name: string, target: number }, ... ] or []
  },
  "budgetAllocation": {},
  "savingsStrategy": {},
  "debtStrategy": {},
  "goalTimelines": [],
  "actionItems": [],
  "insights": [],
  "shouldUpdatePlan": false,
  "summary": null
}

Remember: You are an educational tool. Never position yourself as a financial advisor.`;

/**
 * Generate financial plan and AI response
 * Returns JSON with conversation response and extracted financial data
 *
 * @param {Object} params
 * @param {number} params.userId - User ID
 * @param {Object} params.state - Current financial state
 * @param {Object} params.checkIn - New check-in message and data
 * @param {string} params.summary - Current financial summary
 * @param {Object} params.previousPlan - Previous plan for context
 * @returns {Promise<Object>} AI response with extracted data
 */
async function generateFinancialPlan(params) {
  const { userId, state, checkIn, summary, previousPlan } = params;

  try {
    // Build context message for the AI
    const contextMessage = buildContextMessage(state, checkIn, summary, previousPlan);

    const response = await callAI(contextMessage);

    // Parse the response - it should be valid JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', response);
      // Fallback: wrap response in basic structure
      parsedResponse = {
        response: response,
        extractedFinancialData: {
          monthlyIncome: null,
          expenses: {},
          accounts: [],
          debts: [],
          goals: []
        },
        budgetAllocation: {},
        savingsStrategy: {},
        debtStrategy: {},
        goalTimelines: [],
        actionItems: [],
        insights: [],
        shouldUpdatePlan: false,
        summary: null
      };
    }

    return parsedResponse;
  } catch (error) {
    console.error('Error generating financial plan:', error);
    return {
      response: "I encountered an error processing your check-in. Please try again.",
      extractedFinancialData: {
        monthlyIncome: null,
        expenses: {},
        accounts: [],
        debts: [],
        goals: []
      },
      budgetAllocation: {},
      savingsStrategy: {},
      debtStrategy: {},
      goalTimelines: [],
      actionItems: [],
      insights: [],
      shouldUpdatePlan: false,
      summary: null
    };
  }
}

/**
 * Call the OpenAI API with fallback to GPT-4-turbo then GPT-3.5-turbo
 *
 * @param {string} message - The user message/context
 * @returns {Promise<string>} AI response
 */
async function callAI(message) {
  const models = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
  let lastError;

  for (const model of models) {
    try {
      console.log(`[AI Service] Attempting to call ${model}...`);

      const response = await client.messages.create({
        model: model,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: message
          }
        ]
      });

      if (model !== 'gpt-4') {
        console.log(`[AI Service] Using fallback model: ${model}`);
      }

      return response.content[0].text;
    } catch (error) {
      lastError = error;
      console.error(`[AI Service] Error calling ${model}:`, error.message);
    }
  }

  throw new Error(`All AI models failed. Last error: ${lastError?.message}`);
}

/**
 * Build the context message for the AI based on state and check-in
 *
 * @param {Object} state - Current financial state
 * @param {Object} checkIn - New check-in data
 * @param {string} summary - Financial summary
 * @param {Object} previousPlan - Previous plan
 * @returns {string} Context message for AI
 */
function buildContextMessage(state, checkIn, summary, previousPlan) {
  let message = `User Check-in Message: "${checkIn.message}"`;

  // Add current financial state
  message += `\n\nCurrent Financial State:
- Monthly Income: ${state.monthlyIncome || 'Not provided'}
- Monthly Expenses: ${state.monthlyExpenses || 'Not provided'}
- Savings Rate: ${state.savingsRate ? state.savingsRate.toFixed(1) : '0'}%`;

  if (state.accounts && state.accounts.length > 0) {
    message += `\nAccounts: ${JSON.stringify(state.accounts)}`;
  }

  if (state.debts && state.debts.length > 0) {
    message += `\nDebts: ${JSON.stringify(state.debts)}`;
  }

  if (state.goals && state.goals.length > 0) {
    message += `\nGoals: ${JSON.stringify(state.goals)}`;
  }

  // Add manual input if provided
  if (checkIn.monthlyIncome !== null && checkIn.monthlyIncome !== undefined) {
    message += `\n\nUser provided monthly income: ${checkIn.monthlyIncome}`;
  }

  if (checkIn.monthlyExpenses && Object.keys(checkIn.monthlyExpenses).length > 0) {
    message += `\nUser provided monthly expenses breakdown: ${JSON.stringify(checkIn.monthlyExpenses)}`;
  }

  // Add summary context if exists
  if (summary) {
    message += `\n\nFinancial Summary: ${summary}`;
  }

  // Add instructions for response format
  message += `\n\nRespond ONLY with valid JSON matching this schema:
{
  "response": "Your educational response to the user",
  "extractedFinancialData": {
    "monthlyIncome": null or number,
    "expenses": { "category": amount, ... } or {},
    "accounts": [ { "name": string, "balance": number }, ... ] or [],
    "debts": [ { "name": string, "amount": number }, ... ] or [],
    "goals": [ { "name": string, "target": number }, ... ] or []
  },
  "budgetAllocation": {},
  "savingsStrategy": {},
  "debtStrategy": {},
  "goalTimelines": [],
  "actionItems": [],
  "insights": [],
  "shouldUpdatePlan": false,
  "summary": null
}`;

  return message;
}

/**
 * Update the financial summary with new check-in information
 *
 * @param {Object} params
 * @param {string} params.currentSummary - Current summary
 * @param {Object} params.newCheckIn - New check-in data
 * @param {Object} params.financialState - Current financial state
 * @returns {Promise<string>} Updated summary
 */
async function updateSummary(params) {
  const { currentSummary, newCheckIn, financialState } = params;

  try {
    const summaryPrompt = `You are updating a financial literacy student's profile summary. Keep it brief (2-3 sentences) and focus on their learning journey, not giving advice.

Current Summary: ${currentSummary || 'New user'}

New Check-in:
- Message: ${newCheckIn.message}
- Monthly Income: ${newCheckIn.monthlyIncome || 'Not provided'}
- Monthly Expenses: ${JSON.stringify(newCheckIn.monthlyExpenses)}

Current Financial State:
- Monthly Income: ${financialState.monthlyIncome}
- Monthly Expenses: ${financialState.monthlyExpenses}
- Savings Rate: ${financialState.savingsRate.toFixed(1)}%

Write an updated 2-3 sentence summary of their financial situation and learning progress. Focus on educational insights, not advice.`;

    const response = await callAI(summaryPrompt);
    return response;
  } catch (error) {
    console.error('Error updating summary:', error);
    return currentSummary || 'Summary pending';
  }
}

module.exports = {
  generateFinancialPlan,
  updateSummary,
  SYSTEM_PROMPT
};
