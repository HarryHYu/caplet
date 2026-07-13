/**
 * Demo fixtures — the single source of demo content for the interactive /demo
 * sandbox. The real page components (Courses, CourseDetail, ModuleDetail,
 * LessonPlayer, Classes, ClassDetail, Editor) render unchanged; this file only
 * supplies the data the ApiService returns while `api.demoMode` is on.
 *
 * Because we reuse the real components, the demo automatically tracks the
 * current design — there are no hand-cloned "Sim" screens to keep in sync.
 */

/* ─────────────────────────── Demo user ─────────────────────────────────── */
export const DEMO_USER = {
  id: 'demo-user',
  firstName: 'Harry',
  lastName: 'Y',
  email: 'harry.y@caplet.demo',
  role: 'instructor',
  dateOfBirth: '1990-01-01',
  bio: 'Commerce teacher exploring Caplet.',
};

/* ─────────────────────────── Slide helpers ─────────────────────────────── */
// All slide objects below conform to the canonical schema (src/lib/slideSchema.js)
// so the real SlideRenderer renders them in variant="player".
// Literal dollar signs are written as "\$" (escaped here as "\\$") so KaTeX
// renders them literally instead of opening math mode.

const flagshipTaxSlides = [
  {
    type: 'text',
    layout: 'hero',
    tone: 'info',
    content:
      '# How income tax works in Australia\n\nAustralia uses a **progressive** tax system: you only pay a higher rate on the slice of income that falls *inside* each bracket — never on your whole salary at once. The first **\\$18,200** you earn each financial year is completely tax-free. This is the *tax-free threshold*.',
    caption: 'Source: Australian Taxation Office (ATO), resident rates 2024–25.',
  },
  {
    type: 'choice',
    mode: 'single',
    question: 'What is the tax-free threshold for Australian residents in 2024–25?',
    options: ['\\$6,000', '\\$18,200', '\\$45,000', '\\$135,000'],
    correctIndices: [1],
    explanation:
      'Residents pay no income tax on the first \\$18,200 of income each financial year; only income above it is taxed.',
  },
  {
    type: 'choice',
    mode: 'truefalse',
    question: 'The Medicare Levy is generally 2% of your taxable income.',
    options: ['True', 'False'],
    correctIndices: [0],
    explanation:
      'Most taxpayers pay a 2% Medicare Levy on top of income tax, with reductions or exemptions for low-income earners.',
  },
  {
    type: 'cards',
    mode: 'carousel',
    cards: [
      { front: 'PAYG withholding', back: 'Pay As You Go — the tax your employer withholds from each pay and sends to the ATO for you.' },
      { front: 'Taxable income', back: 'Assessable income minus allowable deductions. This is the figure your tax is actually calculated on.' },
      { front: 'Tax deduction', back: 'A work-related or investment expense you subtract from income, lowering the tax you owe.' },
      { front: 'Tax offset (rebate)', back: 'A dollar-for-dollar reduction of tax payable, applied after tax is calculated — not to your income.' },
    ],
    caption: 'Tap a card to flip between the term and its definition.',
  },
  {
    type: 'fillblank',
    mode: 'textbox',
    template:
      'In a progressive system, income above \\$18,200 and up to \\$45,000 is taxed at {{0}} cents in the dollar, while most people also pay a Medicare Levy of {{1}}% of taxable income.',
    blanks: [{ answers: ['16'] }, { answers: ['2'] }],
    explanation:
      'For 2024–25 the 18,201–45,000 dollar bracket is taxed at 16c per dollar, and the standard Medicare Levy is 2%.',
  },
  {
    type: 'match',
    pairs: [
      { left: 'Gross income', right: 'Total pay before any tax or deductions are taken out' },
      { left: 'Net (take-home) pay', right: 'What actually lands in your bank account after tax' },
      { left: 'Financial year', right: 'The 1 July to 30 June period the ATO assesses' },
      { left: 'Tax deduction', right: 'A work-related expense that lowers your taxable income' },
    ],
    explanation: 'Knowing gross vs. net pay is the foundation of any realistic budget.',
    caption: 'Drag each definition on the right to line it up with its term.',
  },
  {
    type: 'table',
    headers: 'row',
    rows: [
      ['Taxable income', 'Tax on this income (2024–25)'],
      ['0 – \\$18,200', 'Nil'],
      ['\\$18,201 – \\$45,000', '16c for each \\$1 over \\$18,200'],
      ['\\$45,001 – \\$135,000', '\\$4,288 plus 30c for each \\$1 over \\$45,000'],
      ['\\$135,001 – \\$190,000', '\\$31,288 plus 37c for each \\$1 over \\$135,000'],
      ['\\$190,001 and over', '\\$51,638 plus 45c for each \\$1 over \\$190,000'],
    ],
    caption: 'Resident individual income tax rates, excluding the Medicare Levy. Source: ATO.',
  },
  {
    type: 'chart',
    chartType: 'bar',
    title: 'A sample monthly budget (take-home pay of 4,200 dollars)',
    data: [
      { x: 'Rent', y: 1800 },
      { x: 'Groceries', y: 600 },
      { x: 'Transport', y: 250 },
      { x: 'Utilities', y: 220 },
      { x: 'Savings', y: 630 },
      { x: 'Fun & other', y: 700 },
    ],
    xLabel: 'Category',
    yLabel: 'Dollars per month',
    caption: 'Roughly a 50/30/20 split across needs, wants, and savings.',
  },
];

