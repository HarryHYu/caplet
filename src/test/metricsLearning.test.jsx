import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  default: { getMetrics: vi.fn() },
}));

vi.mock('../lib/useReveal', () => ({ useReveal: vi.fn() }));

vi.mock('recharts', () => {
  const Container = ({ children }) => <div>{children}</div>;
  const Series = ({ name }) => name ? <span>{name}</span> : null;
  return {
    BarChart: Container,
    Bar: Container,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    ResponsiveContainer: Container,
    Cell: () => null,
    LineChart: Container,
    Line: Series,
    Legend: () => null,
  };
});

import api from '../services/api';
import Metrics from '../pages/Metrics';

const METRICS = {
  generatedAt: '2026-07-13T00:00:00.000Z',
  users: { total: 20, newThisWeek: 2, newThisMonth: 4, byRole: { student: 16, instructor: 3, admin: 1 } },
  progress: {
    lessonsCompleted: 30,
    lessonsCompletedThisWeek: 5,
    uniqueUsersWithProgress: 10,
    uniqueUsersCompleted: 5,
    inProgress: 4,
    totalRecords: 40,
    totalMinutesSpent: 300,
  },
  content: { courses: { published: 2, total: 3 }, modules: 8, lessons: { total: 12 }, totalSlides: 50 },
  engagement: { savedSlides: 8, chatMessages: 6 },
  classes: { total: 2, totalMembers: 15 },
  assignments: { total: 3, completions: 4 },
  survey: { totalResponses: 5, averageConfidence: 8 },
  topCourses: [],
  learning: {
    windowDays: 30,
    trendDays: 14,
    funnel: {
      practiceStartedLearners: 12,
      practiceCompletedLearners: 9,
      diagnosticCompletedLearners: 5,
      recommendationDisplayedLearners: 8,
      recommendationAcceptedLearners: 2,
      questionAttemptLearners: 11,
      practiceCompletionRate: 75,
      recommendationAcceptanceRate: 25,
    },
    practiceSessions: { started: 4, completed: 3, completionRate: 75 },
    measurement: {
      orderedJourneysAvailable: true,
      practice: { started: 12, completedAfterStart: 9, rate: 75 },
      recommendations: { started: 8, completedAfterStart: 2, rate: 25 },
      lessons: { started: 6, completedAfterStart: 4, rate: 66.7 },
      weeklyRetention: { previousWeekActiveLearners: 5, currentWeekActiveLearners: 6, retainedLearners: 3, retentionRate: 60 },
    },
    mastery: {
      totalStates: 10,
      masteredStates: 4,
      developingStates: 3,
      needsSupportStates: 3,
      averageConfidence: 74.5,
    },
    dailyTrend: [{
      date: '2026-07-12',
      practiceStartedLearners: 3,
      practiceCompletedLearners: 2,
      questionAttemptLearners: 4,
      recommendationAcceptedLearners: 1,
    }],
  },
};

function renderPage() {
  return render(<MemoryRouter><Metrics /></MemoryRouter>);
}

describe('Metrics learning impact', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getMetrics.mockResolvedValue(METRICS);
  });

  it('shows ordered journeys, weekly retention, mastery and opt-in practice quality', async () => {
    renderPage();

    const section = (await screen.findByRole('heading', { name: 'Learning impact' })).closest('section');
    expect(within(section).getByText('75.0%')).toBeInTheDocument();
    expect(within(section).getByText('9 ordered completions')).toBeInTheDocument();
    expect(within(section).getByText('25.0%')).toBeInTheDocument();
    expect(within(section).getByText('2 accepted after display')).toBeInTheDocument();
    expect(within(section).getByText('60.0%')).toBeInTheDocument();
    expect(within(section).getByText('3 returned from the prior week')).toBeInTheDocument();
    expect(within(section).getByText(/3 of 4 sessions completed/)).toBeInTheDocument();
    expect(within(section).getByRole('progressbar', { name: 'Mastered: 40%' })).toHaveAttribute('aria-valuenow', '40');
    expect(within(section).getByRole('progressbar', { name: 'Needs support: 30%' })).toHaveAttribute('aria-valuenow', '30');
  });

  it('provides exact daily values alongside the visual trend', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Daily learner activity' });

    expect(screen.getByRole('img', { name: /Daily learner activity trend over the last 14 days/ })).toBeInTheDocument();
    fireEvent.click(screen.getByText('View daily values'));

    const table = screen.getByRole('table', { name: 'Daily unique learner activity for the last 14 days' });
    const row = within(table).getByRole('row', { name: /12 July 3 2 4 1/i });
    expect(row).toBeInTheDocument();
  });
});
