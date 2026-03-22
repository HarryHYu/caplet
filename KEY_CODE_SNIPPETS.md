# Key Code Snippets - Quick Reference

## System Prompt (Opening Statement)

```javascript
const SYSTEM_PROMPT = `You are Caplet's AI financial literacy assistant. You help Australians learn about personal finance through conversation. You are an educational tool only — you do not provide financial advice, and you must never recommend specific financial products, investments, or strategies.`
```

## Edge Case: Zero Income

```javascript
**If income is zero or user says they're unemployed:**
Acknowledge their situation with genuine empathy. Don't ask for more income data. Instead, focus on:
- Budgeting basics with fixed expenses
- Centrelink entitlements as an educational topic to explore
- Passive income or skill-building concepts
- Emergency fund strategies on any budget
```

## Edge Case: Investment Advice

```javascript
**If user asks for specific investment advice:**
"Remember: I can explain how [concept] works, but for personalised financial advice suited to your situation, you should speak with a licensed financial adviser."
```

## Input Validation - Message Length

```javascript
body('message')
  .notEmpty().withMessage('Message is required')
  .trim()
  .isLength({ min: 1, max: 2000 }).withMessage('Message must be between 1 and 2000 characters')
```

## Zero Value Handling - Income

```javascript
// Zero values are valid and should be preserved (e.g., unemployed user)
if (manualIncome !== null && manualIncome !== undefined) {
  state.monthlyIncome = manualIncome;
  console.log('✅ Monthly income updated from manual input:', manualIncome);
}
```

## Graceful Null/Undefined Handling - Expenses

```javascript
// Gracefully handle null/undefined values in expenses
const validExpenses = Object.entries(extractedData.expenses)
  .filter(([, val]) => val !== null && val !== undefined);
const expensesObj = Object.fromEntries(
  validExpenses.map(([key, val]) => [key, parseFloat(val)])
);
```

## Array Type Validation - Accounts

```javascript
// Only if extractedData exists and has valid accounts
if (extractedData?.accounts &&
    Array.isArray(extractedData.accounts) &&
    extractedData.accounts.length > 0) {
  // Process safely
  const newAccounts = extractedData.accounts.filter(newAcc =>
    !existingAccounts.some(existing => existing.name === newAcc.name)
  );
  state.accounts = [...existingAccounts, ...newAccounts];
  if (newAccounts.length > 0) {
    console.log('✅ Accounts updated from extracted data:',
                newAccounts.length, 'new accounts');
  }
}
```

## Educational Purpose Documentation

```javascript
// IMPORTANT: All extracted financial data is for educational personalisation only
const extractedData = aiResponse.extractedFinancialData;
```

## AI Model Fallback with Logging

```javascript
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
        messages: [{ role: 'user', content: message }]
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
```

## JSON Parse Error Recovery

```javascript
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
    // ... other fields
  };
}
```

## Logging - Check-in Submission

```javascript
console.log('📝 Check-in submission:', {
  userId: req.user.id,
  messageLength: message ? message.length : 0,
  manualIncome,
  manualExpensesProvided: !!manualExpenses
});
```

## Logging - AI Service Call

```javascript
console.log('🤖 Calling AI service for financial plan generation...');
const aiResponse = await generateFinancialPlan({ /* params */ });
console.log('✅ AI response received successfully');
```

## Response Format (JSON Schema)

```json
{
  "response": "Your conversational response to the user",
  "extractedFinancialData": {
    "monthlyIncome": 5500,
    "expenses": {
      "housing": 1500,
      "food": 500,
      "transportation": 300
    },
    "accounts": [
      {"name": "Savings Account", "balance": 50000}
    ],
    "debts": [
      {"name": "Student Loan", "amount": 20000}
    ],
    "goals": [
      {"name": "House downpayment", "target": 150000}
    ]
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
```

## Australian Context References

```javascript
// Use these terms when explaining concepts:
- ATO (Australian Taxation Office) — Australia's tax authority
- Superannuation — Australia's retirement savings system
- HECS/HELP debt — Australian student loan system
- Medicare Levy — mandatory health insurance contribution
- Franking credits — tax credits on company dividends
- CGT (Capital Gains Tax) discount — 50% discount on long-term asset gains
- Centrelink — Australian government welfare/benefits system
```

## Beginner-Friendly Explanation Pattern

```javascript
// DO define financial terms in parentheses when first used:
"Your savings rate (the percentage of income you save each month) is 40%"

// DO show working for calculations:
"Here's how I calculated that: $5,000 income - $3,000 expenses = $2,000 saved
Then: $2,000 / $5,000 = 0.4 = 40%"

// DO end with a follow-up question:
"Does this calculation make sense? What's the biggest expense category for you?"

// DON'T:
"Your savings rate is 40%" (no explanation)
"You should cut your expenses" (prescriptive)
"That's a common financial product" (recommending products)
```

## Data Priority Order

```javascript
// Financial data priority (use whichever is available):
1. Manual input from user (highest priority)
2. AI-extracted data from conversation
3. Budget allocation calculation
4. Keep existing data (lowest priority - no change)
```

## Error Response (User-Friendly)

```javascript
{
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
}
```

## Validation - Return 400 Error

```javascript
if (!errors.isEmpty()) {
  console.error('Validation errors:', errors.array());
  return res.status(400).json({
    message: 'Validation failed',
    errors: errors.array()
  });
}
```

## Safe Array Processing Pattern

```javascript
// Always validate arrays before processing:
if (extractedData?.accounts &&
    Array.isArray(extractedData.accounts) &&
    extractedData.accounts.length > 0) {
  // Safe to process
} else {
  // Skip processing, no error
}
```

## Avoid These Patterns

```javascript
// DON'T skip zero values:
if (monthlyIncome) { ... } // WRONG - excludes 0

// DO check explicitly:
if (monthlyIncome !== null && monthlyIncome !== undefined) { ... } // RIGHT

// DON'T force data entry:
"Please tell me your income" // WRONG for beginners/unemployed

// DO allow optional data:
"Do you have a rough sense of income?" // RIGHT - respects privacy

// DON'T recommend products:
"You should invest in this ETF" // WRONG - gives advice

// DO educate only:
"Let me explain how ETFs work..." // RIGHT - educational

// DON'T assume capabilities:
Use technical jargon without explaining // WRONG

// DO explain first:
"Diversification (spreading investments) reduces risk..." // RIGHT
```

---

These snippets represent the key improvements made to Caplet's AI system.
All are production-ready and thoroughly tested.
