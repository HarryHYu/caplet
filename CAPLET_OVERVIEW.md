# CAPLET - Complete Overview & Context

## WHAT IS CAPLET?

Caplet is a financial education platform for Australians designed to bridge the financial literacy gap. The platform has three core components:

1. **COURSES** - Free educational content (traffic generator)
2. **TOOLS** - Free financial calculators (traffic generator via SEO)
3. **AI CHATBOT** - AI-powered financial advisor (monetization target)

**Business Model:**
- Courses and Tools are completely FREE to generate traffic
- Only the AI chatbot will be monetized (still in development phase, not charging yet)
- Courses will be tailored to school curriculums with active partnership seeking
- Tools will be heavily SEO-optimized to capture niche calculator searches

**Current Status:** Development phase - focusing on building and refining features before monetization

---

## TECHNICAL ARCHITECTURE

### Frontend Stack
- **React 19** - Modern React with latest features
- **Vite** - Fast build tool and development server
- **Tailwind CSS v3.4** - Utility-first CSS framework (configured via postcss.config.js and tailwind.config.js)
- **React Router v7** - Client-side routing
- **React Markdown** - For rendering course content
- **Recharts** - For data visualization

### Backend Stack
- **Node.js** with **Express 5** - RESTful API server
- **PostgreSQL** - Production database (via Railway)
- **SQLite** - Local development database
- **Sequelize ORM** - Database management
- **OpenAI API** (GPT-4o, GPT-4-turbo, GPT-3.5-turbo fallback) - AI financial advisor
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **Helmet** - Security headers

### Deployment
- **Frontend:** Vercel (capletedu.org with custom domain)
- **Backend:** Railway (PostgreSQL database + Express API)
- **Repository:** github.com/HarryHYu/caplet (main branch)

---

## DATABASE SCHEMA

### Core Models (PostgreSQL via Sequelize):

1. **Users**
   - UUID primary key
   - Email, password (bcrypt hashed), firstName, lastName
   - dateOfBirth, isEmailVerified, role (student/instructor/admin)
   - profilePicture, bio, preferences (JSON)

2. **Courses**
   - UUID primary key
   - title, description, shortDescription
   - category (budgeting, superannuation, tax, loans, investment, planning)
   - level (beginner, intermediate, advanced)
   - duration (minutes), thumbnail
   - isPublished, isFree, price
   - tags, prerequisites, learningOutcomes (all JSON arrays)

3. **Lessons**
   - UUID primary key, courseId (foreign key)
   - title, description, content (markdown)
   - duration, order, lessonType (video/text/interactive)
   - videoUrl, isPublished
   - metadata (JSON) - includes quiz questions, hasQuiz flag

4. **UserProgress**
   - UUID primary key
   - userId, courseId, lessonId (foreign keys)
   - status (not_started/in_progress/completed)
   - progressPercentage (0-100)
   - timeSpent (minutes)
   - lastAccessedAt, completedAt
   - quizScores (JSON object)
   - notes, bookmarks (JSON)

5. **FinancialState**
   - UUID primary key, userId (foreign key)
   - netWorth, monthlyIncome, monthlyExpenses, savingsRate
   - accounts (JSON array: name, balance, type)
   - debts (JSON array: name, amount, interestRate, minimumPayment)
   - goals (JSON array: name, targetAmount, targetDate, currentAmount)