// Compact-but-real slide sets for the non-flagship lessons so every lesson the
// visitor opens is content-bearing (not an empty shell).
const makeSlides = (title, blurb, term, def) => [
  { type: 'text', layout: 'hero', tone: 'info', content: `# ${title}\n\n${blurb}` },
  {
    type: 'cards',
    mode: 'carousel',
    cards: [
      { front: term, back: def },
      { front: 'Why it matters', back: blurb },
    ],
    caption: 'Flip each card to reveal the answer.',
  },
  {
    type: 'choice',
    mode: 'single',
    question: `Quick check — ${title}`,
    options: [def, 'None of the above', "I'm not sure yet"],
    correctIndices: [0],
    explanation: 'Nice work. Head to the next slide when you are ready.',
  },
];

/* ─────────────────────────── Courses (learner side) ────────────────────── */
// Full course detail objects (getCourse). The list (getCourses) is derived below.

const COURSE_DETAILS = {
  'money-basics': {
    id: 'money-basics',
    title: 'Money Basics',
    level: 'beginner',
    duration: 90,
    shortDescription:
      'Get your money sorted from day one — income, spending, saving and everyday banking, explained without the jargon.',
    description:
      'A friendly starting point for taking control of your money. Read your income, track where it goes, build a budget that sticks, and understand how income tax quietly shapes every payslip.',
    thumbnail: null,
    learningOutcomes: [
      'Read a payslip and understand net vs gross income',
      'Explain how progressive income tax brackets work',
      'Track spending and build a budget that actually sticks',
      'Set up an emergency fund and short-term savings goals',
    ],
    modules: [
      {
        id: 'mod-budgeting',
        title: 'Budgeting Foundations',
        order: 1,
        lessons: [
          { id: 'lesson-income', title: 'Understanding Your Income', order: 1, description: 'Gross vs net, and what actually lands in your account.', slides: makeSlides('Understanding Your Income', 'Your gross pay is the headline number; your net pay is what actually arrives after tax and other deductions.', 'Net pay', 'What lands in your bank account after tax and deductions') },
          { id: 'lesson-expenses', title: 'Tracking Where Money Goes', order: 2, description: 'Needs, wants and the leaks you never noticed.', slides: makeSlides('Tracking Where Money Goes', 'Most people underestimate their discretionary spending by 30–40%. Tracking closes that gap.', 'Discretionary spending', 'The flexible "wants" you can adjust month to month') },
          { id: 'lesson-budget-rule', title: 'The 50/30/20 Rule', order: 3, description: 'A simple split to divide every dollar you earn.', slides: makeSlides('The 50/30/20 Rule', 'Split take-home pay into 50% needs, 30% wants and 20% savings — a simple starting framework.', '50/30/20 rule', 'Needs 50%, wants 30%, savings 20%') },
        ],
      },
      {
        id: 'mod-income-tax',
        title: 'Income & Tax',
        order: 2,
        lessons: [
          { id: 'lesson-income-tax', title: 'How Income Tax Works', order: 1, description: 'Brackets, the tax-free threshold and PAYG — the full picture in one lesson.', slides: flagshipTaxSlides },
          { id: 'lesson-payg', title: 'PAYG & Your Payslip', order: 2, description: 'Why tax comes out before you ever see it.', slides: makeSlides('PAYG & Your Payslip', 'PAYG withholding means your employer sends tax to the ATO from every pay, so there is no big bill at year end.', 'PAYG withholding', 'Tax your employer withholds from each pay and sends to the ATO') },
        ],
      },
      {
        id: 'mod-saving',
        title: 'Saving with Purpose',
        order: 3,
        lessons: [
          { id: 'lesson-goals', title: 'Setting Savings Goals', order: 1, description: 'Turn vague wishes into dated, dollar targets.', slides: makeSlides('Setting Savings Goals', 'A goal with a dollar amount and a date is far more likely to happen than a vague "save more".', 'SMART goal', 'Specific, measurable, and time-bound') },
          { id: 'lesson-emergency-fund', title: 'Building an Emergency Fund', order: 2, description: 'How much to stash for a rainy day, and where.', slides: makeSlides('Building an Emergency Fund', 'Aim for 3–6 months of essential expenses in a separate high-interest savings account.', 'Emergency fund', '3–6 months of expenses kept aside for surprises') },
        ],
      },
    ],
  },
  'super-and-tax': {
    id: 'super-and-tax',
    title: 'Super & Tax',
    level: 'intermediate',
    duration: 120,
    shortDescription:
      'Understand your payslip, PAYG tax, the tax-free threshold and how superannuation quietly grows your future wealth.',
    description:
      'Go a level deeper on the systems that shape your take-home pay and your retirement — the tax brackets, the Medicare Levy, and the magic of compulsory super.',
    thumbnail: null,
    learningOutcomes: [
      'Understand the superannuation guarantee and why it matters early',
      'Read the marginal tax brackets confidently',
      'Compare super funds on fees and performance',
    ],
    modules: [
      {
        id: 'mod-payslip',
        title: 'Your Payslip Decoded',
        order: 1,
        lessons: [
          { id: 'lesson-payslip', title: 'Reading a Payslip', order: 1, description: 'Every line, explained.', slides: makeSlides('Reading a Payslip', 'Gross pay, tax withheld, super, and net pay — a payslip tells a story once you know the lines.', 'Superannuation guarantee', 'The compulsory 11.5% your employer pays into your super') },
          { id: 'lesson-brackets', title: 'Marginal Tax Brackets', order: 2, description: 'Only the top slice is taxed at the top rate.', slides: makeSlides('Marginal Tax Brackets', 'A pay rise never leaves you worse off — only the dollars inside the higher bracket are taxed more.', 'Marginal rate', 'The rate applied to your next dollar of income') },
        ],
      },
      {
        id: 'mod-super',
        title: 'Superannuation',
        order: 2,
        lessons: [
          { id: 'lesson-super-basics', title: 'Super Basics', order: 1, description: 'What it is and why starting early wins.', slides: makeSlides('Super Basics', 'Super is money invested for your retirement. Thanks to compounding, contributions in your 20s do the heaviest lifting.', 'Compounding', 'Earning returns on your past returns, not just your contributions') },
          { id: 'lesson-choosing-fund', title: 'Choosing a Fund', order: 2, description: 'Fees and performance over decades.', slides: makeSlides('Choosing a Fund', 'A 1% difference in fees can cost tens of thousands over a working life. Compare fees and long-term returns.', 'Investment fee', 'The percentage a fund charges each year to manage your money') },
        ],
      },
    ],
  },
  'first-home': {
    id: 'first-home',
    title: 'Buying Your First Home',
    level: 'advanced',
    duration: 150,
    shortDescription:
      'Deposits, LMI, the First Home Super Saver scheme, stamp duty and how much a mortgage really costs across its life.',
    description:
      'The big one. Work through the real numbers behind a first home — the deposit, the government schemes, and what a mortgage actually costs once interest is included.',
    thumbnail: null,
    learningOutcomes: [
      'Estimate the deposit and upfront costs you need',
      'Understand LMI and how to avoid or reduce it',
      'Read a mortgage repayment schedule',
    ],
    modules: [
      {
        id: 'mod-deposit',
        title: 'The Deposit',
        order: 1,
        lessons: [
          { id: 'lesson-deposit', title: 'How Much Deposit?', order: 1, description: '20% and why it matters.', slides: makeSlides('How Much Deposit?', 'A 20% deposit avoids Lenders Mortgage Insurance and unlocks better rates — but schemes can lower the bar.', 'LMI', 'Lenders Mortgage Insurance — a cost lenders add when your deposit is under 20%') },
          { id: 'lesson-fhss', title: 'First Home Super Saver', order: 2, description: 'Saving your deposit inside super.', slides: makeSlides('First Home Super Saver', 'The FHSS scheme lets you save part of your deposit inside super at a lower tax rate.', 'FHSS', 'A scheme to save a home deposit inside super, taxed more lightly') },
        ],
      },
      {
        id: 'mod-mortgage',
        title: 'The Mortgage',
        order: 2,
        lessons: [
          { id: 'lesson-mortgage-basics', title: 'Mortgage Basics', order: 1, description: 'Principal, interest and term.', slides: makeSlides('Mortgage Basics', 'A mortgage is principal plus interest over a term — small rate changes move repayments a lot.', 'Principal', 'The amount you actually borrowed, before interest') },
          { id: 'lesson-repayments', title: 'What It Really Costs', order: 2, description: 'Interest over 30 years adds up.', slides: makeSlides('What It Really Costs', 'Over 30 years, interest can nearly double what you pay for a home. Extra repayments shrink that fast.', 'Amortisation', 'Paying off a loan in regular instalments until the balance is zero') },
        ],
      },
    ],
  },
};

