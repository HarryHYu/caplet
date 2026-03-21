# Caplet User Onboarding Flow - Implementation Guide

## Summary

A complete user onboarding wizard has been built for the Caplet financial literacy platform. The multi-step wizard guides new users through their financial learning journey with a focus on education, not financial advice.

## Architecture

### Database Layer

**Files Modified:**
- `/backend/models/User.js` - Added two new fields

**Migration Created:**
- `/backend/migrations/002-user-onboarded.js`

**New User Fields:**
```javascript
onboarded: {
  type: DataTypes.BOOLEAN,
  defaultValue: false
}

onboardingData: {
  type: DataTypes.TEXT,
  allowNull: true,
  // Stores: { knowledgeLevel, goals[], incomeRange, completedAt }
}
```

### Backend API Layer

**File Modified:**
- `/backend/routes/users.js`

**New Endpoint:**
```
POST /api/users/complete-onboarding
```

**Request Payload:**
```json
{
  "knowledgeLevel": "beginner|intermediate|advanced",
  "goals": ["budgeting", "saving", "investing", ...],
  "incomeRange": "under-2k|2k-4k|4k-7k|7k-10k|over-10k|prefer-not-to-say"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Onboarding completed successfully",
  "user": { ... }
}
```

**Validation:**
- Knowledge level must be one of the enum values
- Goals must be an array
- Income range must be one of the enum values

### Frontend Components

**New Component Created:**
- `/src/components/OnboardingWizard.jsx` (14 KB)

**Component Features:**
- **5-step wizard** with progress tracking
- **Full-screen modal overlay** with clean design
- **Back/Next navigation** with validation
- **Error handling** with user feedback
- **Loading states** during submission
- **Tailwind CSS styling** matching app design
- **Accessibility** with semantic HTML and labels

**Wizard Steps:**

1. **Welcome** - Introduction to the tool, clarifies education-only purpose
2. **Knowledge Level** - Radio selection (Beginner/Intermediate/Advanced)
3. **Learning Goals** - Checkbox selection (up to 3 from 8 options)
4. **Income Range** - Radio selection (6 options including "Prefer not to say")
5. **Summary** - Review selections before completion

### Frontend Service Layer

**File Modified:**
- `/src/services/api.js`

**New Method:**
```javascript
async completeOnboarding(onboardingData) {
  return this.request('/users/complete-onboarding', {
    method: 'POST',
    body: JSON.stringify(onboardingData),
  });
}
```

### Frontend Integration

**File Modified:**
- `/src/pages/Dashboard.jsx`

**Integration Points:**
1. Import OnboardingWizard component
2. Add state for `showOnboarding` and `introMessage`
3. Check `user.onboarded` in useEffect
4. Render wizard conditionally
5. Handle onComplete callback
6. Page reload on completion

## User Experience Flow

```
User Registration/Login
        ↓
First Dashboard Visit
        ↓
Check: user.onboarded == false ?
        ├─ YES → Show OnboardingWizard
        │         ↓
        │     User completes 5 steps
        │         ↓
        │     POST to /api/users/complete-onboarding
        │         ↓
        │     onboarded = true, onboardingData saved
        │         ↓
        │     Page reloads
        │         ↓
        │     Wizard doesn't appear again
        │
        └─ NO → Show normal dashboard
```

## Educational Language

The entire onboarding flow emphasizes **learning and education**:

- "Learn about personal finance through conversation"
- "Provides financial education only — not financial advice"
- "Personalise your learning journey"
- References to "curriculum modules" and "academy classes"

**No financial advice or recommendations** are given at any point.

## Data Stored

When a user completes onboarding, the following data is stored:

```javascript
{
  onboarded: true,
  onboardingData: {
    knowledgeLevel: "beginner|intermediate|advanced",
    goals: ["budgeting", "saving", ...],
    incomeRange: "under-2k|2k-4k|...",
    completedAt: "2026-03-22T10:15:30.123Z"
  }
}
```

This data can be used to:
- Personalize educational content recommendations
- Track user learning preferences
- Measure onboarding conversion
- Filter users for targeted features

## Files Overview

### Created Files
1. **`/backend/migrations/002-user-onboarded.js`** (705 bytes)
   - Adds columns to users table
   - Reversible with down() function

2. **`/src/components/OnboardingWizard.jsx`** (14 KB)
   - Complete standalone wizard component
   - No external dependencies beyond React and Heroicons
   - Uses Tailwind CSS for styling

### Modified Files
1. **`/backend/models/User.js`**
   - Added 2 new fields to User model

2. **`/backend/routes/users.js`**
   - Added POST endpoint with validation

3. **`/src/services/api.js`**
   - Added completeOnboarding() method

4. **`/src/pages/Dashboard.jsx`**
   - Imported wizard component
   - Added state management
   - Integrated conditional rendering

## Deployment Checklist

- [ ] **Backend:**
  - Run database migration: `npm run migrate` (in `/backend`)
  - Verify `users` table has new columns
  - Test API endpoint with curl or Postman

- [ ] **Frontend:**
  - Verify components render without errors
  - Test wizard flow end-to-end
  - Test form validation on each step
  - Verify goal selection max (3) is enforced
  - Test error handling (simulate API failure)
  - Test page reload after completion

- [ ] **Integration:**
  - Test new user sees wizard on first dashboard visit
  - Test returning user doesn't see wizard
  - Verify `onboarded` flag persists in database
  - Verify `onboardingData` stored correctly

## Future Enhancements

1. **Progress Persistence** - Save partial progress to allow resuming
2. **Dynamic Goals** - Pull learning goals from database instead of hardcoded
3. **Personalization** - Use onboardingData to customize dashboard content
4. **Analytics** - Track completion rate and step drop-off
5. **Mobile Optimization** - Enhanced responsive design for small screens
6. **Accessibility** - Add ARIA labels and keyboard navigation testing
7. **Localization** - Support multiple languages

## Technical Details

**Knowledge Levels & Descriptions:**
- Beginner: "Just starting to learn about personal finance"
- Intermediate: "I have some financial knowledge"
- Advanced: "I have strong financial knowledge"

**Learning Goals (8 options):**
- Budgeting
- Saving
- Investing
- Superannuation
- Tax
- Paying off debt
- Buying a home
- Building an emergency fund

**Income Ranges (6 options):**
- Under $2,000/month
- $2,000 – $4,000/month
- $4,000 – $7,000/month
- $7,000 – $10,000/month
- Over $10,000/month
- Prefer not to say

## Support & Troubleshooting

**Wizard not appearing?**
- Check user.onboarded in database (should be false for new users)
- Verify Dashboard.jsx useEffect is running
- Check browser console for errors

**API endpoint 404?**
- Verify route is added to `/backend/routes/users.js`
- Check API_BASE_URL is correct
- Test with: `curl -X POST http://localhost:5002/api/users/complete-onboarding`

**Database migration failed?**
- Verify migration file syntax
- Check database connection
- Ensure previous migrations passed
- Run: `npm run migrate:status`

**Styling issues?**
- Verify Tailwind CSS classes are recognized
- Check if component CSS classes match app theme
- Ensure no CSS conflicts with existing components
