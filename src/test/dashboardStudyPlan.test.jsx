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

    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect(await screen.findByText(/Today’s next task/i)).toBeInTheDocument();
    expect(screen.getByText('Learn: Macroeconomic management')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open plan/i })).toHaveAttribute('href', '/study-plan');
  });
});
