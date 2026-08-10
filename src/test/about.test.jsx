import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import About from '../pages/About';

afterEach(() => cleanup());

describe('About page', () => {
  it('provides a real destination for public team links', () => {
    render(<MemoryRouter><About /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Learning should feel clear/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse Courses' })).toHaveAttribute('href', '/courses');
    expect(screen.getByRole('link', { name: 'Read the Trust Center' })).toHaveAttribute('href', '/trust');
  });
});
