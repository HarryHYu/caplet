import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('../services/api', () => ({ default: { request: vi.fn() } }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: false, user: null, loading: false }) }));
import api from '../services/api';
import FinSurvey from '../pages/FinSurvey';
import FinSurveyResults from '../pages/FinSurveyResults';

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

const pick = (groupName, optionName) => {
  const group = screen.getByRole('radiogroup', { name: groupName });
  fireEvent.click(within(group).getByRole('radio', { name: optionName }));
};
const next = () => fireEvent.click(screen.getByRole('button', { name: /Next|Submit/ }));

describe('FinSurvey (hidden page)', () => {
  it('walks the stages, signs the respondent up, and says so', async () => {
    api.request.mockResolvedValue({ ok: true, accountCreated: true, accountExisted: false });
    render(<FinSurvey />);
    // The signup is announced on the splash, not sneaky.
    expect(screen.getByText(/free Caplet account/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Let's go/i }));

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Pat Example' } });
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: 'pat@example.com' } });
    fireEvent.change(screen.getByLabelText(/Choose a password/i), { target: { value: 'longenough1' } });
    fireEvent.change(screen.getByLabelText(/^School$/i), { target: { value: 'Testville High' } });
    pick('Year level', '11');
    next();
    fireEvent.click(within(screen.getByRole('group', { name: 'Commerce subjects' })).getByRole('button', { name: /Economics/ }));
    next();
    pick('Overall financial literacy', '2');
    fireEvent.click(within(screen.getByRole('group', { name: 'Money knowledge sources' })).getByRole('button', { name: /Social media/ }));
    pick('School teaches enough', 'Sort of, but not really');
    next();
    ['Budgeting & saving', 'Tax (what you pay, how it works)', 'Superannuation', 'Investing & shares', 'Credit, loans & debt']
      .forEach((topic) => pick(topic, '2'));
    next();
    // Pop quiz: first answer right, the rest "Not sure"; can't skip a question.
    next();
    expect(screen.getByRole('alert')).toHaveTextContent(/Not sure/);
    pick('50/30/20 rule', '$160');
    ['Inflation vs savings', 'Tax brackets', 'Financial year end', 'Who pays super', 'Accessing super'].forEach((q) => pick(q, 'Not sure'));
    next();
    ['Diversification', 'Compound growth', 'Minimum repayments', 'HECS-HELP repayments'].forEach((q) => pick(q, 'Not sure'));
    next();
    pick('School course', 'Definitely');
    pick('Online course', 'Yes');
    next();
    expect(screen.queryByText(/\bAI\b/)).not.toBeInTheDocument();
    pick('Finance industry view', '3');
    fireEvent.click(within(screen.getByRole('group', { name: 'Finance industry words' })).getByRole('button', { name: /Confusing/ }));
    pick('Finance career', 'Maybe');
    next(); // submit

    await waitFor(() => expect(api.request).toHaveBeenCalled());
    const [endpoint, options] = api.request.mock.calls[0];
    expect(endpoint).toBe('/fin-survey');
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({ name: 'Pat Example', email: 'pat@example.com', school: 'Testville High' });
    expect(body.answers).toMatchObject({
      yearLevel: '11',
      commerceSubjects: ['Economics'],
      selfRating: 2,
      schoolEnough: 'sort-of',
      wouldTakeCapletCourse: 'yes',
      industryView: 3,
      industryWords: ['Confusing'],
      financeCareer: 'maybe',
    });
    expect(body.answers).not.toHaveProperty('aiAdvisorTrust');
    expect(body.answers.quiz).toMatchObject({ budget1: 'c', tax1: 'unsure', debt2: 'unsure' });
    expect(Object.keys(body.answers.quiz)).toHaveLength(10);
    expect(await screen.findByText('Pop quiz: 1/10')).toBeInTheDocument();
    expect(body.answers.confidence).toEqual({ budgeting: 2, tax: 2, super: 2, investing: 2, debt: 2 });
    expect(await screen.findByText(/Your Caplet account is live/i)).toBeInTheDocument();
  });

  it('refuses to advance a half-finished stage and says what is missing', () => {
    render(<FinSurvey />);
    fireEvent.click(screen.getByRole('button', { name: /Let's go/i }));
    next();
    expect(screen.getByRole('alert')).toHaveTextContent(/Still needs/i);
    expect(api.request).not.toHaveBeenCalled();
  });
});

describe('FinSurveyResults (hidden page)', () => {
  it('renders tiles, breakdowns, quotes and the masked respondent table', async () => {
    api.request.mockResolvedValue({
      total: 2,
      accountsCreated: 1,
      responses: [
        {
          id: 'r1', name: 'Pat Example', email: 'pa*@example.com', school: 'Testville High',
          accountCreated: true, createdAt: '2026-10-01T00:00:00Z',
          answers: {
            yearLevel: '11', commerceSubjects: ['Economics'], selfRating: 2,
            learnedFrom: ['Social media'], schoolEnough: 'no',
            confidence: { budgeting: 2, tax: 1, super: 1, investing: 2, debt: 2 },
            wouldTakeSchoolCourse: 'definitely', wouldTakeCapletCourse: 'yes',
            quiz: { budget1: 'c', budget2: 'c', tax1: 'b', tax2: 'a', super1: 'a', super2: 'unsure', invest1: 'a', invest2: 'b', debt1: 'b', debt2: 'b' },
            industryView: 2, industryWords: ['Confusing', 'Greedy'], financeCareer: 'maybe',
            industryThoughts: 'Feels built for people who already have money.', wishTaught: 'Tax returns.',
          },
        },
        {
          id: 'r2', name: 'Sam S', email: 'sa*@x.io', school: null,
          accountCreated: false, createdAt: '2026-10-01T00:00:00Z',
          answers: {
            yearLevel: '12', commerceSubjects: ['None of these'], selfRating: 4,
            schoolEnough: 'no', confidence: { budgeting: 4, tax: 3, super: 2, investing: 3, debt: 4 },
            wouldTakeSchoolCourse: 'maybe', wouldTakeCapletCourse: 'yes', industryView: 4, financeCareer: 'yes',
          },
        },
      ],
    });
    render(<FinSurveyResults />);
    expect(await screen.findByText('Responses')).toBeInTheDocument();
    expect(screen.getAllByText('3.0').length).toBeGreaterThan(0); // avg self-rating (2+4)/2
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0); // both said yes to the course
    expect(screen.getByText('Y11')).toBeInTheDocument(); // year-level column axis
    expect(screen.getByText(/built for people who already have money/)).toBeInTheDocument();
    expect(screen.getByText('Overall view of the finance industry')).toBeInTheDocument();
    expect(screen.getByText('Feeling vs knowing')).toBeInTheDocument();
    expect(screen.getByText('8.0/10')).toBeInTheDocument(); // only r1 took the quiz
    expect(screen.getByText('Would consider a finance career')).toBeInTheDocument();
    expect(screen.queryByText(/AI financial advi/i)).not.toBeInTheDocument();
    expect(screen.getByText('pa*@example.com')).toBeInTheDocument(); // masked, never full
    expect(screen.queryByText('pat@example.com')).not.toBeInTheDocument();
    // Every chart has a table twin.
    fireEvent.click(screen.getAllByRole('button', { name: 'Table' })[0]);
    expect(screen.getByText('Not even close')).toBeInTheDocument();
  });
});
