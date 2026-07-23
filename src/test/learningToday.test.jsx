import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const api = vi.hoisted(() => ({ logEvent: vi.fn() }));
vi.mock('../services/api', () => ({ default: api }));

import LearningToday from '../components/learning/LearningToday';

const actions = [
  { id: 'assignment:1', type: 'assignment', position: 1, eyebrow: 'Teacher assigned', title: 'Inflation checkpoint', detail: 'Due within 24 hours', href: '/practice?mode=assigned' },
  { id: 'review:due', type: 'review', position: 2, eyebrow: 'Due for review', title: '3 items are ready for retrieval', detail: 'Keep this learning available.', href: '/revision' },
];

describe('LearningToday', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts with the top-ranked action and can reveal another action', () => {
    render(<MemoryRouter><LearningToday actions={actions} source="test" /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Inflation checkpoint' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start next/i })).toHaveAttribute('href', '/practice?mode=assigned');

    fireEvent.click(screen.getByRole('button', { name: 'Show me something else' }));
    expect(screen.getByRole('heading', { name: '3 items are ready for retrieval' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Start next/i })).toHaveAttribute('href', '/revision');
  });
});
