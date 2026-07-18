import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { authState, api } = vi.hoisted(() => ({
  authState: { authenticated: false },
  api: {
    getCourses: vi.fn(),
    getCourseProgressSummaries: vi.fn(),
    getLearningToday: vi.fn(),
    logEvent: vi.fn(),
  },
}));

vi.mock('../services/api', () => ({ default: api }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: authState.authenticated }) }));

import Library from '../pages/Library';

function renderHub() {
  return render(<MemoryRouter><Library /></MemoryRouter>);
}

beforeEach(() => {
  authState.authenticated = false;
  window.localStorage.clear();
  api.getCourses.mockResolvedValue({ courses: [] });
  api.getCourseProgressSummaries.mockResolvedValue({ courses: [] });
  api.getLearningToday.mockResolvedValue({ actions: [] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Learn hub', () => {
  it('gives signed-out students a browse-first hub and diagnostic fallback', async () => {
    renderHub();

    expect(screen.getByRole('heading', { name: 'Learn' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Take the quick Economics diagnostic/i })).toHaveAttribute('href', expect.stringContaining('mode=diagnostic'));
    expect(screen.getByRole('link', { name: /Open Economics/i })).toHaveAttribute('href', '/library/economics');
    await waitFor(() => expect(api.getCourses).toHaveBeenCalledOnce());
    expect(api.getLearningToday).not.toHaveBeenCalled();
  });

  it('shows signed-in next tasks and resumable courses', async () => {
    authState.authenticated = true;
    api.getCourses.mockResolvedValue({ courses: [{ id: 'course-1', title: 'Economics foundations', shortDescription: 'A complete path.', duration: 60, level: 'beginner', modules: [{ lessons: [{ id: 'lesson-1' }] }] }] });
    api.getCourseProgressSummaries.mockResolvedValue({ courses: [{ courseId: 'course-1', status: 'in_progress', progressPercentage: 40, nextLesson: { id: 'lesson-1', title: 'Scarcity' } }] });
    api.getLearningToday.mockResolvedValue({ actions: [{ id: 'study-task:1', type: 'study_task', position: 1, eyebrow: 'Today’s study plan', title: 'Review scarcity', detail: 'Economics · 20 minutes', href: '/practice?mode=daily' }] });

    renderHub();

    expect(await screen.findByRole('link', { name: /Start next/i })).toHaveAttribute('href', '/practice?mode=daily');
    expect(screen.getByText('Review scarcity')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ready to resume Economics foundations/i })).toHaveAttribute('href', '/courses/course-1/lessons/lesson-1');
    const progressIndicators = screen.getAllByRole('progressbar', { name: /Economics foundations progress/i });
    expect(progressIndicators).toHaveLength(2);
    progressIndicators.forEach((progress) => {
      expect(progress).toHaveAttribute('aria-valuenow', '40');
    });
  });

  it('keeps available content visible when personalisation partially fails', async () => {
    authState.authenticated = true;
    api.getCourseProgressSummaries.mockRejectedValue(new Error('offline'));

    renderHub();

    expect(await screen.findByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Economics/i })).toBeInTheDocument();
  });
});
