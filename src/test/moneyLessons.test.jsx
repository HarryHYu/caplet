import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MoneyLearn, { MoneyLesson } from '../pages/MoneyLearn';
import { moneyCourses, moneyLessons } from '../data/moneyLessons';
import { getRouteMeta } from '../config/routeMeta';
import { moneyNavigation, isProductNavItemActive } from '../config/productNavigation';

afterEach(cleanup);

function openLesson(slug) {
  return render(<MemoryRouter initialEntries={[`/money/learn/${slug}`]}><Routes><Route path="/money/learn/:slug" element={<MoneyLesson />} /></Routes></MemoryRouter>);
}

describe('Money lesson library', () => {
  it('offers larger lesson text, a glossary shortcut and honest language guidance', async () => {
    const user = userEvent.setup();
    const { container } = openLesson('reading-a-payslip');
    await user.click(screen.getByRole('button', { name: 'Larger text' }));
    expect(container.querySelector('article')).toHaveClass('text-xl');
    await user.click(screen.getByRole('button', { name: 'Standard text' }));
    expect(container.querySelector('article')).toHaveClass('text-base');
    expect(screen.getByRole('link', { name: 'Money words' })).toHaveAttribute('href', '#money-glossary');
    expect(screen.getByRole('heading', { name: 'Glossary' })).toHaveAttribute('id', 'money-glossary');
    await user.click(screen.getByText('Prefer another language or need help reading?'));
    expect(screen.getByText(/Automatic translations have not been reviewed/)).toBeVisible();
  });
  it('opens the course selected from the Money overview', () => {
    render(<MemoryRouter initialEntries={['/money/learn?course=first-job']}><MoneyLearn /></MemoryRouter>);
    expect(screen.getByLabelText('Choose a topic')).toHaveValue('first-job');
    expect(screen.getByRole('status')).toHaveTextContent('3 results');
    expect(screen.getByRole('heading', { name: 'Your first job' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Investing basics' })).not.toBeInTheDocument();
  });

  it('includes all drafts with content, stable slugs and preserved review gaps', () => {
    expect(moneyCourses).toHaveLength(8);
    expect(moneyLessons).toHaveLength(31);
    expect(new Set(moneyLessons.map((lesson) => lesson.slug)).size).toBe(31);
    expect(moneyLessons.filter((lesson) => lesson.kind === 'article')).toHaveLength(3);
    expect(moneyLessons.reduce((sum, lesson) => sum + lesson.pendingChecks, 0)).toBe(9);
    for (const lesson of moneyLessons) {
      expect(lesson.body).toContain('## What you will learn');
      expect(lesson.body).not.toContain('reviewer:');
      expect(lesson.body).not.toContain('[Organisation name]');
      expect(lesson.answers.length > 0).toBe(lesson.kind === 'lesson');
      expect(`${lesson.body}${lesson.afterAnswers}`).toContain('General education only.');
    }
  });

  it('searches and filters the catalogue', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><MoneyLearn /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('31 results');
    await user.selectOptions(screen.getByLabelText('Choose a topic'), 'first-job');
    expect(screen.getByRole('status')).toHaveTextContent('3 results');
    await user.type(screen.getByLabelText('Search lessons'), 'payslip');
    expect(screen.getByRole('status')).toHaveTextContent('1 results');
    expect(screen.getByRole('link', { name: /payslip/i })).toHaveAttribute('href', '/money/learn/reading-a-payslip');
    await user.type(screen.getByLabelText('Search lessons'), 'xyz');
    expect(screen.getByText(/No lessons match/)).toBeInTheDocument();
  });

  it('renders a lesson with collapsible answers, sources and sequential links', async () => {
    const user = userEvent.setup();
    const { container } = openLesson('reading-a-payslip');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/payslip/i);
    expect(screen.getByLabelText('Draft status')).toBeInTheDocument();
    const answers = screen.getByText('Show answers').closest('details');
    expect(answers.open).toBe(false);
    await user.click(screen.getByText('Show answers'));
    expect(answers.open).toBe(true);
    expect(container.querySelector('a[href^="https://moneysmart.gov.au/"]')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Next:/ })).toHaveAttribute('href', '/money/learn/tax-when-you-work');
  });

  it('discloses unresolved facts and handles articles and unknown slugs', () => {
    openLesson('what-is-gst');
    expect(screen.getByLabelText('Draft status')).toHaveTextContent('2 factual checks');
    expect(screen.getAllByText(/TODO: confirm from official source/)).toHaveLength(2);
    expect(screen.queryByText('Show answers')).not.toBeInTheDocument();
    cleanup();
    openLesson('missing');
    expect(screen.getByRole('heading', { name: 'Lesson not found' })).toBeInTheDocument();
  });

  it('connects Learn navigation and keeps draft reading pages out of search indexes', () => {
    const learn = moneyNavigation.find((item) => item.label === 'Learn');
    expect(learn.path).toBe('/money/learn');
    expect(isProductNavItemActive(learn, { pathname: '/money/learn/credit-cards', hash: '' })).toBe(true);
    expect(getRouteMeta('/money/learn/credit-cards').noIndex).toBe(true);
  });
});
