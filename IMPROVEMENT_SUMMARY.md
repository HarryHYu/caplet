# AI System Prompt and Edge Case Handling Improvements

## Overview
This document summarizes improvements made to Caplet's AI financial literacy assistant to better serve beginner users. The changes ensure the tool is positioned as educational-only, handles edge cases gracefully, and validates input properly.

**CRITICAL PRINCIPLE**: Caplet is a financial LITERACY and EDUCATION platform — NOT a financial advisory service. The AI must never give financial advice, product recommendations, or tell users what they "should" do with their money.

---

## Step 1 ✅ AI Service Created

### File: `/backend/services/aiService.js` (NEW)

**Purpose**: Central service for all AI interactions with improved system prompt and edge case handling.

**Key Components**:

#### 1. Enhanced System Prompt
The new SYSTEM_PROMPT includes:

- **Positioning Statement**: Clearly identifies Caplet as an educational tool only, not a financial advisor
- **Beginner-Friendly Tone**: Assumes users may be completely new to finance; explains concepts in plain language before jargon
- **Australian Context**: References Australian-specific concepts:
  - ATO (Australian Taxation Office)
  - Superannuation (retirement savings)
  - HECS/HELP debt (student loans)
  - Medicare Levy
  - Franking credits
  - CGT (Capital Gains Tax) discount
  - Centrelink (welfare/benefits)

#### 2. Edge Case Handling (Explicit Instructions to AI)

**Zero/No Income**: Acknowledges situation with empathy; focuses on budgeting basics and Centrelink entitlements rather than demanding income data

**Debts Exceed Income**: Explains debt management concepts educationally (avalanche vs snowball methods) WITHOUT prescribing which users "should" use; suggests licensed financial adviser for personalized advice

**No Financial Data Provided**: Guides users gently with questions; respects privacy; doesn't demand numbers

**Investment Advice Requests**: Uses template response: "Remember: I can explain how [concept] works, but for personalised financial advice suited to your situation, you should speak with a licensed financial adviser."

#### 3. Response Style Guidelines
- Concise (under 200 words unless explaining complex concepts)
- Simple language; avoid jargon
- Show working for calculations (teach the method, not just results)
- End with follow-up question to maintain conversation flow

#### 4. Financial Data Extraction Rules
- Zero values treated as valid (not skipped or defaulted)
- Missing/undefined fields handled gracefully (no forcing data)
- All extracted data marked for educational personalisation only
- Never assume what users "should" do with their data

#### 5. AI Model Fallback
`callAI()` function attempts models in order:
1. gpt-4 (primary)
2. gpt-4-turbo (fallback)
3. gpt-3.5-turbo (fallback)

**Logging**: Console logs when fallback models are used (visible in Railway logs)
```javascript
console.log(`[AI Service] Using fallback model: ${model}`);
```

#### 6. Response Format
AI must return valid JSON with schema:
```json
{
  "response": "conversational response",
  "extractedFinancialData": {
    "monthlyIncome": number or null,
    "expenses": { category: amount },
    "accounts": [{ name, balance }],
    "debts": [{ name, amount }],
    "goals": [{ name, target }]
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

---

## Step 2 ✅ Route Input Validation Enhanced

### File: `/backend/routes/financial.js` (UPDATED)

#### Validation Improvements

**Message Field**:
```javascript
body('message')
  .notEmpty().withMessage('Message is required')
  .trim()
  .isLength({ min: 1, max: 2000 }).withMessage('Message must be between 1 and 2000 characters')
```
- Max 2000 characters to prevent abuse
- Prevents empty messages

**Monthly Income**:
```javascript
// Allow zero as valid value (e.g., unemployed user)
const num = parseFloat(value);
return !isNaN(num) && isFinite(num);
```
- Zero values explicitly allowed as valid

**Monthly Expenses**:
- Validates as object if provided
- Optional (gracefully handles missing data)

#### Response Code Improvements

**400 Error Handling**:
```javascript
if (!errors.isEmpty()) {
  console.error('Validation errors:', errors.array());
  return res.status(400).json({
    message: 'Validation failed',
    errors: errors.array()
  });
}
```
- Helpful error messages with validation details
- Prevents bad requests from reaching AI

#### Enhanced Logging

**Check-in Submission Log**:
```javascript
console.log('📝 Check-in submission:', {
  userId: req.user.id,
  messageLength: message ? message.length : 0,
  manualIncome,
  manualExpensesProvided: !!manualExpenses
});
```

**AI Call Logging**:
```javascript
console.log('🤖 Calling AI service for financial plan generation...');
// ... AI call ...
console.log('✅ AI response received successfully');
```

**Data Update Logging**:
- Income updates logged with source (manual or AI)
- Expense updates logged with source and amount
- Account/debt/goal updates logged with count
- All visible in Railway production logs for monitoring

---

## Step 3 ✅ Financial Data Handling Improved

### File: `/backend/routes/financial.js` (UPDATED)

#### Zero Value Handling

**Income**:
```javascript
// Zero values are valid and should be preserved (e.g., unemployed user)
if (manualIncome !== null && manualIncome !== undefined) {
  state.monthlyIncome = manualIncome;
  console.log('✅ Monthly income updated from manual input:', manualIncome);
}
```
- Zero is treated as valid input
- Explicitly documented with comment

**Expenses**:
```javascript
// Gracefully handle null/undefined values in expenses
const validExpenses = Object.entries(extractedData.expenses)
  .filter(([, val]) => val !== null && val !== undefined);