// getCourses() list — derived from the details, trimmed to the fields the card reads.
export const DEMO_COURSES = Object.values(COURSE_DETAILS).map((c) => ({
  id: c.id,
  title: c.title,
  level: c.level,
  duration: c.duration,
  shortDescription: c.shortDescription,
  modules: c.modules.map((m) => ({ id: m.id, lessons: m.lessons.map((l) => ({ id: l.id })) })),
}));

export function getCourseDetail(courseId) {
  return COURSE_DETAILS[courseId] || null;
}

export function getLessonById(courseId, lessonId) {
  const course = COURSE_DETAILS[courseId];
  if (!course) return null;
  for (const m of course.modules) {
    const l = (m.lessons || []).find((x) => String(x.id) === String(lessonId));
    if (l) return l;
  }
  return null;
}

/* ─────────────────────────── Progress ──────────────────────────────────── */
// Money Basics shows ~40% partial completion; the other two are untouched.
const PROGRESS = {
  'money-basics': {
    courseProgress: { totalLessons: 7, completedLessons: 3, progressPercentage: 40, status: 'in_progress' },
    moduleProgress: [
      { moduleId: 'mod-budgeting', totalLessons: 3, completedLessons: 2 },
      { moduleId: 'mod-income-tax', totalLessons: 2, completedLessons: 1 },
      { moduleId: 'mod-saving', totalLessons: 2, completedLessons: 0 },
    ],
    lessonProgress: [
      { lessonId: 'lesson-income', status: 'completed', lastSlideIndex: 0, quizScores: {} },
      { lessonId: 'lesson-expenses', status: 'completed', lastSlideIndex: 0, quizScores: {} },
      { lessonId: 'lesson-income-tax', status: 'completed', lastSlideIndex: 7, quizScores: {} },
      { lessonId: 'lesson-budget-rule', status: 'in_progress', lastSlideIndex: 1, quizScores: {} },
    ],
  },
};

