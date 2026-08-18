import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const { courseState, authState, api } = vi.hoisted(() => ({
  courseState: { courses: [], loading: false, error: null, hasFetched: false, fetchCourses: vi.fn() },
  authState: { authenticated: false },
  api: { getCourseProgressSummaries: vi.fn(), getCourses: vi.fn() },
}));

vi.mock('../contexts/CoursesContext', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useCourses: () => courseState };
});
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: authState.authenticated }) }));
vi.mock('../services/api', () => ({ default: api }));
vi.mock('../lib/useReveal', () => ({ useReveal: vi.fn() }));

import Courses from '../pages/Courses';

const course = (id, title) => ({
  id,
  title,
  shortDescription: 'A path.',
  duration: 30,
  level: 'beginner',
  modules: [{ lessons: [{ id: `${id}-l1` }] }],
});

function renderCourses() {
  return render(<MemoryRouter><Courses /></MemoryRouter>);
}

beforeEach(() => {
  courseState.courses = [];
  courseState.loading = false;
  courseState.error = null;
  courseState.hasFetched = false;
  courseState.fetchCourses = vi.fn().mockResolvedValue({ courses: [] });
  authState.authenticated = false;
  api.getCourseProgressSummaries.mockResolvedValue({ courses: [] });
  api.getCourses.mockResolvedValue({ courses: [] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('Courses search refetch', () => {
  it('shows the full-screen loader only before anything has ever been fetched', () => {
    courseState.loading = true;
    courseState.hasFetched = false;
    const first = renderCourses();

    expect(screen.getByText(/Loading the curriculum/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Search' })).not.toBeInTheDocument();

    first.unmount();

    courseState.loading = true;
    courseState.hasFetched = true;
    renderCourses();

    // Refetch keeps the page — and therefore the search box — mounted.
    expect(screen.queryByText(/Loading the curriculum/i)).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
  });

  it('keeps the search input focused while a refetch is in flight', async () => {
    courseState.hasFetched = true;
    courseState.courses = [course('c1', 'Economics foundations')];
    const view = renderCourses();

    const input = screen.getByRole('textbox', { name: 'Search' });
    input.focus();
    fireEvent.change(input, { target: { value: 'eco' } });
    expect(document.activeElement).toBe(input);

    // The refetch flips `loading` on with the grid still mounted.
    courseState.loading = true;
    view.rerender(<MemoryRouter><Courses /></MemoryRouter>);

    const stillThere = screen.getByRole('textbox', { name: 'Search' });
    expect(stillThere).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(stillThere).toHaveValue('eco');
  });

  it('replaces the grid with skeleton cards (not an empty page) during a refetch', () => {
    courseState.hasFetched = true;
    courseState.loading = true;
    courseState.courses = [course('c1', 'Economics foundations')];
    const { container } = renderCourses();

    const grid = container.querySelector('[data-tour-id="courses-grid"]');
    expect(grid).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('debounces filter-driven refetches instead of firing one per keystroke', async () => {
    vi.useFakeTimers();
    courseState.hasFetched = true;
    renderCourses();

    // The first fetch is immediate — there is nothing on screen to preserve.
    expect(courseState.fetchCourses).toHaveBeenCalledTimes(1);

    const input = screen.getByRole('textbox', { name: 'Search' });
    for (const value of ['e', 'ec', 'eco', 'econ']) {
      fireEvent.change(input, { target: { value } });
      act(() => { vi.advanceTimersByTime(50); });
    }

    expect(courseState.fetchCourses).toHaveBeenCalledTimes(1);

    act(() => { vi.advanceTimersByTime(300); });

    expect(courseState.fetchCourses).toHaveBeenCalledTimes(2);
    expect(courseState.fetchCourses).toHaveBeenLastCalledWith({ level: '', search: 'econ' });
  });

  it('does not raise an unhandled rejection when a refetch fails', async () => {
    courseState.fetchCourses = vi.fn().mockRejectedValue(new Error('network down'));
    const unhandled = vi.fn();
    const node = globalThis.process;
    node.on('unhandledRejection', unhandled);

    renderCourses();
    await waitFor(() => expect(courseState.fetchCourses).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));

    node.off('unhandledRejection', unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });
});