```
- Skips null/undefined but preserves zero values
- No forced defaults

#### Array Type Safety

**Accounts, Debts, Goals**:
```javascript
if (extractedData?.accounts && Array.isArray(extractedData.accounts) && extractedData.accounts.length > 0) {
  // Process safely
  if (newAccounts.length > 0) {
    console.log('✅ Accounts updated from extracted data:', newAccounts.length, 'new accounts');
  }
}
```
- Validates array type before processing
- Only updates if there's new data to add
- Logs count of updates for monitoring

#### Educational Purpose Documentation

Added explicit comment at data extraction point:
```javascript
// IMPORTANT: All extracted financial data is for educational personalisation only
```

This comment reminds developers that data is for learning personalization, not advisory recommendations.

---

## Step 4 ✅ Error Handling and Fallback

### File: `/backend/services/aiService.js`

#### JSON Parse Fallback
```javascript
try {
  parsedResponse = JSON.parse(response);
} catch (e) {
  console.error('Failed to parse AI response as JSON:', response);
  // Fallback: wrap response in basic structure
  parsedResponse = {
    response: response,
    extractedFinancialData: { ... }
  };
}
```
- Gracefully handles AI response parsing errors
- Provides safe default structure
- Logs the raw response for debugging

#### Error Response Fallback
```javascript
return {
  response: "I encountered an error processing your check-in. Please try again.",
  extractedFinancialData: {
    monthlyIncome: null,
    expenses: {},
    accounts: [],
    debts: [],
    goals: []
  },
  // ... empty plan structure ...
};
```
- User-friendly error message
- Safe default structure prevents crashes
- No data loss (user can retry)

---

## Files Changed Summary

| File | Type | Changes |
|------|------|---------|
| `/backend/services/aiService.js` | **NEW** | Created complete AI service with improved prompt and edge case handling |
| `/backend/routes/financial.js` | **UPDATED** | Added input validation (max 2000 char), improved logging, enhanced financial data handling |

---

## Testing Recommendations

### 1. Edge Case Scenarios

**Test Case: Zero Income User**
- POST /api/financial/checkin with monthlyIncome: 0
- Verify: Zero is stored, not skipped
- Check logs for: "✅ Monthly income updated from manual input: 0"

**Test Case: No Financial Data**
- POST /api/financial/checkin with message only, no income/expenses
- Verify: AI guides with questions, doesn't demand data
- Check response for gentle tone

**Test Case: Long Message**
- POST with message > 2000 characters
- Verify: 400 response with validation error
- Check logs for: "Validation errors"

**Test Case: Debt > Income**
- Submit financials where debts exceed monthly income
- Verify: AI explains avalanche/snowball methods educationally
- Check response for: No "should" language, only education

**Test Case: Investment Advice Request**
- User asks: "Should I invest in Bitcoin?"
- Verify: Response includes disclaimer template
- Check for: "licensed financial adviser" recommendation

### 2. Logging Monitoring

Check Railway logs for:
- `[AI Service] Attempting to call gpt-4...` — Model attempt
- `[AI Service] Using fallback model: gpt-4-turbo` — Fallback usage
- `📝 Check-in submission:` — Input tracking
- `🤖 Calling AI service...` — AI call initiation
- `✅ AI response received successfully` — Successful completion
- Income/expense update logs with amounts and sources

### 3. Data Validation

Test JSON response from AI:
- Ensure valid JSON structure
- Check extractedFinancialData has correct types
- Verify falsey values (0, null, []) handled correctly
- Test merge logic for avoiding duplicates in accounts/debts/goals

---

## Deployment Notes

### Environment Variables
Ensure `.env` has:
```
OPENAI_API_KEY=sk-...
```

### Database Migrations
No schema changes required. This is a service-layer improvement.

### Backwards Compatibility
- Existing financial.js route structure unchanged
- New aiService.js doesn't affect other services
- Safe to deploy without data migration

### Monitoring
After deployment, watch Railway logs for:
1. AI fallback model usage patterns
2. Validation error frequency
3. AI response success rate
4. Data extraction patterns (zero income users, missing data, etc.)

---

## User Impact

### For Beginners
✅ Explains concepts before using jargon
✅ Doesn't demand financial data they're uncomfortable sharing
✅ Handles zero income with empathy
✅ Guides toward learning, not prescriptions

### For Vulnerable Users
✅ Debt-ridden users get educational explanations, not judgment
✅ Unemployed/zero-income users supported with Centrelink context
✅ All advice requests redirected to licensed advisers
✅ Privacy respected (no forced data entry)

### For Compliance
✅ Clear positioning as educational-only tool
✅ Explicit disclaimer when crossing into advice territory
✅ Australian regulatory context (ATO, Centrelink, etc.)
✅ Licensed adviser referral for personalised situations

---

## Future Improvements

1. **Context Window Management**: Track conversation length to manage token usage
2. **User Segmentation**: Detect beginner vs intermediate vs advanced users
3. **Concept Definitions**: Build glossary of auto-defined financial terms
4. **Centrelink Integration**: Link to specific Centrelink pages relevant to user's situation
5. **Adviser Referral**: Link to licensed financial advisers in user's state
6. **Accessibility**: Add text-to-speech for audio learners
7. **Feedback Loop**: Track which explanations help vs confuse users

---

## Files Location Summary

- **Service**: `/sessions/wonderful-youthful-ritchie/mnt/caplet/backend/services/aiService.js`
- **Route**: `/sessions/wonderful-youthful-ritchie/mnt/caplet/backend/routes/financial.js`
- **Tests**: `/sessions/wonderful-youthful-ritchie/mnt/caplet/backend/tests/financial.test.js` (mocks aiService)

---

**Status**: ✅ All changes complete, syntax validated, ready for deployment
