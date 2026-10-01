import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

vi.mock('../services/api', () => ({ default: { request: vi.fn() } }));
import api from '../services/api';
import FinSurvey from '../pages/FinSurvey';
import FinSurveyResults from '../pages/FinSurveyResults';

afterEach(() => cleanup());
beforeEach(() => vi.clearAllMocks());

const pick = (groupName, optionName) => {
  const group = screen.getByRole('radiogroup', { name: groupName });
  fireEvent.click(within(group).getByRole('radio', { name: optionName }));
};

describe('FinSurvey (hidden page)', () => {
  it('collects everything, signs the respondent up, and says so', async () => {
    api.request.mockResolvedValue({ ok: true, accountCreated: true, accountExisted: false });
    render(<FinSurvey />);
    // The signup is announced, not sneaky.
    expect(screen.getByText(/sets you up with a free Caplet account/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Pat Example' } });
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: 'pat@example.com' } });
    fireEvent.change(screen.getByLabelText(/Choose a password/i), { target: { value: 'longenough1' } });
    fireEvent.change(screen.getByLabelText(/^School$/i), { target: { value: 'Testville High' } });
    pick('Year level', '11');
    fireEvent.click(within(screen.getByRole('group', { name: 'Commerce subjects' })).getByRole('button', { name: /Economics/ }));
    pick('Overall financial literacy', '2');
    fireEvent.click(within(screen.getByRole('group', { name: 'Money knowledge sources' })).getByRole('button', { name: /Social media/ }));
    pick('School teaches enough', 'Sort of, but not really');
    ['Budgeting & saving', 'Tax (what you pay, how it works)', 'Superannuation', 'Investing & shares', 'Credit, loans & debt']
      .forEach((topic) => pick(topic, '2'));
    pick('School course', 'Definitely');
    pick('Caplet course', 'Yes');
    pick('AI advisor trust', 'Only for basic questions');

    fireEvent.click(screen.getByRole('button', { name: /Submit survey/i }));
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
      aiAdvisorTrust: 'basics',
    });
    expect(body.answers.confidence).toEqual({ budgeting: 2, tax: 2, super: 2, investing: 2, debt: 2 });
    expect(await screen.findByText(/Your Caplet account is live/i)).toBeInTheDocument();
  });

  it('refuses to send a half-finished survey and says what is missing', () => {
    render(<FinSurvey />);
    fireEvent.click(screen.getByRole('button', { name: /Submit survey/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Still needed/i);
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
            aiAdvisorTrust: 'basics', aiThoughts: 'Only if a human checks it.', wishTaught: 'Tax returns.',
          },
        },
        {
          id: 'r2', name: 'Sam S', email: 'sa*@x.io', school: null,
          accountCreated: false, createdAt: '2026-10-01T00:00:00Z',
          answers: {
            yearLevel: '12', commerceSubjects: ['None of these'], selfRating: 4,
            schoolEnough: 'no', confidence: { budgeting: 4, tax: 3, super: 2, investing: 3, debt: 4 },
            wouldTakeSchoolCourse: 'maybe', wouldTakeCapletCourse: 'yes', aiAdvisorTrust: 'no',
          },
        },
      ],
    });
    render(<FinSurveyResults />);
    expect(await screen.findByText('Responses')).toBeInTheDocument();
    expect(screen.getAllByText('3.0').length).toBeGreaterThan(0); // avg self-rating (2+4)/2
    expect(screen.getByText('100%')).toBeInTheDocument(); // both said yes to the course
    expect(screen.getByText('Year 11')).toBeInTheDocument();
    expect(screen.getByText(/Only if a human checks it/)).toBeInTheDocument();
    expect(screen.getByText('pa*@example.com')).toBeInTheDocument(); // masked, never full
    expect(screen.queryByText('pat@example.com')).not.toBeInTheDocument();
  });
});
