# Caplet 🎓

[![React](https://img.shields.io/badge/React-19.0-blue?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Democratizing Financial Education for Every Australian.**

Caplet is a sophisticated, free-to-use educational platform meticulously crafted to bridge the financial literacy gap in Australia. By combining academic rigor with modern AI technology, we empower youth and the elderly with the knowledge needed to navigate complex financial landscapes.

---

## 🏛️ Project Pillars

### 1. 📚 Courses
Our curriculum focuses on the Australian context, covering everything from basic budgeting to advanced quantitative finance. 
- **Auto-Enrollment**: Zero friction access to knowledge.
- **Interactive Quizzes**: Real-time progress tracking and knowledge verification.
- **Markdown-Driven**: Clean, readable, and easily maintainable content.

### 2. 🧮 Tools
A suite of SEO-optimized financial calculators designed for immediate utility.
- **Tax & Superannuation**: Tailored for Australian regulations (GST, Super Contribution, etc.).
- **Loan & Mortgage**: Precise calculations for informed decision-making.
- **Goal Tracking**: Compound interest and savings calculators to visualize the future.

### 3. 🤖 AI Financial Advisor
The centerpiece of Caplet—a chat-first interface powered by state-of-the-art LLMs (GPT-4o).
- **Intelligent Extraction**: Automatically identifies income, expenses, and goals from natural conversation.
- **Dynamic Planning**: Generates personalized financial plans with exact calculations.
- **Privacy-First**: Session-only chat messages with full data control for the user.

---

## 🛠️ Technical Stack

### Frontend
- **Framework**: React 19 (Modern Hooks, optimized rendering)
- **Build Tool**: Vite (Lightning-fast development & HMR)
- **Styling**: Tailwind CSS (Utility-first, responsive, custom design tokens)
- **Visualizations**: Recharts (Data-driven insights)
- **Navigation**: React Router 7

### Backend
- **Server**: Node.js & Express 5
- **Database**: PostgreSQL (Production-ready via Railway) | SQLite (Local development)
- **ORM**: Sequelize (Consistent data modeling)
- **AI Integration**: OpenAI SDK (Unified prompt system with fallback logic)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm / yarn / pnpm

### Quick Start
1. **Clone & Enter**:
   ```bash
   git clone https://github.com/raei-2748/caplet.git
   cd caplet
   ```

2. **Setup Dependencies**:
   ```bash
   npm install
   ```

3. **Database Migration** (Local):
   ```bash
   # See backend documentation for migration steps
   ```

4. **Launch Development Environment**:
   ```bash
   npm run dev
   ```

---

## 📁 Architecture Overview

```text
caplet/
├── backend/            # Express server, Sequelize models, AI services
├── src/                # React application logic
│   ├── components/     # UI building blocks (Atomic design)
│   ├── pages/          # View components & entry points
│   ├── services/       # API abstraction layer
│   └── contexts/       # Global state management
├── public/             # Static assets
└── tailwind.config.js  # Design system configuration
```

---

## 📧 Contact & Support

We welcome feedback and academic contributions. Reach out to us at: **contact@capletedu.org**

---

**Caplet** - *Think with Clarity. Spend with Confidence.*
