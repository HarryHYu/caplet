import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LearningCard } from '../components/learning/LearningChrome';

const { courseState, authState, api } = vi.hoisted(() => ({
  courseState: { courses: [], loading: false, error: null, fetchCourses: vi.fn() },
  authState: { authenticated: false },
  api: { getCourseProgressSummaries: vi.fn() },
}));

vi.mock('../contexts/CoursesContext', () => ({ useCourses: () => courseState }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: authState.authenticated }) }));
vi.mock('../services/api', () => ({ default: api }));
vi.mock('../lib/useReveal', () => ({ useReveal: vi.fn() }));

import Courses from '../pages/Courses';

function renderCourses() {
  return render(<MemoryRouter><Courses /></MemoryRouter>);
}

beforeEach(() => {
  courseState.courses = [];
  courseState.loading = false;
  courseState.error = null;
  authState.authenticated = false;
  api.getCourseProgressSummaries.mockResolvedValue({ courses: [] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Learning path states', () => {
  it('distinguishes a genuinely empty catalogue from filtered no-results', () => {
    renderCourses();

    expect(screen.getByText(/Start with Economics while new paths are being prepared/i)).toBeInTheDocument();
    expect(screen.queryByText(/No learning paths match those filters/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Search' }), { target: { value: 'macroeconomics' } });

    expect(screen.getByText(/No learning paths match those filters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });

  it('presents completed paths with labelled progress', async () => {
    authState.authenticated = true;
    courseState.courses = [{
      id: 'course-1',
      title: 'Economics foundations',
      shortDescription: 'A complete path.',
      duration: 60,
      level: 'beginner',
      modules: [{ lessons: [{ id: 'lesson-1' }] }],
    }];
    api.getCourseProgressSummaries.mockResolvedValue({
      courses: [{ courseId: 'course-1', status: 'completed', progressPercentage: 100 }],
    });

    renderCourses();

    await waitFor(() => expect(screen.getByText('Complete')).toBeInTheDocument());
    expect(screen.getByRole('progressbar', { name: 'Economics foundations progress' })).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByRole('link', { name: /Economics foundations/i })).toHaveAttribute('href', '/courses/course-1');
  });

  it('uses links for available cards and a disabled container for unavailable cards', () => {
    const { rerender } = render(<MemoryRouter><LearningCard title="Available topic" href="/topic" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Available topic/i })).toHaveAttribute('href', '/topic');

    rerender(<MemoryRouter><LearningCard title="Future topic" status="Coming next" /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: /Future topic/i })).not.toBeInTheDocument();
    expect(screen.getByText('Future topic').closest('[aria-disabled="true"]')).toBeInTheDocument();
  });
});
