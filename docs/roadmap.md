# Roadmap

---

## Table of Contents

1. [Recent Developments](#recent-developments)
2. [Immediate Focus](#immediate-focus)
3. [Integration Ideas](#integration-ideas)
4. [Monetization Strategy](#monetization-strategy)
5. [Technical Improvements](#technical-improvements)
6. [Current Challenges](#current-challenges)

---

## Recent Developments

### Dashboard Redesign (Chat-First)
- Transformed from a form-heavy dashboard to a chat interface
- Session-only messages (not persisted to database)
- Summary / detailed breakdown toggle
- Improved mobile responsiveness

### AI Integration Enhancement
- Moved from separate extraction + response calls to a **unified prompt** (single API call)
- AI now controls financial numbers automatically
- Manual input kept as an override option
- More specific, actionable responses with exact calculations

### Course System Simplification
- Removed explicit enrollment — auto-enroll on first access
- Added progress bars with percentage completion
- Streamlined course access flow

### Database Cleanup
- Removed unused columns and tables
- Ensured courses/lessons are preserved when a user deletes their personal data
- Optimized schema

### New Courses Added
- **BASICS OF INVESTMENT** — stock market fundamentals
- **QUANTITATIVE FINANCE** — advanced LSV models with complex formulae

### Terms Page
- Added legal disclaimer page
- Linked in footer (not main nav)

---

## Immediate Focus

### Improving AI for "Clueless Users"
Many users are completely new to personal finance. The AI needs to:
- Be more beginner-friendly and educational
- Guide users step-by-step from absolute basics
- Avoid assuming financial knowledge
- Consider an onboarding flow that teaches financial basics before diving into planning

---

## Integration Ideas

These are ideas from user feedback — not yet implemented.

### Real Estate Integration
- Link to realestate.com.au when discussing property purchases
- Show properties within the user's calculated budget
- Affiliate revenue potential

### Car Listings
- Integrate car search when discussing vehicle purchases
- Show cars within the calculated budget
- Link to car listing sites (e.g. carsales.com.au)

### Job Search Integration
- When AI suggests finding a better-paying job, link to job search sites
- Show relevant job listings based on the user's field
- Help users find opportunities to increase income

### General Integration Strategy
- **Smart linking** — contextual recommendations based on conversation topic
- **Progressive disclosure** — start simple, offer deeper integrations for engaged users
- **Educational scaffolding** — teach basics before diving into planning

---

## Monetization Strategy

**Current status:** All features are free. No monetization active yet.

| Tier | Description |
|---|---|
| **Free** | All courses, all tools, basic AI advice |
| **Paid** | Detailed financial planning, coaching sessions, advanced AI features |
| **Affiliate** | Revenue from integrated services (real estate, cars, jobs) |
| **Partnership** | School curriculum partnerships for courses |

The AI chatbot is the primary monetization target. Courses and Tools remain free permanently to drive organic traffic.

---

## Technical Improvements

### Better Error Handling
- More graceful AI API failures
- Better validation messages
- User-friendly error states for edge cases

### Performance Optimization
- Caching for course data
- Optimistic UI updates
- Reduce redundant API calls

### Analytics
- Track user engagement and session depth
- Monitor AI response quality
- Course completion rates
- Tool usage statistics

### Testing
- Unit tests for `aiService.js`
- Integration tests for financial data flows
- E2E tests for critical user paths (login → chat → plan generation)

---

## Current Challenges

### User Financial Literacy Gap
Many users don't understand basic financial concepts. The AI currently assumes too much knowledge. Better onboarding and more educational AI responses are needed.

### AI Response Quality
- Balancing specificity with clarity for non-expert users
- Ensuring calculations are always correct
- Handling edge cases gracefully (zero income, negative savings, unusual financial situations)

### Integration Complexity
- Managing multiple third-party API integrations
- Maintaining affiliate/partnership relationships
- Legal and compliance considerations for financial advice

### Monetization Timing
- Determining the right time to introduce paid features
- Structuring free vs. paid tiers without alienating early users
- Pricing strategy for the Australian market
