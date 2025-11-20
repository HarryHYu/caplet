// Script to add Quantitative Finance course
// Use production database - requires DATABASE_URL environment variable
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL environment variable is required');
  console.error('Please set DATABASE_URL before running this script');
  process.exit(1);
}

process.env.NODE_ENV = 'production';

const { sequelize } = require('./config/database');
const Course = require('./models/Course');
const Lesson = require('./models/Lesson');

const addQuantitativeFinanceCourse = async () => {
  try {
    console.log('Adding Quantitative Finance course...');

    // Check for duplicates and remove them
    const existingCourses = await Course.findAll({
      where: { title: 'QUANTITATIVE FINANCE' }
    });
    
    if (existingCourses.length > 1) {
      console.log(`Found ${existingCourses.length} duplicate course(s). Removing...`);
      // Keep the first one, delete the rest
      for (let i = 1; i < existingCourses.length; i++) {
        await Lesson.destroy({ where: { courseId: existingCourses[i].id } });
        await existingCourses[i].destroy();
      }
      console.log('✅ Removed duplicate course entries');
    }

    // Check if course already exists
    let course = await Course.findOne({
      where: { title: 'QUANTITATIVE FINANCE' }
    });

    if (course) {
      console.log('Course already exists, updating...');
      // Delete existing lessons
      await Lesson.destroy({ where: { courseId: course.id } });
      console.log(`✅ Using existing course: ${course.title}`);
    } else {
      // Create the Quantitative Finance course
      course = await Course.create({
        title: 'QUANTITATIVE FINANCE',
        shortDescription: 'Advanced quantitative finance models for derivatives pricing and risk management.',
        description: 'Learn about Local-Stochastic Volatility (LSV) models, how banks use them for exotic derivatives pricing, and the mathematical frameworks that combine local and stochastic volatility.',
        category: 'investment',
        level: 'advanced',
        duration: 45,
        thumbnail: 'https://placehold.co/600x400?text=Quantitative+Finance',
        isPublished: true,
        isFree: true,
        tags: ['quantitative-finance', 'volatility', 'derivatives', 'advanced', 'lsv']
      });
      console.log(`✅ Created course: ${course.title}`);
    }

    // Create Module 1 lesson with video and quiz
    const lesson = await Lesson.create({
      courseId: course.id,
      title: 'Module 1: Local–Stochastic Volatility (LSV) Models',
      description: 'Understand the intuition behind LSV models, why banks use them for exotic derivatives, and how they merge two fundamentally different volatility frameworks into one unified system.',
      content: `# Module 1: Local–Stochastic Volatility (LSV) Models

## Objective

Understand the intuition behind LSV models, why banks use them for exotic derivatives, and how they merge two fundamentally different volatility frameworks into one unified system.

## Definition Simplified

A local–stochastic volatility (LSV) model is a hybrid model that combines:

**Local Volatility** — volatility depends on the underlying's current price and time → fits the entire implied volatility surface exactly.

**Stochastic Volatility** — volatility itself follows a random process → generates realistic future dynamics, skew, smile, and tail behavior.

An LSV model tries to get the best of both worlds: perfect surface calibration and realistic market behaviour over time.

## Core Concepts

### 1. Local Volatility Surface

A function:

\`\`\`
σ_L(S_t, t)
\`\`\`

derived from the market's current option prices via the Dupire equation:

\`\`\`
σ_L^2(S, t) = 2 * (∂C/∂t + rS * ∂C/∂S) / (S^2 * ∂²C/∂S²)
\`\`\`

**Meaning:**
- Volatility is deterministic and depends only on price and time.
- This ensures an exact match to today's entire volatility surface.

### 2. Stochastic Volatility Process

A second volatility component that evolves randomly:

Common choice is Heston:

\`\`\`
dV_t = κ(θ - V_t)dt + ξ√(V_t)dW_t^v
\`\`\`

where:
- \`V_t\` is the variance process
- \`κ\` is the mean reversion speed
- \`θ\` is the long-term variance
- \`ξ\` is the volatility of volatility
- \`dW_t^v\` is a Brownian motion

**Key Points:**
- Volatility can jump, mean-revert, cluster, etc.
- Gives realistic forward-looking behaviour.

### 3. Combining Them: The LSV Dynamics

The price process under LSV is:

\`\`\`
dS_t = rS_t dt + σ_L(S_t, t) * √(V_t) * S_t dW_t^S
\`\`\`

\`\`\`
dV_t = κ(θ - V_t)dt + ξ√(V_t)dW_t^v
\`\`\`

where \`dW_t^S\` and \`dW_t^v\` may be correlated with correlation \`ρ\`.

**Key Points:**
- Local Volatility shapes the distribution.
- Stochastic Volatility adds randomness + realism.
- The leverage function \`σ_L(S_t, t)\` ensures calibration to market prices.

### 4. Calibration Loop (The Hardest Part)

LSV models require solving a circular problem:

1. Local vol depends on the calibrated stochastic vol.
2. Stochastic vol calibration depends on the local vol.

**The Challenge:**
- Must match vanilla options and exotic sensitivities simultaneously.
- Requires iterative numerical methods.

**Banks use:**
- Particle filtering
- Monte Carlo with leverage function
- Fixed-point iteration
- PDE methods with stochastic volatility

This is why LSV is considered a frontier-level quant model.

## Checkpoint Quiz

Match terms (local volatility, stochastic volatility, leverage function, calibration) to examples:
- **Local Volatility**: Ensures exact fit to current implied vol surface
- **Stochastic Volatility**: Randomness in volatility driven by a separate SDE
- **Leverage Function**: Function that rescales volatility to match market smiles
- **Calibration**: Iterative numerical procedure to lock the model to real prices`,
      duration: 45,
      order: 1,
      lessonType: 'video',
      videoUrl: 'https://www.youtube.com/watch?v=NRonOa7mKLk&t=87s',
      isPublished: true,
      metadata: {
        hasQuiz: true,
        quizQuestions: [
          // Matching questions converted to multiple-choice
          {
            id: 1,
            type: 'multiple-choice',
            question: 'Ensures exact fit to current implied vol surface:',
            options: [
              'Local volatility',
              'Stochastic volatility',
              'Leverage function',
              'Calibration'
            ],
            correctAnswer: 0
          },
          {
            id: 2,
            type: 'multiple-choice',
            question: 'Randomness in volatility driven by a separate SDE:',
            options: [
              'Local volatility',
              'Stochastic volatility',
              'Leverage function',
              'Calibration'
            ],
            correctAnswer: 1
          },
          {
            id: 3,
            type: 'multiple-choice',
            question: 'Function that rescales volatility to match market smiles:',
            options: [
              'Local volatility',
              'Stochastic volatility',
              'Leverage function',
              'Calibration'
            ],
            correctAnswer: 2
          },
          {
            id: 4,
            type: 'multiple-choice',
            question: 'Iterative numerical procedure to lock the model to real prices:',
            options: [
              'Local volatility',
              'Stochastic volatility',
              'Leverage function',
              'Calibration'
            ],
            correctAnswer: 3
          },
          // Local Volatility MCQs
          {
            id: 5,
            type: 'multiple-choice',
            question: 'Local volatility models match the market\'s implied volatility surface because:',
            options: [
              'They assume volatility is constant',
              'They directly derive volatility from option prices using Dupire\'s formula',
              'They rely on jump processes',
              'They use machine learning'
            ],
            correctAnswer: 1
          },
          // Stochastic Volatility MCQs
          {
            id: 6,
            type: 'multiple-choice',
            question: 'In stochastic volatility models like Heston, volatility:',
            options: [
              'Is fixed over time',
              'Follows a deterministic schedule',
              'Follows its own random process (often mean-reverting)',
              'Is determined by market makers'
            ],
            correctAnswer: 2
          },
          // LSV Combination MCQs
          {
            id: 7,
            type: 'multiple-choice',
            question: 'The defining feature of an LSV model is:',
            options: [
              'Only local vol is used',
              'Only stochastic vol is used',
              'Volatility is the product of local vol and stochastic vol processes',
              'Volatility is infinitely large'
            ],
            correctAnswer: 2
          },
          // Calibration MCQs
          {
            id: 8,
            type: 'multiple-choice',
            question: 'Why is LSV calibration considered extremely difficult?',
            options: [
              'It uses no numerical methods',
              'Local vol and stochastic vol components depend on each other in a circular way',
              'It only needs to calibrate spot price',
              'It ignores market smiles and skews'
            ],
            correctAnswer: 1
          },
          // Computation Question
          {
            id: 9,
            type: 'multiple-choice',
            question: 'In an LSV model, the instantaneous diffusion term is: σ_L(S_t, t) * √(V_t) * S_t. What happens if V_t rises sharply?',
            options: [
              'Volatility decreases',
              'Volatility is unaffected',
              'The total volatility increases proportionally to √(V_t)',
              'The local volatility becomes zero'
            ],
            correctAnswer: 2
          }
        ]
      }
    });

    console.log(`✅ Created lesson: ${lesson.title} with quiz`);
    console.log('🎉 Quantitative Finance course added successfully!');
    return course;
  } catch (error) {
    console.error('❌ Error adding Quantitative Finance course:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');
      await addQuantitativeFinanceCourse();
      await sequelize.close();
      console.log('Done!');
      process.exit(0);
    } catch (error) {
      console.error('Failed:', error);
      await sequelize.close();
      process.exit(1);
    }
  })();
}

module.exports = addQuantitativeFinanceCourse;

