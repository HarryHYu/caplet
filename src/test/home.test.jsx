import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../lib/useReveal', () => ({
  useReveal: vi.fn(),
  revealOnScroll: vi.fn(),
}));

vi.mock('lenis', () => ({
  default: class {
    on() {}
    raf() {}
    scrollTo() {}
    destroy() {}
  },
}));

vi.mock('gsap', () => {
  const chain = { from: vi.fn(), to: vi.fn() };
  chain.from.mockReturnValue(chain);
  chain.to.mockReturnValue(chain);
  return {
    default: {
      registerPlugin: vi.fn(),
      timeline: vi.fn(() => chain),
      context: vi.fn((callback) => { callback(); return { revert: vi.fn() }; }),
      ticker: { add: vi.fn(), remove: vi.fn(), lagSmoothing: vi.fn() },
      utils: { toArray: vi.fn(() => []) },
      to: vi.fn(),
    },
  };
});

vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: { update: vi.fn() } }));

import Home from '../pages/Home';

describe('public homepage', () => {
  it('restores the animated product hero and feature depth', () => {
    render(<MemoryRouter><Home /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: /Build, learn, and ship anything/i })).toBeInTheDocument();
    expect(screen.getByText('Lesson builder')).toBeInTheDocument();
    expect(screen.getByText('Live code IDE')).toBeInTheDocument();
    expect(screen.getByText('AI lesson generation')).toBeInTheDocument();
  });

  it('restores an interactive FAQ', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><Home /></MemoryRouter>);

    const question = screen.getByRole('button', { name: 'What can I study on Caplet?' });
    expect(question).toHaveAttribute('aria-expanded', 'false');
    await user.click(question);
    expect(question).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/organise your selected subjects/i)).toBeInTheDocument();
  });
});
