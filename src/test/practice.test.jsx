import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  default: {
    getNextRecommendation: vi.fn(),
    createPracticeSession: vi.fn(),
    getPracticeSession: vi.fn(),
    savePracticeDraft: vi.fn(),
    acknowledgePracticeFeedback: vi.fn(),
    submitPracticeAnswer: vi.fn(),
    completePracticeSession: vi.fn(),
    logEvent: vi.fn(),
  },
}));

import api from '../services/api';
import Practice from '../pages/Practice';

const QUESTION_ONE = {
  id: 'question-1',
  prompt: 'Which measure tracks changes in the general price level?',
  responseType: 'multiple_choice',
  difficulty: 'foundation',
  marks: 1,
  options: ['Consumer Price Index', 'Unemployment rate', 'Terms of trade'],
  outcomes: [{ id: 'outcome-1', code: 'E12.3', title: 'Price stability' }],
};

const QUESTION_TWO = {
  id: 'question-2',
  prompt: 'Explain one way higher interest rates can reduce inflation.',
  responseType: 'short_answer',
  difficulty: 'exam',
  marks: 2,
  outcomes: [{ id: 'outcome-2', code: 'E12.4', title: 'Monetary policy' }],
};

const SESSION = {
  id: 'session-1',
  mode: 'weak-topic',
  status: 'in_progress',
  subject: 'economics',
  currentIndex: 0,
  totalQuestions: 2,
  score: 0,
  maxScore: 3,
  questions: [QUESTION_ONE, QUESTION_TWO],
  currentQuestion: QUESTION_ONE,
};

const FIRST_RESULT = {
  correct: false,
  score: 0,
  maxScore: 1,
  feedback: {
    summary: 'Keep building this outcome',
    explanation: 'The CPI is the main measure of changes in the general price level.',
    misconception: 'The unemployment rate measures labour underutilisation, not prices.',
    improvement: 'Link the indicator to the exact economic objective.',
    modelAnswer: 'The Consumer Price Index tracks price changes in a representative basket.',
    outcome: { id: 'outcome-1', code: 'E12.3', title: 'Price stability' },
  },
  nextQuestion: QUESTION_TWO,
  session: { ...SESSION, currentIndex: 1, currentQuestion: QUESTION_TWO },
};

const COMPLETE_RESULT = {
  session: { ...SESSION, status: 'completed', currentIndex: 2, score: 1, currentQuestion: null },
  summary: {
    score: 1,
    maxScore: 3,
    accuracy: 33,
    evidenceCreated: 2,
    masteryChanges: [],
    nextRecommendation: { mode: 'due-review', reason: 'Review this outcome tomorrow.' },
  },
};

function renderPage(route = '/practice?subject=economics') {
  return render(<MemoryRouter initialEntries={[route]}><Practice /></MemoryRouter>);
}

