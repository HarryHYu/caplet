import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { firstName: 'Codex' } }),
}));

vi.mock('../lib/useReveal', () => ({ useReveal: vi.fn() }));

vi.mock('../services/api', () => ({
  default: {
    getClasses: vi.fn(),
    getDueReviewItems: vi.fn(),
    getStudyPlan: vi.fn(),
    getNextRecommendation: vi.fn(),
    getStudyStreak: vi.fn(),
    getPracticeSession: vi.fn(),
    logEvent: vi.fn(),
  },
}));

import api from '../services/api';
import Dashboard from '../pages/Dashboard';

describe('minimal dashboard study flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    api.getClasses.mockResolvedValue({ teaching: [], student: [] });
    api.getDueReviewItems.mockResolvedValue({ items: [] });
    api.getEconomicsExamSessions?.mockResolvedValue({ sessions: [] });
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
    api.getPracticeSession.mockResolvedValue(null);
  });

  it('makes today’s next planned task the primary action', async () => {
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

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Learn: Macroeconomic management' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Learn: Macroeconomic management.*Start/i })).toHaveAttribute('href', '/study-plan');
    expect(screen.getByRole('heading', { name: 'This week' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'After that' })).toBeInTheDocument();
  });

  it('keeps useful secondary destinations in one quiet resources section', async () => {
    api.getStudyPlan.mockResolvedValue({ studyPlan: { tasks: [] } });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Resources & tools' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Resource library.*Notes, guides/i })).toHaveAttribute('href', '/library');
    expect(screen.getByRole('link', { name: /Essay practice.*improve essays/i })).toHaveAttribute('href', '/essays');
    expect(screen.getByRole('link', { name: /Assessment dates.*exam information/i })).toHaveAttribute('href', '/assessments');
    expect(screen.getByRole('link', { name: /Financial tools.*interest/i })).toHaveAttribute('href', '/money/tools');
    expect(screen.getByRole('button', { name: 'Add Resource library to sidebar' })).toBeInTheDocument();
  });

  it('lets a pinned resource be removed from the sidebar', async () => {
    const user = userEvent.setup();
    api.getStudyPlan.mockResolvedValue({ studyPlan: { tasks: [] } });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    const addButton = await screen.findByRole('button', { name: 'Add Resource library to sidebar' });
    await user.click(addButton);
    const removeButton = screen.getByRole('button', { name: 'Remove Resource library from sidebar' });
    expect(removeButton).toHaveAttribute('aria-pressed', 'true');
    await user.click(removeButton);
    expect(screen.getByRole('button', { name: 'Add Resource library to sidebar' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows the exact subjects selected in the library without adding fallback subjects', async () => {
    localStorage.setItem('caplet:my-subjects', JSON.stringify(['English Extension 1', 'Physics']));
    api.getStudyPlan.mockResolvedValue({ studyPlan: { tasks: [] } });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(await screen.findAllByText('English Extension 1')).not.toHaveLength(0);
    expect(screen.getAllByText('Physics')).not.toHaveLength(0);
    expect(screen.queryByRole('link', { name: 'Economics' })).not.toBeInTheDocument();
    expect(screen.queryByText('Mathematics Advanced')).not.toBeInTheDocument();
  });

  it('makes study-plan setup the primary action when no plan exists', async () => {
    api.getStudyPlan.mockResolvedValue({ studyPlan: null });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Set up your study plan' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Set up your study plan.*Start/i })).toHaveAttribute('href', '/study-plan');
  });

  it('shows weekly momentum without a separate streak card', async () => {
    api.getStudyPlan.mockResolvedValue({ studyPlan: { tasks: [] } });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Weekly activity' })).toBeInTheDocument();
    expect(screen.getByText('2 of 3 planned days completed.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '2 days' })).not.toBeInTheDocument();
  });

  it('shows a countdown to the next exam', async () => {
    // The fixture exam is dated 2026-08-31; pin the clock safely before it
    // so this test doesn't rot the day the calendar catches up (it did).
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-06-01T09:00:00'));
    try {
      localStorage.setItem('caplet:my-subjects', JSON.stringify(['English Advanced', 'Physics']));
      api.getStudyPlan.mockResolvedValue({ studyPlan: { tasks: [] } });

      render(<MemoryRouter><Dashboard /></MemoryRouter>);

      const countdownLink = await screen.findByRole('link', { name: /days.*until English Advanced/i });
      expect(countdownLink).toHaveAttribute('href', '/assessments');
      const upcoming = screen.getByRole('region', { name: 'Upcoming assessments' });
      expect(upcoming).toBeInTheDocument();
      expect(within(upcoming).queryByText('Economics')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses a personalised exam when it is the next assessment', async () => {
    localStorage.setItem('caplet:my-subjects', JSON.stringify(['Biology']));
    localStorage.setItem('caplet:assessment-customisations', JSON.stringify({
      customTasks: [{
        id: 'biology-exam', subject: 'Biology', date: '2026-08-15', dateLabel: '15 Aug',
        group: 'Yearly exams', type: 'Exam', status: 'Preparing', detail: 'Personal task.', source: 'Personalised', custom: true,
      }],
      overrides: {},
      hiddenIds: [],
    }));
    api.getStudyPlan.mockResolvedValue({ studyPlan: { tasks: [] } });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(await screen.findByRole('link', { name: /days.*until Biology/i })).toHaveAttribute('href', '/assessments');
  });

  it('resumes a saved practice session with one clear primary action', async () => {
    api.getStudyPlan.mockResolvedValue({ studyPlan: { tasks: [] } });
    localStorage.setItem('caplet.practice.active.economics', JSON.stringify({ id: 'practice-1' }));
    api.getPracticeSession.mockResolvedValue({ session: { id: 'practice-1', status: 'in_progress', currentIndex: 2, totalQuestions: 10, mode: 'adaptive' } });

    render(<MemoryRouter><Dashboard /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Continue practice' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Resume your Economics practice.*Continue/i })).toHaveAttribute('href', '/practice?subject=economics&session=practice-1&source=dashboard');
    expect(screen.getAllByText('Question 3 of 10').length).toBeGreaterThan(0);
  });
});