export function getProgress(courseId) {
  return (
    PROGRESS[courseId] || {
      courseProgress: { totalLessons: 0, completedLessons: 0, progressPercentage: 0, status: 'not_started' },
      moduleProgress: [],
      lessonProgress: [],
    }
  );
}

// Dashboard-style aggregate progress (/progress). Kept minimal + safe.
export const DEMO_USER_PROGRESS = { courses: [], lessons: [], stats: { lessonsCompleted: 3, coursesInProgress: 1 } };

/* ─────────────────────────── Saved slides ──────────────────────────────── */
export const DEMO_SAVED_SLIDES = { savedSlides: [] };

/* ─────────────────────────── Classes ───────────────────────────────────── */
const HARRY = { id: 'demo-user', firstName: 'Harry', lastName: 'Y', email: 'harry.y@caplet.demo' };
export const DEMO_STUDENTS = [
  { id: 'stu-mia', firstName: 'Mia', lastName: 'Chen', email: 'mia.chen@school.edu' },
  { id: 'stu-liam', firstName: 'Liam', lastName: 'Novak', email: 'liam.novak@school.edu' },
  { id: 'stu-ava', firstName: 'Ava', lastName: 'Patel', email: 'ava.patel@school.edu' },
  { id: 'stu-noah', firstName: 'Noah', lastName: 'Kim', email: 'noah.kim@school.edu' },
];
export const DEMO_STUDENT = { ...DEMO_STUDENTS[0], role: 'student', bio: 'Year 11 Commerce student.' };
const STUDENTS = DEMO_STUDENTS;

