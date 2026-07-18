import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { firstName: 'Codex' } }),
}));

vi.mock('../contexts/CoursesContext', () => ({
  useCourses: () => ({ courses: [], loading: false, hasFetched: true, fetchCourses: vi.fn() }),
}));

vi.mock('../lib/useReveal', () => ({ useReveal: vi.fn() }));

vi.mock('../services/api', () => ({
  default: {
    getUserProgress: vi.fn(),
    getClasses: vi.fn(),
    getSavedSlides: vi.fn(),
    getDueReviewItems: vi.fn(),
    getStudyPlan: vi.fn(),
    getEconomicsExamSessions: vi.fn(),
    getNextRecommendation: vi.fn(),
    getStudyStreak: vi.fn(),
    logEvent: vi.fn(),
  },
}));

import api from '../services/api';
import Dashboard from '../pages/Dashboard';

describe('Dashboard study plan handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getUserProgress.mockResolvedValue({ progress: [] });
    api.getClasses.mockResolvedValue({ teaching: [], student: [] });
    api.getSavedSlides.mockResolvedValue({ savedSlides: [] });
    api.getDueReviewItems.mockResolvedValue({ items: [] });
    api.getEconomicsExamSessions.mockResolvedValue({ sessions: [] });
    api.getNextRecommendation.mockResolvedValue({ recommendation: null });
    api.getStudyStreak.mockResolvedValue({
      momentum: {
        currentStreak: 2,
        todayComplete: false,
        todayCount: 0,
        weekActiveDays: 2,
        weeklyGoal: 3,
        activityDays: [],
      },
    });
  });

  it('surfaces today’s next planned task', async () => {
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    api.getStudyPlan.mockResolvedValue({
      studyPlan: {
        tasks: [{
          id: 'task-1',
          dueDate: today,
          title: 'Learn: Macroeconomic management',
          subjectLabel: 'Economics',
          estimatedMinutes: 45,
          completed: false,
        }],
      },
    });
    api.getNextRecommendation.mockResolvedValue({
      recommendation: {
        mode: 'diagnostic',
        reason: 'Complete a short diagnostic so Caplet can personalise your learning.',
      },
    });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(await screen.findByText(/Today’s next task/i)).toBeInTheDocument();
    expect(screen.getByText('Learn: Macroeconomic management')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Today’s next task.*Learn: Macroeconomic management.*Start now/i })).toHaveAttribute('href', '/study-plan');
    expect(screen.queryByText('Your next best action')).not.toBeInTheDocument();
  });

  it('keeps secondary study tools accessible from the dashboard', async () => {
    api.getStudyPlan.mockResolvedValue({ studyPlan: { tasks: [] } });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Jump back in.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Practice.*focused question set/i })).toHaveAttribute('href', '/practice');
    expect(screen.getByRole('link', { name: /Mastery.*strengthen next/i })).toHaveAttribute('href', '/mastery');
    expect(screen.getByRole('link', { name: /Learning paths.*structured courses and lessons/i })).toHaveAttribute('href', '/courses');
    expect(screen.getByRole('link', { name: /Education tools.*revision, essays/i })).toHaveAttribute('href', '/edutools');
  });

  it('makes study-plan setup the primary action before showing practice recommendations', async () => {
    api.getStudyPlan.mockResolvedValue({ studyPlan: null });
    api.getNextRecommendation.mockResolvedValue({
      recommendation: {
        mode: 'diagnostic',
        reason: 'Complete a short diagnostic so Caplet can personalise your learning.',
      },
    });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(await screen.findByRole('link', { name: /Build your weekly study plan.*Start now/i })).toHaveAttribute('href', '/study-plan');
    expect(screen.getByRole('link', { name: /Set up my plan/i })).toHaveAttribute('href', '/study-plan');
    expect(screen.queryByText('Your next best action')).not.toBeInTheDocument();
  });

  it('shows a meaningful study streak with a useful next action', async () => {
    api.getStudyPlan.mockResolvedValue({ studyPlan: { tasks: [] } });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: '2 days' })).toBeInTheDocument();
    expect(screen.getByText('One meaningful study action today keeps it alive.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Study now/i })).toHaveAttribute('href', '/practice?subject=economics&mode=diagnostic');
  });

});
