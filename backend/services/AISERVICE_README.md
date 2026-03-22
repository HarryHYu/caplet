# AI Service Documentation

## Quick Start

```javascript
const { generateFinancialPlan, updateSummary } = require('./aiService');

// Generate financial plan from user check-in
const response = await generateFinancialPlan({
  userId: 1,
  state: {
    monthlyIncome: 5000,
    monthlyExpenses: 3000,
    savingsRate: 40,
    accounts: [],
    debts: [],
    goals: []
  },
  checkIn: {
    message: "I got a salary increase this month",
    monthlyIncome: 5500,
    monthlyExpenses: null,
    isMonthlyCheckIn: false
  },
  summary: "Previous summary text",
  previousPlan: null
});

console.log(response.response); // Conversational response
console.log(response.extractedFinancialData); // Extracted data
```

## System Prompt Philosophy

**CRITICAL**: Caplet is educational-only. The AI assistant:
- Explains financial concepts in plain language
- Handles edge cases with empathy
- Never prescribes what users "should" do
- Always directs investment/advice questions to licensed advisers
- Respects user privacy (no forced data sharing)

## Edge Cases Handled

### Zero Income (Unemployed Users)
The AI:
- Acknowledges the situation with empathy
- Focuses on budgeting basics and fixed expenses
- Introduces Centrelink entitlements as a topic
- Doesn't ask for more income data

### Debts > Income
The AI:
- Explains avalanche method (pay highest-rate debt first)
- Explains snowball method (pay smallest debt first)
- Does NOT recommend which strategy to use
- Suggests speaking with a licensed financial adviser

### No Financial Data
The AI:
- Asks questions gently: "Do you have a rough sense...?"
- Respects privacy — users don't have to share
- Continues conversation without forced data entry

### Investment Advice Requests
The AI:
- Uses template: "I can explain how [concept] works..."
- Always includes: "...but for personalised advice, speak with a licensed financial adviser"
- Does NOT recommend specific products or strategies

## Response Format

All AI responses are JSON:

```json
{
  "response": "Your conversational response here",
  "extractedFinancialData": {
    "monthlyIncome": 5500,
    "expenses": {
      "housing": 1500,
      "food": 500
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

**Notes**:
- All fields are optional in extractedFinancialData
- Zero values are valid (not skipped)
- Null values are OK (missing data is graceful)
- Empty objects/arrays indicate no data to extract

## AI Model Fallback

The service tries models in order:
1. `gpt-4` (primary)
2. `gpt-4-turbo` (fallback)
3. `gpt-3.5-turbo` (fallback)

**Console logs** show which model is being used (monitored in Railway):
```
[AI Service] Attempting to call gpt-4...
[AI Service] Using fallback model: gpt-4-turbo
```

## Australian Context

Always mention Australian institutions:
- **ATO** — Australian Taxation Office
- **Superannuation** — retirement savings (not 401k)
- **HECS/HELP** — student loan system
- **Medicare Levy** — health insurance contribution
- **Centrelink** — government welfare/benefits
- **Franking credits** — dividend tax credits
- **CGT** — capital gains tax (50% discount on long-term assets)

## Response Style Guide

### DO
✅ Explain concepts in plain language before jargon
✅ Define financial terms in parentheses when first used
✅ Show working for calculations (teach the method)
✅ Use Australian context and examples
✅ Handle missing data gracefully
✅ Acknowledge difficult situations with empathy
✅ Suggest licensed financial adviser for personalized advice
✅ End responses with one follow-up question

### DON'T
❌ Recommend specific products or investments
❌ Tell users what they "should" do
❌ Demand financial data
❌ Assume users know finance concepts
❌ Use jargon without explaining
❌ Make assumptions about user circumstances
❌ Provide financial advice (only education)
❌ Skip zero values as invalid

## Logging for Monitoring

Key logs to watch in Railway:

```javascript
// Input validation
console.log('📝 Check-in submission:', {
  userId: req.user.id,
  messageLength: message?.length,
  manualIncome,
  manualExpensesProvided: !!manualExpenses
});

// AI service calls
console.log('🤖 Calling AI service for financial plan generation...');
console.log('✅ AI response received successfully');

// Data updates
console.log('✅ Monthly income updated from manual input:', manualIncome);
console.log('✅ Expenses updated from extracted data:', totalExpenses);
console.log('✅ Accounts updated from extracted data:', newAccounts.length, 'new accounts');

// Fallback model usage
console.log(`[AI Service] Using fallback model: ${model}`);
```

## Error Handling

The service is resilient:

**JSON Parse Failure**:
- Logs the raw response for debugging
- Wraps response in safe default structure
- User doesn't see error, can retry

**All Models Failed**:
- Throws error with last error message
- Route catches and returns user-friendly response
- Logs full error for investigation

**Invalid Data**:
- Validates arrays with `Array.isArray()`
- Gracefully skips null/undefined values
- Zero values are preserved as valid

## Testing

### Unit Test Pattern
```javascript
jest.mock('../services/aiService');

const aiService = require('../services/aiService');
aiService.generateFinancialPlan.mockResolvedValue({
  response: "Test response",
  extractedFinancialData: { monthlyIncome: 5000 }
});
```

### Integration Test Pattern
```javascript
const response = await request(app)
  .post('/api/financial/checkin')
  .set('Authorization', 'Bearer token')
  .send({
    message: "I earned $5000 this month",
    monthlyIncome: 5000
  });

expect(response.body.response).toBeDefined();
expect(response.status).toBe(200);
```

## Debugging

Enable detailed logging:
```javascript
// In aiService.js
console.log('🔍 Building context message:', message.substring(0, 100) + '...');
console.log('🔍 AI response (raw):', response);
console.log('🔍 Parsed JSON:', parsedResponse);
```

## Future Enhancements

1. **Token Counting**: Track tokens used per request
2. **User Segmentation**: Detect beginner vs advanced users
3. **Concept Definitions**: Auto-define financial terms
4. **Centrelink Integration**: Link to relevant Centrelink pages
5. **Adviser Referral**: Link to licensed advisers in user's state
6. **Conversation Memory**: Track learning progress across sessions
7. **Feedback Loop**: Learn which explanations help users

---

**Last Updated**: March 2026
**Status**: Production Ready
**Education-Only Disclaimer**: This service provides financial literacy education only, not financial advice.