export const DEMO_CLASSES = {
  teaching: [{ id: 'cls-commerce', name: 'Year 11 Commerce A', code: 'CAP-4821', role: 'teacher', createdAt: '2026-02-03T09:00:00.000Z' }],
  student: [],
};

const CLASS_DETAIL = {
  classroom: {
    id: 'cls-commerce',
    name: 'Year 11 Commerce A',
    code: 'CAP-4821',
    description: 'Foundations of personal finance, budgeting, and the Australian tax system.',
    createdBy: 'demo-user',
  },
  membership: { role: 'teacher', isOwner: true },
  members: [
    { ...HARRY, role: 'teacher' },
    { ...STUDENTS[0], role: 'student' },
    { ...STUDENTS[1], role: 'student' },
    { ...STUDENTS[2], role: 'student' },
    { ...STUDENTS[3], role: 'student' },
  ],
  announcements: [
    {
      id: 'ann-1',
      content: 'Welcome to Year 11 Commerce A! Please read the unit outline before our first lesson and bring a calculator on Monday.',
      attachments: [],
      createdAt: '2026-07-06T23:10:00.000Z',
      author: { ...HARRY },
      commentCount: 2,
    },
    {
      id: 'ann-2',
      content: 'Reminder: the ASX excursion permission form is due this Friday. Details in the link below.',
      attachments: [{ url: 'https://www.asx.com.au/education', type: 'link' }],
      createdAt: '2026-07-07T22:00:00.000Z',
      author: { ...HARRY },
      commentCount: 1,
    },
  ],
  assignments: [
    {
      id: 'asg-budget',
      title: 'Budgeting Case Study',
      description: 'Build a monthly budget for the Nguyen household and identify two areas of overspending.',
      dueDate: '2026-07-15T13:00:00.000Z',
      course: { id: 'money-basics', title: 'Money Basics' },
      lesson: { id: 'lesson-budget-rule', title: 'The 50/30/20 Rule' },
      submissions: [
        { id: 'sub-1', studentId: 'stu-mia', status: 'completed', submittedAt: '2026-07-07T05:00:00.000Z', student: { ...STUDENTS[0] } },
        { id: 'sub-2', studentId: 'stu-noah', status: 'completed', submittedAt: '2026-07-07T06:30:00.000Z', student: { ...STUDENTS[3] } },
        { id: 'sub-3', studentId: 'stu-liam', status: 'assigned', submittedAt: null, student: { ...STUDENTS[1] } },
      ],
      commentCount: 2,
    },
    {
      id: 'asg-gst',
      title: 'GST Calculation Worksheet',
      description: 'Complete questions 1–10 calculating GST-inclusive and GST-exclusive prices.',
      dueDate: '2026-07-20T13:00:00.000Z',
      course: null,
      lesson: null,
      submissions: [{ id: 'sub-4', studentId: 'stu-ava', status: 'completed', submittedAt: '2026-07-08T01:00:00.000Z', student: { ...STUDENTS[2] } }],
      commentCount: 1,
    },
  ],
  leaderboard: [
    { userId: 'stu-mia', firstName: 'Mia', lastName: 'Chen', completedCount: 3 },
    { userId: 'stu-noah', firstName: 'Noah', lastName: 'Kim', completedCount: 2 },
    { userId: 'stu-ava', firstName: 'Ava', lastName: 'Patel', completedCount: 1 },
    { userId: 'stu-liam', firstName: 'Liam', lastName: 'Novak', completedCount: 0 },
  ],
};

