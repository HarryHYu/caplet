import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const { authState, api } = vi.hoisted(() => ({
  authState: { authenticated: false },
  api: {
    getCourses: vi.fn(),
    getCourseProgressSummaries: vi.fn(),
    getEconomicsExamSessions: vi.fn(),
    getStudyPlan: vi.fn(),
    getNextRecommendation: vi.fn(),
    getPracticeSession: vi.fn(),
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
  api.getEconomicsExamSessions.mockResolvedValue({ sessions: [] });
  api.getStudyPlan.mockResolvedValue({ studyPlan: null });
  api.getNextRecommendation.mockResolvedValue({ recommendation: null });
  api.getPracticeSession.mockResolvedValue(null);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Resource library hub', () => {
  it('gives signed-out students a browse-first hub and diagnostic fallback', async () => {
    renderHub();

    expect(screen.getByRole('heading', { name: 'Resource library' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Take the quick Economics diagnostic/i })).toHaveAttribute('href', expect.stringContaining('mode=diagnostic'));
    expect(screen.getByRole('link', { name: /Economics.*Year 11–12.*Open/i })).toHaveAttribute('href', '/library/economics');
    await waitFor(() => expect(api.getCourses).toHaveBeenCalledOnce());
    expect(api.getStudyPlan).not.toHaveBeenCalled();
  });

  it('shows every subject with concise cards', async () => {
    renderHub();

    expect(screen.getByRole('heading', { name: 'Subjects' })).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Business Studies')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Economics.*Year 11–12.*Open/i })).toHaveAttribute('href', '/library/economics');
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();
    expect(screen.queryByText(/Placeholder/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'English (EAL/D)' }).closest('[aria-disabled="true"]')).toBeInTheDocument();
    await waitFor(() => expect(api.getCourses).toHaveBeenCalledOnce());
  });

  it('persists chosen subjects for the dashboard', async () => {
    const user = userEvent.setup();
    renderHub();

    await user.click(screen.getByRole('button', { name: 'Choose subjects' }));
    await user.click(screen.getByRole('button', { name: 'Physics' }));

    expect(JSON.parse(localStorage.getItem('caplet:my-subjects'))).toEqual(['Physics']);
    expect(screen.getByRole('button', { name: 'Physics' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows signed-in next tasks and resumable courses', async () => {
    authState.authenticated = true;
    api.getCourses.mockResolvedValue({ courses: [{ id: 'course-1', title: 'Economics foundations', shortDescription: 'A complete path.', duration: 60, level: 'beginner', modules: [{ lessons: [{ id: 'lesson-1' }] }] }] });
    api.getCourseProgressSummaries.mockResolvedValue({ courses: [{ courseId: 'course-1', status: 'in_progress', progressPercentage: 40, nextLesson: { id: 'lesson-1', title: 'Scarcity' } }] });
    api.getStudyPlan.mockResolvedValue({ studyPlan: { tasks: [{ title: 'Review scarcity', reason: 'Due today', resourcePath: '/practice?mode=daily', completed: false, dueDate: '2026-07-18' }] } });

    renderHub();

    expect(await screen.findByRole('link', { name: /Review scarcity/i })).toHaveAttribute('href', '/practice?mode=daily');
    const courseLinks = screen.getAllByRole('link', { name: /Economics foundations/i });
    expect(courseLinks).toHaveLength(2);
    courseLinks.forEach((link) => expect(link).toHaveAttribute('href', '/courses/course-1/lessons/lesson-1'));
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

    expect(await screen.findByText(/unavailable right now/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Economics.*Year 11–12.*Open/i })).toBeInTheDocument();
  });
});
