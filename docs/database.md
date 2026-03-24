# Database Schema

Caplet uses **PostgreSQL** (via Railway) managed by **Sequelize ORM**. The schema auto-syncs with `{ alter: true }` on every server start — no separate migration files.

All models are defined in `backend/models/` with associations in `backend/models/index.js`.

---

## Table of Contents

1. [Core Hierarchy](#core-hierarchy)
2. [Models](#models)
   - [Users](#users)
   - [Courses](#courses)
   - [Modules](#modules)
   - [Lessons](#lessons)
   - [UserProgress](#userprogress)
   - [FinancialState](#financialstate)
   - [CheckIn](#checkin)
   - [FinancialPlan](#financialplan)
   - [Summary](#summary)
   - [Classroom System](#classroom-system)
   - [Survey](#survey)
3. [AI Data Flow](#ai-data-flow)

---

## Core Hierarchy

```
Course → Module → Lesson
User → UserProgress (tracks per-lesson completion + quiz scores)
User → FinancialState (live financial snapshot)
User → CheckIn (each chat message)
User → FinancialPlan (AI-generated financial plan)
User → Summary (AI-maintained rolling context)
Classroom → ClassMembership (students)
Classroom → Assignment → AssignmentSubmission
Classroom → ClassAnnouncement → Comment
```

---

## Models

### Users

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | String | Unique |
| `password` | String | bcrypt hashed (12 rounds) |
| `firstName` | String | |
| `lastName` | String | |
| `dateOfBirth` | Date | |
| `isEmailVerified` | Boolean | |
| `role` | Enum | `student` / `instructor` / `admin` |
| `profilePicture` | String | URL |
| `bio` | Text | |
| `preferences` | JSON | User preferences object |

---

### Courses

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `title` | String | |
| `description` | Text | |
| `shortDescription` | String | |
| `category` | Enum | `budgeting`, `superannuation`, `tax`, `loans`, `investment`, `planning`, `corporate-finance`, `other` |
| `level` | Enum | `beginner`, `intermediate`, `advanced` |
| `duration` | Integer | Minutes |
| `thumbnail` | String | URL |
| `isPublished` | Boolean | |
| `isFree` | Boolean | All current courses are `true` |
| `price` | Decimal | |
| `tags` | JSON Array | |
| `prerequisites` | JSON Array | |
| `learningOutcomes` | JSON Array | |

---

### Modules

Modules group lessons within a course.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `courseId` | UUID | Foreign key → Course |
| `title` | String | |
| `order` | Integer | 1-based ordering within course |
| `isPublished` | Boolean | |

---

### Lessons

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `moduleId` | UUID | Foreign key → Module |
| `courseId` | UUID | Foreign key → Course (denormalized for convenience) |
| `title` | String | |
| `description` | Text | |
| `slides` | JSON | Array of slide objects: `{ type: "text"\|"video"\|"image"\|"question", content, caption?, question?, options?, correctIndex?, explanation? }` |
| `lastSlideIndex` | Integer | Total slide count (for progress tracking) |
| `duration` | Integer | Minutes |
| `order` | Integer | 1-based ordering within module |
| `lessonType` | Enum | `video` / `text` / `interactive` |
| `videoUrl` | String | Legacy field |
| `isPublished` | Boolean | |
| `metadata` | JSON | Legacy: includes quiz questions, `hasQuiz` flag |

---

### UserProgress

Tracks per-user, per-lesson progress. Auto-created on first lesson access (auto-enrollment).

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key → User |
| `courseId` | UUID | Foreign key → Course |
| `lessonId` | UUID | Foreign key → Lesson |
| `status` | Enum | `not_started` / `in_progress` / `completed` |
| `progressPercentage` | Integer | 0–100 |
| `currentSlideIndex` | Integer | Current slide position |
| `timeSpent` | Integer | Minutes |
| `lastAccessedAt` | Date | |
| `completedAt` | Date | |
| `quizScores` | JSON | `{ [slideIndex]: { answer, correct, explanation } }` |
| `notes` | JSON | |
| `bookmarks` | JSON | |

---

### FinancialState

Live financial snapshot for each user. Updated automatically by the AI on each check-in.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key → User (unique) |
| `netWorth` | Decimal | |
| `monthlyIncome` | Decimal | |
| `monthlyExpenses` | Decimal | |
| `savingsRate` | Decimal | Calculated: `((income - expenses) / income) * 100` |
| `accounts` | JSON Array | `[{ name, balance, type }]` |
| `debts` | JSON Array | `[{ name, amount, interestRate, minimumPayment }]` |
| `goals` | JSON Array | `[{ name, targetAmount, targetDate, currentAmount }]` |

**Update priority:** Manual input > AI extracted > Budget allocation calculation > Existing values

---

### CheckIn

Each user message sent to the AI advisor.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key → User |
| `message` | Text | User's chat message |
| `monthlyIncome` | Decimal | Optional manual input |
| `monthlyExpenses` | Decimal | Optional manual input |
| `isMonthlyCheckIn` | Boolean | Triggers financial plan generation |

---

### FinancialPlan

AI-generated financial plan. Created/updated when `shouldUpdatePlan` is true in the AI response.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key → User |
| `budgetAllocation` | JSON | `{ rent, food, utilities, transport, entertainment, savings, other }` |
| `savingsStrategy` | JSON | `{ recommendedMonthlySavings, emergencyFundTarget, investmentRecommendations }` |
| `debtStrategy` | JSON | `{ totalDebt, recommendedMonthlyPayment, payoffTimeline, priorityDebt }` |
| `goalTimelines` | JSON Array | `[{ name, targetAmount, monthlyContribution, timeline, description }]` |
| `actionItems` | JSON Array | Specific action steps |
| `insights` | JSON Array | AI-generated insights |

---

### Summary

AI-maintained rolling context of all previous check-ins. Used as historical context in the AI prompt.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key → User |
| `content` | Text | AI-generated summary of all previous check-ins and financial context |

---

### Classroom System

| Model | Purpose |
|---|---|
| `Classroom` | A class/group managed by an instructor |
| `ClassMembership` | Student membership in a classroom |
| `Assignment` | Assignment created within a classroom |
| `AssignmentSubmission` | Student submission for an assignment |
| `ClassAnnouncement` | Announcement posted in a classroom |
| `Comment` | Comment on a class announcement |

---

### Survey

Exists in the schema but is **not actively used** in the current product.

---

## AI Data Flow

```
User sends chat message
        ↓
Backend receives CheckIn (message + optional manual input)
        ↓
aiService.js: single unified prompt call
  - Extracts financial data from message
  - Merges with existing FinancialState
  - Generates response + plan
        ↓
Backend updates FinancialState (manual input takes priority)
Backend updates Summary (rolling AI context)
Backend creates/updates FinancialPlan (if shouldUpdatePlan = true)
        ↓
Frontend receives { summary, detailedBreakdown, ... }
Frontend updates chat UI + financial snapshot
```