export function getClassDetail(classId) {
  return String(classId) === 'cls-commerce' ? CLASS_DETAIL : null;
}

const ANNOUNCEMENT_COMMENTS = {
  'ann-1': [
    { id: 'ac-1', content: 'Thanks Mr Y, looking forward to it!', isPrivate: false, createdAt: '2026-07-07T00:15:00.000Z', author: { ...STUDENTS[0] } },
    { id: 'ac-2', content: 'Do we need a scientific calculator or is a basic one fine?', isPrivate: false, createdAt: '2026-07-07T01:40:00.000Z', author: { ...STUDENTS[1] } },
  ],
  'ann-2': [{ id: 'ac-3', content: 'Handed my form in today.', isPrivate: false, createdAt: '2026-07-08T02:05:00.000Z', author: { ...STUDENTS[2] } }],
};
const ASSIGNMENT_COMMENTS = {
  'asg-budget': [
    { id: 'asc-1', content: 'Is the rent figure before or after utilities?', isPrivate: false, targetUserId: null, targetUser: null, createdAt: '2026-07-06T23:50:00.000Z', author: { ...STUDENTS[0] } },
    { id: 'asc-2', content: 'I might submit a day late, is that okay?', isPrivate: true, targetUserId: null, targetUser: null, createdAt: '2026-07-07T03:20:00.000Z', author: { ...STUDENTS[3] } },
  ],
  'asg-gst': [{ id: 'asc-3', content: 'Q7 was tricky but got there!', isPrivate: false, targetUserId: null, targetUser: null, createdAt: '2026-07-08T01:10:00.000Z', author: { ...STUDENTS[2] } }],
};

export function getAnnouncementComments(announcementId) {
  return ANNOUNCEMENT_COMMENTS[announcementId] || [];
}
export function getAssignmentComments(assignmentId) {
  return ASSIGNMENT_COMMENTS[assignmentId] || [];
}

/* ───────────────────── Teacher evidence and next actions ─────────────── */
export const DEMO_CURRICULUM_OUTCOMES = [
  { id: 'outcome-demand', code: 'E11.2', title: 'Explain movements and shifts in demand', subject: 'economics', metadata: { level: 'outcome' } },
  { id: 'outcome-policy', code: 'E11.4', title: 'Analyse the effects of government policy', subject: 'economics', metadata: { level: 'outcome' } },
  { id: 'outcome-finance', code: 'C11.1', title: 'Apply personal finance concepts to decisions', subject: 'economics', metadata: { level: 'outcome' } },
];

