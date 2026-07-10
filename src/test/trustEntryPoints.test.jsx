import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    error: null,
  }),
}));

vi.mock('../lib/useReveal', () => ({ useReveal: vi.fn() }));
vi.mock('@react-oauth/google', () => ({ GoogleLogin: () => <div>Google sign up</div> }));
vi.mock('../services/api', () => ({
  default: {
    getDueReviewItems: vi.fn().mockResolvedValue({ items: [] }),
    getSavedSlides: vi.fn().mockResolvedValue({ savedSlides: [] }),
  },
}));

import Footer from '../components/Footer';
import RegisterForm from '../components/RegisterForm';
import Contact from '../pages/Contact';
import FinancialTools from '../pages/FinancialTools';
import EduTools from '../pages/EduTools';

describe('Trust Center entry points', () => {
  it('links from the footer, signup, contact, finance and AI surfaces', () => {
    const views = [
      { element: <Footer />, route: '/', name: /Trust center/i, href: '/trust' },
      { element: <RegisterForm />, route: '/register', name: /trust, privacy and terms information/i, href: '/trust' },
      { element: <Contact />, route: '/contact', name: /Read the Trust Center/i, href: '/trust' },
      { element: <FinancialTools />, route: '/fintools', name: /How financial tools are framed/i, href: '/trust#financial-education' },
      { element: <EduTools />, route: '/edutools', name: /Understand AI limitations/i, href: '/trust#ai' },
    ];

    views.forEach(({ element, route, name, href }) => {
      render(<MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>);
      const links = screen.getAllByRole('link', { name });
      expect(links.some((link) => link.getAttribute('href') === href)).toBe(true);
      cleanup();
    });
  });
});