describe('Practice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    api.getNextRecommendation.mockResolvedValue({ recommendation: null });
    api.createPracticeSession.mockResolvedValue({ session: SESSION });
    api.getPracticeSession.mockResolvedValue({ session: SESSION });
    api.savePracticeDraft.mockResolvedValue({ session: SESSION });
    api.acknowledgePracticeFeedback.mockResolvedValue({ session: SESSION });
    api.submitPracticeAnswer.mockResolvedValue(FIRST_RESULT);
    api.completePracticeSession.mockResolvedValue(COMPLETE_RESULT);
  });

  it('offers all six modes and completes the accessible answer-feedback-retry loop', async () => {
    renderPage('/practice?subject=economics&mode=weak-topic&outcomeId=outcome-1');

    expect(await screen.findByRole('heading', { name: 'Practice.' })).toBeInTheDocument();
    for (const mode of ['Quick diagnostic', 'Daily five', 'Weak-topic practice', 'Timed exam practice', 'Due revision', 'Teacher assigned']) {
      expect(screen.getByRole('button', { name: `Start ${mode}` })).toBeInTheDocument();
    }

    expect(await screen.findByText(QUESTION_ONE.prompt)).toBeInTheDocument();
    expect(api.createPracticeSession).toHaveBeenCalledWith({ mode: 'weak-topic', subject: 'economics', outcomeId: 'outcome-1', source: 'practice' });

    fireEvent.click(screen.getByRole('radio', { name: 'Unemployment rate' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Check answer/i })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /Check answer/i }));
    expect(await screen.findByRole('heading', { name: 'Keep building this outcome' })).toBeInTheDocument();
    expect(screen.getByText(/labour underutilisation/i)).toBeInTheDocument();
    expect(screen.getByText(/Link the indicator/i)).toBeInTheDocument();
    expect(screen.getByText(/representative basket/i)).toBeInTheDocument();
    expect(screen.getByText('E12.3 · Price stability')).toBeInTheDocument();
    expect(api.submitPracticeAnswer).toHaveBeenCalledWith('session-1', expect.objectContaining({
      questionId: 'question-1',
      answer: 'Unemployment rate',
      retry: false,
      idempotencyKey: expect.any(String),
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Try this again' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Consumer Price Index' }));
    fireEvent.click(screen.getByRole('button', { name: /Check answer/i }));
    await waitFor(() => expect(api.submitPracticeAnswer).toHaveBeenLastCalledWith('session-1', expect.objectContaining({
      questionId: 'question-1',
      retry: true,
    })));

    fireEvent.click(await screen.findByRole('button', { name: 'Try a related question' }));
    expect(await screen.findByText(QUESTION_TWO.prompt)).toBeInTheDocument();
    expect(screen.getByLabelText('Your answer')).toHaveFocus();
  });

  it('resumes a saved session after an interruption', async () => {
    window.localStorage.setItem('caplet.practice.active.economics', JSON.stringify({ id: 'session-1', mode: 'weak-topic' }));
    renderPage();

    expect(await screen.findByText('Ready to resume')).toBeInTheDocument();
    expect(api.getPracticeSession).toHaveBeenCalledWith('session-1');
    fireEvent.click(screen.getByRole('button', { name: /Continue session/i }));
    expect(await screen.findByText(QUESTION_ONE.prompt)).toBeInTheDocument();
  });

  it('finishes the last question and shows a durable learning summary', async () => {
    const singleSession = { ...SESSION, totalQuestions: 1, maxScore: 1, questions: [QUESTION_ONE], currentQuestion: QUESTION_ONE };
    api.createPracticeSession.mockResolvedValue({ session: singleSession });
    api.submitPracticeAnswer.mockResolvedValue({
      ...FIRST_RESULT,
      correct: true,
      score: 1,
      nextQuestion: null,
      session: { ...singleSession, currentIndex: 1, score: 1, currentQuestion: null },
    });
    api.completePracticeSession.mockResolvedValue({
      ...COMPLETE_RESULT,
      session: { ...singleSession, status: 'completed', currentIndex: 1, score: 1, currentQuestion: null },
      summary: { ...COMPLETE_RESULT.summary, score: 1, maxScore: 1, accuracy: 100, evidenceCreated: 1 },
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Start Daily five' }));
    fireEvent.click(await screen.findByRole('radio', { name: 'Consumer Price Index' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Check answer/i })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: /Check answer/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Finish session' }));

    expect(await screen.findByRole('heading', { name: 'Evidence earned.' })).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(api.completePracticeSession).toHaveBeenCalledWith('session-1');
    expect(window.localStorage.getItem('caplet.practice.active.economics')).toBeNull();
  });

  it('shows an empty state when a mode has no ready questions', async () => {
    api.createPracticeSession.mockResolvedValue({
      session: { ...SESSION, id: 'empty-session', totalQuestions: 0, questions: [], currentQuestion: null },
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Start Due revision' }));
    expect(await screen.findByText('No questions are ready for this session.')).toBeInTheDocument();
  });

  it('keeps mode selection recoverable after a start error', async () => {
    api.createPracticeSession.mockRejectedValueOnce(new Error('No assigned work is due.'));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Start Teacher assigned' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No assigned work is due.');

    fireEvent.click(screen.getByRole('button', { name: 'Start Quick diagnostic' }));
    expect(await screen.findByText(QUESTION_ONE.prompt)).toBeInTheDocument();
  });

  it('shows a countdown for timed exam practice', async () => {
    api.createPracticeSession.mockResolvedValue({
      session: { ...SESSION, mode: 'timed-exam', startedAt: new Date().toISOString() },
    });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Start Timed exam practice' }));
    expect(await screen.findByLabelText(/(?:39:5\d|40:00) remaining/)).toBeInTheDocument();
  });
});