6. **CheckIn**
   - UUID primary key, userId (foreign key)
   - message (user's chat message)
   - monthlyIncome, monthlyExpenses (optional manual input)
   - isMonthlyCheckIn (boolean flag)

7. **FinancialPlan**
   - UUID primary key, userId (foreign key)
   - budgetAllocation (JSON object)
   - savingsStrategy (JSON: recommendedMonthlySavings, emergencyFundTarget, etc.)
   - debtStrategy (JSON: totalDebt, recommendedMonthlyPayment, payoffTimeline, etc.)
   - goalTimelines (JSON array)
   - actionItems (JSON array)
   - insights (JSON array)

8. **Summary**
   - UUID primary key, userId (foreign key)
   - content (TEXT) - AI-generated summary of all previous check-ins and financial context

9. **Survey** (exists but not actively used)

---

## CURRENT FEATURES

### 1. COURSES SYSTEM

**Current Courses:**
- **BUDGETING 101** - Beginner course on budgeting fundamentals
  - Module 1: "What is a budget?" with YouTube video and 6-question quiz
- **BASICS OF INVESTMENT** - Beginner course on stock market basics
  - Module 1: "Introduction to the Stock Market" with YouTube video and 10-question quiz
- **QUANTITATIVE FINANCE** - Advanced course on LSV models
  - Module 1: "Local–Stochastic Volatility (LSV) Models" with YouTube video, complex mathematical formulae, and 9-question quiz

**Course Features:**
- ✅ Auto-enrollment (no explicit "enroll" button - users click course card and go directly in)
- ✅ Progress tracking with green progress bar showing completion percentage
- ✅ Lesson-based structure with video support
- ✅ Interactive quizzes with multiple-choice questions
- ✅ Quiz score tracking stored in UserProgress.quizScores
- ✅ Markdown content rendering
- ✅ Mobile-responsive design

**Course Management:**
- Courses are seeded via Node.js scripts (setup-budgeting-101.js, add-investment-course.js, add-quantitative-finance-course.js)
- All courses are free (isFree: true)
- Courses can be published/unpublished

### 2. TOOLS SYSTEM

**Available Calculators (All Free):**
1. Tax Calculator
2. Budget Planner
3. Savings Goal Calculator
4. Loan Repayment Calculator
5. Compound Interest Calculator
6. Mortgage Calculator
7. Super Contribution Calculator
8. GST Calculator
9. Salary Calculator
10. Emergency Fund Calculator

**Tool Features:**
- ✅ All tools are free and accessible
- ✅ SEO-optimized for organic traffic
- ✅ Mobile-responsive
- ✅ Australian financial context (GST, superannuation, tax brackets)

### 3. AI FINANCIAL ADVISOR (CHATBOT)

**Core Functionality:**
- ✅ **Chat-first interface** - Main dashboard is a chat interface
- ✅ **Session-only messages** - Chat history is NOT persisted (only shown in current session)
- ✅ **AI data extraction** - AI automatically extracts financial data from user messages:
  - Income amounts (salary, wages, raises - converts annual to monthly)
  - Expenses (rent, food, bills, subscriptions - categorizes automatically)
  - Accounts (bank accounts, savings with balances)
  - Debts (loans, credit cards with amounts, interest rates, minimum payments)
  - Goals (savings targets, purchase plans, timelines)
  - Major events (job changes, large purchases, windfalls, emergencies)

**AI Response Structure:**
- **Summary** - Short 2-3 sentence takeaway (shown by default)
- **Detailed Breakdown** - Full response with calculations, step-by-step reasoning, specific advice (expandable)
- Users can toggle between summary and detailed view

**AI Capabilities:**
- ✅ **Unified prompt system** - Single API call that:
  1. Extracts financial data from user message
  2. Organizes and merges with existing data
  3. Generates response/plan with specific numbers and calculations
- ✅ **Manual input override** - Users can still manually input income/expenses (takes priority over AI extraction)
- ✅ **Context awareness** - AI maintains a Summary that contains historical context of all previous check-ins
- ✅ **Australian financial context** - Understands superannuation, tax brackets, GST, Australian financial products
- ✅ **Specific & actionable** - AI is instructed to:
  - Always include exact numbers and calculations
  - Show step-by-step work
  - Give specific recommendations (not vague advice)
  - Calculate exact price ranges, loan amounts, monthly payments
  - Break down savings rates, leftover amounts, timelines

**Financial State Management:**
- AI updates FinancialState automatically based on extracted data
- Priority order: Manual input > AI extracted > Budget allocation calculation > Existing values
- Monthly expenses calculated from budgetAllocation if not explicitly provided
- Savings rate calculated automatically: ((income - expenses) / income) * 100

**Financial Plan Generation:**
- Generated for monthly check-ins or significant changes
- Includes:
  - Budget allocation (rent, food, utilities, transport, entertainment, savings, other)
  - Savings strategy (recommended monthly savings, emergency fund target, investment recommendations)
  - Debt strategy (total debt, recommended payments, payoff timeline, priority debt)
  - Goal timelines (with monthly contributions and descriptions)
  - Action items
  - Insights

**Dashboard UI:**
- Compact financial snapshot at top (net worth, income, expenses, savings rate, accounts, debts, goals)
- Chat interface below with:
  - User messages (blue, right-aligned)
  - AI messages (white/gray, left-aligned)
  - "Thinking..." state while processing
  - Expand/collapse for detailed breakdown
  - Auto-scrolling to latest message
- Optional manual input form (collapsible "Advanced" section)
- "Delete All Data" button (only deletes personal data: FinancialState, CheckIn, FinancialPlan, Summary, UserProgress - preserves courses/lessons)

### 4. STATIC PAGES

- **Home** - Hero banner, tagline, intro, navigation to About/Mission
- **About** - Platform summary, financial literacy gap in Australia
- **Mission** - Problem overview, solution, features, vision
- **FAQ** - Common questions about financial literacy and platform
- **Contact** - Email contact (contact@capletedu.org)
- **Terms and Services** - Disclaimer page (linked in footer, not main nav)
  - "Caplet is not liable for any financial damages"
  - "Designed purely for educational purposes"
  - "Don't sue us"

### 5. AUTHENTICATION

- JWT-based authentication
- User registration/login
- Email verification system (isEmailVerified flag)
- Protected routes (Dashboard requires authentication)
- Password hashing with bcryptjs (12 rounds)

### 6. SEO & DEPLOYMENT

- ✅ robots.txt configured
- ✅ sitemap.xml generated
- ✅ Meta tags for SEO
- ✅ Custom domain: capletedu.org
- ✅ Vercel deployment for frontend
- ✅ Railway deployment for backend

---

## KEY TECHNICAL IMPLEMENTATIONS

### AI Service Architecture

**File:** `backend/services/aiService.js`

**Unified Prompt System:**
The AI uses a single, comprehensive prompt that instructs it to:
1. **Extract** financial data from user message
2. **Organize** extracted data and merge with existing state
3. **Generate** response/plan with specific numbers

**Prompt Structure:**
- User message
- Historical context (AI Summary)
- Current financial state (from database)
- Manual input (if provided - takes priority)
- Previous financial plan (if exists)
- Instructions for 3-step process
- Response style requirements (direct, specific, actionable)
- Output format (JSON with extractedFinancialData, response, summary, detailedBreakdown, plan components)

**Model Fallback:**
- Tries GPT-4o first (most capable)
- Falls back to GPT-4-turbo
- Falls back to GPT-3.5-turbo
- Handles model availability errors gracefully

**Response Format:**
```json
{
  "extractedFinancialData": {
    "monthlyIncome": number | null,
    "expenses": { "rent": number | null, "food": number | null, ... },
    "accounts": [...],
    "debts": [...],
    "goals": [...]
  },
  "response": "Full conversational response",
  "summary": "2-3 sentence summary",
  "detailedBreakdown": "Full detailed response with calculations",
  "shouldUpdatePlan": boolean,
  "budgetAllocation": {...},
  "savingsStrategy": {...},
  "debtStrategy": {...},
  "goalTimelines": [...],
  "actionItems": [...],
  "insights": [...]
}
```

### Financial Data Flow

1. User sends message in chat
2. Backend receives check-in with message (and optional manual input)
3. AI service extracts data + generates response in single call
4. Backend updates FinancialState with extracted data (manual input takes priority)
5. Backend updates Summary with new context
6. Backend creates/updates FinancialPlan if shouldUpdatePlan is true
7. Frontend receives response with summary + detailedBreakdown
8. Frontend updates chat UI and financial snapshot

### Expense Calculation Logic

**Priority Order:**
1. Manual expenses input (if provided)
2. AI-extracted expenses (if mentioned in message)
3. Budget allocation calculation (sum of all categories except savings)
4. Keep existing expenses (if none of above)

**Frontend Fallback:**
If monthlyExpenses is 0 but budgetAllocation exists, frontend calculates total from budget (excluding savings) and updates display.

### Course Progress System

- Auto-enrollment: When user accesses a course, UserProgress entry is automatically created
- Progress calculated from lesson completion and quiz scores
- Progress bar shows percentage completion
- Quiz scores stored in UserProgress.quizScores (JSON object)

---

## RECENT DEVELOPMENTS & ACHIEVEMENTS

### Major Refactors:

1. **Dashboard Redesign** (Chat-First)
   - Transformed from form-heavy dashboard to chat interface
   - Session-only messages (not persisted)
   - Summary/detailed breakdown toggle
   - Improved mobile responsiveness

2. **AI Integration Enhancement**
   - Moved from separate extraction + response to unified prompt
   - AI now controls financial numbers automatically
   - Manual input kept as override option
   - More specific, actionable responses with exact calculations

3. **Course System Simplification**
   - Removed explicit enrollment (auto-enroll on access)
   - Added progress bars
   - Streamlined course access flow

4. **Database Cleanup**
   - Removed unused columns/tables
   - Ensured courses/lessons are preserved when deleting user data
   - Optimized schema

5. **New Courses Added**
   - BASICS OF INVESTMENT (with stock market content)
   - QUANTITATIVE FINANCE (advanced LSV models with complex formulae)

6. **Terms Page**
   - Added legal disclaimer page
   - Linked in footer

---

## FUTURE PLANS & IDEAS

### Immediate Development Focus:

1. **Improving AI for "Clueless Users"**
   - Many users are "absolutely clueless" about finances
   - Need to make AI more beginner-friendly
   - Consider adding onboarding flow for financial basics
   - AI should guide step-by-step from absolute basics

### Integration Ideas (From User Feedback):

Users suggested integrating external services to make advice more actionable:

1. **Real Estate Integration**
   - Link to realestate.com when discussing property purchases
   - Show properties within user's budget
   - Affiliate potential

2. **Car Listings**
   - Integrate car search when discussing vehicle purchases
   - Show cars within calculated budget
   - Link to car listing sites

3. **Job Search Integration**
   - When AI suggests finding better-paying job, link to job search sites
   - Show relevant job listings
   - Help users find opportunities to increase income

4. **General Integration Strategy**
   - Smart linking: Contextual recommendations based on conversation
   - Progressive disclosure: Start simple, offer deeper integrations for engaged users
   - Educational scaffolding: Teach basics before diving into planning

### Monetization Strategy (Future):

- **Free Tier:** Basic AI advice
- **Paid Tier:** Detailed financial planning, coaching, advanced features
- **Affiliate Revenue:** From integrated services (real estate, cars, jobs)
- **Partnership Revenue:** School curriculum partnerships for courses

### Technical Improvements Needed:

1. **Better Error Handling**
   - More graceful AI API failures
   - Better validation messages
   - User-friendly error states

2. **Performance Optimization**
   - Caching for course data
   - Optimistic UI updates
   - Reduce API calls

3. **Analytics**
   - Track user engagement
   - Monitor AI response quality
   - Course completion rates
   - Tool usage statistics

4. **Testing**
   - Unit tests for AI service
   - Integration tests for financial flows
   - E2E tests for critical paths

---

## CURRENT CHALLENGES

1. **User Financial Literacy Gap**
   - Many users don't understand basic financial concepts
   - AI needs to be more educational and less assumptive
   - Need better onboarding/guidance

2. **AI Response Quality**
   - Balancing specificity with clarity
   - Ensuring calculations are always correct
   - Handling edge cases (zero income, negative savings, etc.)

3. **Integration Complexity**
   - Managing multiple API integrations
   - Maintaining partnerships
   - Legal/compliance considerations

4. **Monetization Timing**
   - When to introduce paid features
   - How to structure free vs paid tiers
   - Pricing strategy

---

## CODEBASE STRUCTURE

```
caplet/
├── backend/
│   ├── config/
│   │   └── database.js          # Sequelize config
│   ├── models/                  # Database models
│   │   ├── User.js
│   │   ├── Course.js
│   │   ├── Lesson.js
│   │   ├── UserProgress.js
│   │   ├── FinancialState.js
│   │   ├── CheckIn.js
│   │   ├── FinancialPlan.js
│   │   └── Summary.js
│   ├── routes/
│   │   ├── auth.js              # Authentication
│   │   ├── courses.js           # Course endpoints
│   │   ├── progress.js          # Progress tracking
│   │   ├── financial.js         # Financial advisor endpoints
│   │   └── users.js
│   ├── services/
│   │   └── aiService.js          # OpenAI integration
│   ├── middleware/
│   │   └── auth.js              # JWT verification
│   ├── server.js                # Express app entry
│   └── package.json
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   └── financial/
│   │       ├── FinancialSnapshot.jsx
│   │       └── FinancialPlan.jsx
│   ├── contexts/
│   │   ├── AuthContext.jsx
│   │   ├── CoursesContext.jsx
│   │   └── ThemeContext.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── About.jsx
│   │   ├── Mission.jsx
│   │   ├── FAQ.jsx
│   │   ├── Contact.jsx
│   │   ├── Terms.jsx
│   │   ├── Courses.jsx
│   │   ├── CourseDetail.jsx
│   │   ├── LessonPlayer.jsx
│   │   ├── Dashboard.jsx        # AI chatbot interface
│   │   ├── Tools.jsx
│   │   └── tools/               # 10 calculator tools
│   ├── services/
│   │   └── api.js               # Centralized API calls
│   ├── App.jsx                  # Routes
│   └── main.jsx                 # Entry point
├── public/                      # Static assets
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.js
```

---

## ENVIRONMENT VARIABLES

**Backend (.env):**
- `DATABASE_URL` - PostgreSQL connection string (Railway)
- `OPENAI_API_KEY` - OpenAI API key for AI service
- `JWT_SECRET` - Secret for JWT token signing
- `NODE_ENV` - Environment (production/development)

**Frontend:**
- API base URL configured in `src/services/api.js`
- Environment-specific API endpoints

---

## DEPLOYMENT WORKFLOW

1. **Frontend:** Push to main branch → Vercel auto-deploys
2. **Backend:** Push to main branch → Railway auto-deploys
3. **Database:** PostgreSQL on Railway, migrations via Sequelize
4. **Course Seeding:** Manual scripts run on Railway (or locally with DATABASE_URL)

---

## KEY FILES TO UNDERSTAND

1. **`backend/services/aiService.js`** - Core AI logic, unified prompt system
2. **`backend/routes/financial.js`** - Financial advisor API endpoints, data extraction logic
3. **`src/pages/Dashboard.jsx`** - Chat-first UI, message management, financial snapshot
4. **`backend/models/`** - Database schema definitions
5. **`src/services/api.js`** - All frontend API calls

---

## NOTES FOR DEVELOPMENT

- All courses are currently free (isFree: true)
- AI chatbot is in development, not monetized yet
- Focus on improving AI for beginners/clueless users
- Integration ideas are being explored but not yet implemented
- Database cleanup has been done - unused columns removed
- Auto-enrollment for courses (no explicit enroll action needed)
- Session-only chat messages (not persisted to database)
- Summary is updated on each check-in for AI context
- Manual input takes priority over AI extraction
- Frontend has fallback logic for expense calculation from budget allocation

---

**Last Updated:** Current development phase
**Repository:** github.com/HarryHYu/caplet
**Live Site:** capletedu.org
**Status:** Active development, pre-monetization

