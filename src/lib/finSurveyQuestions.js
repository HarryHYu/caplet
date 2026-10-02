/** Shared between the hidden survey page and its results page. */
export const CONFIDENCE_TOPICS = [
    { key: 'budgeting', label: 'Budgeting & saving' },
    { key: 'tax', label: 'Tax (what you pay, how it works)' },
    { key: 'super', label: 'Superannuation' },
    { key: 'investing', label: 'Investing & shares' },
    { key: 'debt', label: 'Credit, loans & debt' },
];

export const NOT_SURE = 'unsure';

// Two knowledge checks per confidence topic, so the results can compare how
// confident students feel with what they actually know. Every question has a
// "Not sure" option so nobody is pushed into guessing. Kept free of figures
// that change each budget (tax brackets, the super guarantee rate).
export const QUIZ = [
    {
        id: 'budget1', topic: 'budgeting', short: '50/30/20 rule',
        prompt: 'You take home $800 a month and follow the 50/30/20 budgeting rule. How much goes to savings?',
        options: [{ key: 'a', label: '$400' }, { key: 'b', label: '$240' }, { key: 'c', label: '$160' }],
        answer: 'c',
    },
    {
        id: 'budget2', topic: 'budgeting', short: 'Inflation vs savings',
        prompt: 'Your savings account pays 2% interest a year and prices rise 4% a year. After a year, your savings can buy…',
        options: [{ key: 'a', label: 'More than today' }, { key: 'b', label: 'Exactly the same' }, { key: 'c', label: 'Less than today' }],
        answer: 'c',
    },
    {
        id: 'tax1', topic: 'tax', short: 'Tax brackets',
        prompt: 'A pay rise pushes part of your income into a higher tax bracket. What happens?',
        options: [
            { key: 'a', label: 'All of your income is taxed at the higher rate' },
            { key: 'b', label: 'Only the income above the threshold is taxed at the higher rate' },
            { key: 'c', label: 'You take home less money than before the pay rise' },
        ],
        answer: 'b',
    },
    {
        id: 'tax2', topic: 'tax', short: 'Financial year end',
        prompt: 'When does the Australian financial year end?',
        options: [{ key: 'a', label: '31 December' }, { key: 'b', label: '31 March' }, { key: 'c', label: '30 June' }],
        answer: 'c',
    },
    {
        id: 'super1', topic: 'super', short: 'Who pays super',
        prompt: 'If you have a job, who normally pays the compulsory superannuation into your fund?',
        options: [
            { key: 'a', label: 'Your employer, on top of your wage' },
            { key: 'b', label: 'You, out of your take-home pay' },
            { key: 'c', label: 'The government' },
        ],
        answer: 'a',
    },
    {
        id: 'super2', topic: 'super', short: 'Accessing super',
        prompt: 'Generally, when can you take money out of your super?',
        options: [
            { key: 'a', label: 'Any time you like' },
            { key: 'b', label: 'Once you turn 18' },
            { key: 'c', label: 'Not until retirement age (around 60), apart from rare exceptions' },
        ],
        answer: 'c',
    },
    {
        id: 'invest1', topic: 'investing', short: 'Diversification',
        prompt: 'Compared with putting all your money into one company’s shares, an index fund (ETF) is usually…',
        options: [
            { key: 'a', label: 'Less risky, because your money is spread across many companies' },
            { key: 'b', label: 'More risky, because you own more companies' },
            { key: 'c', label: 'Guaranteed never to lose money' },
        ],
        answer: 'a',
    },
    {
        id: 'invest2', topic: 'investing', short: 'Compound growth',
        prompt: 'You invest $1,000 and it grows 10% a year, with the growth reinvested. After 2 years you have…',
        options: [{ key: 'a', label: '$1,200' }, { key: 'b', label: '$1,210' }, { key: 'c', label: '$1,100' }],
        answer: 'b',
    },
    {
        id: 'debt1', topic: 'debt', short: 'Minimum repayments',
        prompt: 'If you only ever pay the minimum on a credit card, what happens?',
        options: [
            { key: 'a', label: 'The interest stops building up' },
            { key: 'b', label: 'It takes much longer to clear and you pay a lot more interest' },
            { key: 'c', label: 'Your debt is cleared within a year' },
        ],
        answer: 'b',
    },
    {
        id: 'debt2', topic: 'debt', short: 'HECS-HELP repayments',
        prompt: 'When do you have to start repaying a HECS-HELP (uni) debt?',
        options: [
            { key: 'a', label: 'Straight after you finish your degree' },
            { key: 'b', label: 'Once your income goes above a set threshold' },
            { key: 'c', label: 'Never — it is wiped after 5 years' },
        ],
        answer: 'b',
    },
];

export const quizScore = (quiz = {}) => QUIZ.reduce((n, q) => n + (quiz[q.id] === q.answer ? 1 : 0), 0);
