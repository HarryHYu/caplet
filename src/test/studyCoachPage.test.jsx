import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { firstName: 'Sean' } }),
}));

vi.mock('../lib/useReveal', () => ({ useReveal: vi.fn() }));

vi.mock('../services/api', () => ({
  default: {
    getStudyStreak: vi.fn(),
    getNextRecommendation: vi.fn(),
    getMastery: vi.fn(),
    getDueReviewItems: vi.fn(),
    getStudyPlan: vi.fn(),
    askTutor: vi.fn(),
    logEvent: vi.fn(),
    getRecommendations: vi.fn(),
    getSyllabusProgress: vi.fn(),
    logRecEvents: vi.fn(),
  },
}));

import api from '../services/api';
import StudyCoach from '../pages/StudyCoach';

function renderPage() {
  return render(<MemoryRouter><StudyCoach /></MemoryRouter>);
}

describe('StudyCoach page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getStudyStreak.mockResolvedValue({ momentum: { currentStreak: 3, todayComplete: false, todayCount: 0, activityDays: [], weekActiveDays: 2, weeklyGoal: 5 } });
    api.getNextRecommendation.mockResolvedValue({ recommendation: { outcome: { id: 'o1', title: 'Market equilibrium' }, reason: 'Your weakest mapped outcome.', subject: 'economics', mode: 'diagnostic' } });
    api.getMastery.mockResolvedValue({ outcomes: [
      { id: 'o1', title: 'Market equilibrium', probability: 0.2 },
      { id: 'o2', title: 'Elasticity', probability: 0.5 },
    ] });
    api.getDueReviewItems.mockResolvedValue({ items: [{ id: 1 }, { id: 2 }] });
    api.getStudyPlan.mockResolvedValue({ studyPlan: { tasks: [] } });
    api.getRecommendations.mockResolvedValue({ recommendations: [] });
    api.getSyllabusProgress.mockResolvedValue({ subject: 'Economics', modules: [], overallHscReadiness: 0, year11Readiness: 0 });
    api.logRecEvents.mockResolvedValue(null);
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('loads real study data into the panels', async () => {
    renderPage();
    // Momentum streak, next-best-action, strengthen-next, and due-review all render from the mocked endpoints.
    expect(await screen.findByText(/3 days/i)).toBeInTheDocument();
    expect(await screen.findByText(/Strengthen Market equilibrium/i)).toBeInTheDocument();
    expect(await screen.findByText(/Strengthen next/i)).toBeInTheDocument();
    expect(await screen.findByText(/2 items due today/i)).toBeInTheDocument();
  });

  it('coach chat sends the question to the tutor and renders the answer', async () => {
    api.askTutor.mockResolvedValue({ unavailable: false, answer: 'Study your weakest outcome first.' });
    renderPage();

    const box = await screen.findByPlaceholderText(/ask your study coach/i);
    fireEvent.change(box, { target: { value: 'what should I do today' } });
    fireEvent.keyDown(box, { key: 'Enter' });

    await waitFor(() => expect(api.askTutor).toHaveBeenCalledTimes(1));
    expect(api.askTutor.mock.calls[0][0].question).toBe('what should I do today');
    expect(await screen.findByText(/weakest outcome first/i)).toBeInTheDocument();
  });

  it('a second question carries the prior exchange as conversation context', async () => {
    api.askTutor
      .mockResolvedValueOnce({ unavailable: false, answer: 'First answer.' })
      .mockResolvedValueOnce({ unavailable: false, answer: 'Second answer.' });
    renderPage();

    const box = await screen.findByPlaceholderText(/ask your study coach/i);
    fireEvent.change(box, { target: { value: 'first question' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await screen.findByText(/first answer/i);

    fireEvent.change(box, { target: { value: 'second question' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(api.askTutor).toHaveBeenCalledTimes(2));

    // The second call must include prior turns as context (short-term memory).
    const secondSlide = api.askTutor.mock.calls[1][0].slide;
    expect(secondSlide?.type).toBe('conversation');
    expect(secondSlide.content).toMatch(/first question/i);
    expect(secondSlide.content).toMatch(/First answer/i);
  });

  it('degrades gracefully when the tutor is unavailable', async () => {
    api.askTutor.mockResolvedValue({ unavailable: true, answer: '', message: 'The tutor is currently unavailable. Please try again later.' });
    renderPage();

    const box = await screen.findByPlaceholderText(/ask your study coach/i);
    fireEvent.change(box, { target: { value: 'help' } });
    fireEvent.keyDown(box, { key: 'Enter' });

    expect(await screen.findByText(/unavailable/i)).toBeInTheDocument();
  });

  it('shows the real reason and a settings link when AI consent is required', async () => {
    api.askTutor.mockResolvedValue({
      unavailable: true,
      answer: '',
      message: 'Add your date of birth in Settings → Profile before enabling optional AI-assisted learning.',
      code: 'age_confirmation_required',
      consentRequired: true,
    });
    renderPage();

    const box = await screen.findByPlaceholderText(/ask your study coach/i);
    fireEvent.change(box, { target: { value: 'help' } });
    fireEvent.keyDown(box, { key: 'Enter' });

    expect(await screen.findByText(/date of birth/i)).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: /open settings/i });
    expect(link.getAttribute('href')).toBe('/settings/profile');
  });
});