export const DEMO_TEACHER_ANALYTICS = {
  classroom: { id: 'cls-commerce', name: 'Year 11 Commerce A' },
  analytics: {
    threshold: 0.6,
    summary: { studentCount: 4, outcomeCount: 3, evidenceCount: 31, studentsNeedingIntervention: 2 },
    heatmap: {
      students: DEMO_STUDENTS.map((student) => ({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
      })),
      outcomes: DEMO_CURRICULUM_OUTCOMES,
      cells: [
        { studentId: 'stu-mia', outcomeId: 'outcome-demand', probability: 0.82, evidenceCount: 4, status: 'secure' },
        { studentId: 'stu-mia', outcomeId: 'outcome-policy', probability: 0.68, evidenceCount: 3, status: 'developing' },
        { studentId: 'stu-mia', outcomeId: 'outcome-finance', probability: 0.88, evidenceCount: 4, status: 'secure' },
        { studentId: 'stu-liam', outcomeId: 'outcome-demand', probability: 0.42, evidenceCount: 3, status: 'needs_support' },
        { studentId: 'stu-liam', outcomeId: 'outcome-policy', probability: 0.55, evidenceCount: 2, status: 'needs_support' },
        { studentId: 'stu-liam', outcomeId: 'outcome-finance', probability: 0.64, evidenceCount: 3, status: 'developing' },
        { studentId: 'stu-ava', outcomeId: 'outcome-demand', probability: 0.76, evidenceCount: 3, status: 'developing' },
        { studentId: 'stu-ava', outcomeId: 'outcome-policy', probability: 0.84, evidenceCount: 3, status: 'secure' },
        { studentId: 'stu-ava', outcomeId: 'outcome-finance', probability: 0.79, evidenceCount: 3, status: 'secure' },
        { studentId: 'stu-noah', outcomeId: 'outcome-demand', probability: 0.51, evidenceCount: 2, status: 'needs_support' },
        { studentId: 'stu-noah', outcomeId: 'outcome-policy', probability: 0.62, evidenceCount: 2, status: 'developing' },
        { studentId: 'stu-noah', outcomeId: 'outcome-finance', probability: 0.71, evidenceCount: 2, status: 'developing' },
      ],
    },
    individualProfiles: [
      {
        student: { id: 'stu-liam', name: 'Liam Novak' },
        averageProbability: 0.54,
        evidenceCount: 8,
        outcomes: [
          { studentId: 'stu-liam', outcomeId: 'outcome-demand', probability: 0.42, evidenceCount: 3, outcome: DEMO_CURRICULUM_OUTCOMES[0] },
          { studentId: 'stu-liam', outcomeId: 'outcome-policy', probability: 0.55, evidenceCount: 2, outcome: DEMO_CURRICULUM_OUTCOMES[1] },
          { studentId: 'stu-liam', outcomeId: 'outcome-finance', probability: 0.64, evidenceCount: 3, outcome: DEMO_CURRICULUM_OUTCOMES[2] },
        ],
      },
    ],
    commonMisconceptions: [
      { code: 'movement-vs-shift', count: 5, studentCount: 2, outcomeIds: ['outcome-demand'] },
      { code: 'policy-lag', count: 3, studentCount: 2, outcomeIds: ['outcome-policy'] },
    ],
    studentsNeedingIntervention: [
      { student: { id: 'stu-liam', name: 'Liam Novak' }, averageProbability: 0.54, weakOutcomeCount: 2, dueOutcomeCount: 1, priority: 'high', reasons: ['low_mastery', 'review_due'] },
      { student: { id: 'stu-noah', name: 'Noah Kim' }, averageProbability: 0.61, weakOutcomeCount: 1, dueOutcomeCount: 0, priority: 'medium', reasons: ['low_mastery'] },
    ],
    recommendedGroups: [
      { id: 'group-demand', outcome: DEMO_CURRICULUM_OUTCOMES[0], studentIds: ['stu-liam', 'stu-noah'], studentCount: 2, averageProbability: 0.465, reason: 'shared_weak_outcome', recommendedMode: 'remediation' },
    ],
  },
};

