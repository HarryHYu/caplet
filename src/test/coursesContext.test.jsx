import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';

const { api } = vi.hoisted(() => ({ api: { getCourses: vi.fn() } }));
vi.mock('../services/api', () => ({ default: api }));

import { CoursesProvider, useCourses } from '../contexts/CoursesContext';

const course = (id, title) => ({ id, title });

function ContextProbe({ onReady }) {
  const value = useCourses();
  onReady(value);
  return <ul>{value.courses.map((item) => <li key={item.id}>{item.title}</li>)}</ul>;
}

function renderProvider() {
  const ref = { current: null };
  render(<CoursesProvider><ContextProbe onReady={(value) => { ref.current = value; }} /></CoursesProvider>);
  return ref;
}

beforeEach(() => {
  api.getCourses.mockReset();
  api.getCourses.mockResolvedValue({ courses: [] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CoursesProvider', () => {
  it('lets a stale in-flight response lose to a newer one', async () => {
    const deferred = [];
    api.getCourses.mockImplementation(() => new Promise((resolve) => { deferred.push(resolve); }));

    const value = renderProvider();

    let slow;
    let fast;
    await act(async () => {
      slow = value.current.fetchCourses({ search: 'e' });
      fast = value.current.fetchCourses({ search: 'economics' });
    });
    expect(deferred).toHaveLength(2);

    // The newer request settles first; the stale one arrives late and must not
    // overwrite it.
    await act(async () => {
      deferred[1]({ courses: [course('new', 'Newer result')] });
      await fast;
      deferred[0]({ courses: [course('old', 'Stale result')] });
      await slow;
    });

    expect(screen.getByText('Newer result')).toBeInTheDocument();
    expect(screen.queryByText('Stale result')).not.toBeInTheDocument();
  });

  it('starts with hasFetched false and flips it after the first fetch settles', async () => {
    const value = renderProvider();

    expect(value.current.hasFetched).toBe(false);
    expect(value.current.loading).toBe(false);

    await act(async () => { await value.current.fetchCourses(); });

    expect(value.current.hasFetched).toBe(true);
    expect(value.current.loading).toBe(false);
  });

  it('surfaces the error message and still rejects for the caller', async () => {
    api.getCourses.mockRejectedValue(new Error('network down'));
    const value = renderProvider();

    let rejected = false;
    await act(async () => {
      await value.current.fetchCourses().catch(() => { rejected = true; });
    });

    expect(rejected).toBe(true);
    expect(value.current.error).toBe('network down');
    expect(value.current.hasFetched).toBe(true);
  });

  it('normalises the several shapes the courses endpoint can return', async () => {
    const value = renderProvider();

    for (const payload of [
      [course('a', 'Bare array')],
      { courses: [course('a', 'Bare array')] },
      { data: { courses: [course('a', 'Bare array')] } },
      { data: [course('a', 'Bare array')] },
      { rows: [course('a', 'Bare array')] },
    ]) {
      api.getCourses.mockResolvedValueOnce(payload);
      await act(async () => { await value.current.fetchCourses(); });
      expect(value.current.courses).toHaveLength(1);
    }

    api.getCourses.mockResolvedValueOnce({ unexpected: true });
    await act(async () => { await value.current.fetchCourses(); });
    expect(value.current.courses).toEqual([]);
  });
});
