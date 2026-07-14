import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DemoApp from '../pages/DemoApp';
import api from '../services/api';
import { getDemoSnapshot, resetDemo, resolveDemo } from '../demo/demoResolver';

describe('Demo sandbox API', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/demo');
    resetDemo();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.history.pushState({}, '', '/');
  });

  it('never reaches fetch while the browser is on the Demo entry', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network should not be used'));
    const result = await api.getCourses();

    expect(result.courses.map((course) => course.title)).toContain('Money Basics');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('persists supported local writes and restores the seed on reset', async () => {
    await resolveDemo('POST', '/classes/cls-commerce/announcements', {
      body: JSON.stringify({ content: 'Local Demo announcement' }),
    });

    expect(getDemoSnapshot().classDetails['cls-commerce'].announcements[0].content).toBe('Local Demo announcement');
    resetDemo();
    expect(getDemoSnapshot().classDetails['cls-commerce'].announcements.some((item) => item.content === 'Local Demo announcement')).toBe(false);
  });

  it('fails unsupported requests explicitly', async () => {
    await expect(resolveDemo('GET', '/unfinished-demo-area')).rejects.toMatchObject({
      code: 'DEMO_UNSUPPORTED_REQUEST',
    });
  });
});

describe('school-buyer Demo tour', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/demo');
    resetDemo();
  });

  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', '/');
  });

  it('moves from the overview into the curated author and teacher steps', async () => {
    render(<StrictMode><DemoApp /></StrictMode>);

    expect(screen.getByRole('heading', { name: /See how Caplet.*teacher/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: /Show me how it works/i }));

    expect(await screen.findByText('Viewing as Curriculum author')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('What is a budget?')).toBeInTheDocument();

    expect(screen.getByRole('complementary', { name: 'Caplet guide: Build' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show me the slide editor' }));
    expect(await screen.findByText(/This is the lesson editor/i)).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('.demo-focus-target')).toHaveTextContent('Reading'));

    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(await screen.findByRole('heading', { name: 'Year 11 Commerce A' })).toBeInTheDocument();
    expect(screen.getByText('Viewing as Teacher')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Classwork' })).toHaveClass('bg-accent');
  });

  it('exposes the student and evidence steps without changing the browser entry URL', async () => {
    render(<DemoApp />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Demo menu' }));
    fireEvent.click(screen.getAllByRole('button', { name: /student view/i }).at(-1));

    expect(await screen.findByText('Viewing as Student')).toBeInTheDocument();
    expect((await screen.findAllByText('How Income Tax Works')).length).toBeGreaterThan(0);
    expect(window.location.pathname).toBe('/demo');

    fireEvent.click(screen.getByRole('button', { name: 'Open Demo menu' }));
    fireEvent.click(screen.getAllByRole('button', { name: /Help the students/i }).at(-1));
    expect(await screen.findByRole('heading', { name: 'Class learning.' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /Mastery probability/i })).toBeInTheDocument();
  });

  it('has no automated accessibility violations on the overview', async () => {
    const { container } = render(<DemoApp />);
    await waitFor(() => expect(screen.getByRole('main')).toBeInTheDocument());
    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