/* ─────────────────────────── Editor workspace tree ─────────────────────── */
export const DEMO_EDITOR_TREE = {
  courses: [
    {
      id: 'c_money_basics',
      title: 'Money Basics',
      isPublished: true,
      description: 'Everyday money skills for Australian students.',
      shortDescription: 'Budgeting, saving, and smart spending.',
      category: 'personal-finance',
      level: 'beginner',
      isFree: true,
      price: 0,
      workspaceId: 'ws_demo',
      modules: [
        {
          id: 'm_budgeting',
          title: 'Budgeting 101',
          order: 0,
          courseId: 'c_money_basics',
          lessons: [
            {
              id: 'l_what_is_budget',
              title: 'What is a budget?',
              order: 0,
              moduleId: 'm_budgeting',
              slides: [
                { type: 'divider', title: 'Budgeting 101', subtitle: 'Where does your money go?' },
                { type: 'text', content: 'A **budget** is a plan for your money. It tracks what comes in (income) and what goes out (expenses) so you stay in control.', layout: 'default', tone: 'info' },
                { type: 'choice', question: 'What is the main purpose of a budget?', options: ['To spend as much as possible', 'To plan income and expenses', 'To avoid ever saving money'], correctIndices: [1], mode: 'single', explanation: 'A budget helps you plan how your income is spent.' },
              ],
            },
            {
              id: 'l_needs_vs_wants',
              title: 'Needs vs wants',
              order: 1,
              moduleId: 'm_budgeting',
              slides: [
                { type: 'text', content: 'Needs are essentials (rent, food). Wants are nice-to-haves (streaming, takeaway).', layout: 'default', tone: 'neutral' },
                { type: 'match', pairs: [{ left: 'Rent', right: 'Need' }, { left: 'Concert ticket', right: 'Want' }, { left: 'Groceries', right: 'Need' }] },
              ],
            },
          ],
        },
        {
          id: 'm_saving',
          title: 'Saving & Goals',
          order: 1,
          courseId: 'c_money_basics',
          lessons: [
            {
              id: 'l_pay_yourself_first',
              title: 'Pay yourself first',
              order: 0,
              moduleId: 'm_saving',
              slides: [
                { type: 'text', content: 'Set aside savings *before* you spend — treat it like a bill you pay to your future self.', layout: 'callout', tone: 'tip' },
                { type: 'cards', mode: 'carousel', columns: 2, cards: [{ front: 'Emergency fund', back: '3–6 months of expenses set aside for surprises.' }, { front: 'Short-term goal', back: 'Saving for something within a year (e.g. a laptop).' }] },
              ],
            },
          ],
        },
        {
          id: 'm_spending',
          title: 'Smart Spending',
          order: 2,
          courseId: 'c_money_basics',
          lessons: [
            {
              id: 'l_compare_prices',
              title: 'Compare before you buy',
              order: 0,
              moduleId: 'm_spending',
              slides: [
                { type: 'table', headers: 'row', rows: [['Item', 'Store A', 'Store B'], ['Headphones', '\\$79', '\\$65'], ['Charger', '\\$25', '\\$29']], caption: 'Comparison shopping saves money.' },
                { type: 'fillblank', template: 'Comparing prices before buying is called {{0}} shopping.', blanks: [{ answers: ['comparison'] }], mode: 'textbox', explanation: 'Comparison shopping means checking multiple sellers first.' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'c_tax_super',
      title: 'Tax & Super',
      isPublished: false,
      description: 'How income tax and superannuation work in Australia.',
      shortDescription: 'Draft',
      category: 'personal-finance',
      level: 'intermediate',
      isFree: true,
      price: 0,
      workspaceId: 'ws_demo',
      modules: [
        {
          id: 'm_income_tax',
          title: 'Income Tax',
          order: 0,
          courseId: 'c_tax_super',
          lessons: [
            { id: 'l_tax_intro', title: 'Why we pay tax', order: 0, moduleId: 'm_income_tax', slides: [{ type: 'text', content: 'Income tax funds public services like schools, hospitals, and roads.', layout: 'default', tone: 'neutral' }] },
          ],
        },
        { id: 'm_super', title: 'Superannuation', order: 1, courseId: 'c_tax_super', lessons: [] },
      ],
    },
  ],
};

/* ─────────────────────────── AI chat (editor) ──────────────────────────── */
export const AI_CHAT_GENERATE = {
  action: 'generate',
  warnings: [],
  slides: [
    { type: 'text', content: 'Compound interest means you earn interest on your interest over time.', layout: 'default', tone: 'info' },
    { type: 'choice', question: 'Compound interest is best described as…', options: ['Interest on the principal only', 'Interest on principal plus past interest'], correctIndices: [1], mode: 'single', explanation: 'Compounding adds earned interest back to the balance.' },
    { type: 'cards', mode: 'carousel', cards: [{ front: 'Principal', back: 'The original amount you invest or borrow.' }, { front: 'Compounding', back: 'Earning returns on your past returns as well as your principal.' }] },
  ],
};
