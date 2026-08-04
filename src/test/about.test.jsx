import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../lib/useReveal', () => ({ useReveal: vi.fn() }));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

import About from '../pages/About';
import Footer from '../components/Footer';

describe('About page', () => {
  it('credits both Caplet builders and links to their public profiles', () => {
    render(<MemoryRouter initialEntries={['/about']}><About /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /Made by Harry, Ray and Sean/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Harry Yu' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ray Wang' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sean Xin' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Harry Yu on GitHub' })).toHaveAttribute('href', 'https://github.com/HarryHYu');
    expect(screen.getByRole('link', { name: 'Ray Wang on GitHub' })).toHaveAttribute('href', 'https://github.com/raei-2748');
    expect(screen.getByRole('link', { name: 'Sean Xin on GitHub' })).toHaveAttribute('href', 'https://github.com/HarryHYu/caplet/commits?author=withmebucks');
  });

  it('keeps the archived page out of the homepage footer', () => {
    render(<MemoryRouter initialEntries={['/']}><Footer /></MemoryRouter>);

    expect(screen.queryByRole('link', { name: /Team|Who built Caplet/i })).not.toBeInTheDocument();
  });
});
