import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'instructor' }, isAuthenticated: true }),
}));

vi.mock('../services/api', () => ({
  default: {
    getClasses: vi.fn(),
    createClass: vi.fn(),
    joinClass: vi.fn(),
  },
}));

vi.mock('../lib/useReveal', () => ({ useReveal: vi.fn() }));

import Classes from '../pages/Classes';
import api from '../services/api';

afterEach(() => cleanup());

describe('Classes', () => {
  it('uses local subject-aware marks instead of image placeholders', async () => {
    api.getClasses.mockResolvedValue({
      teaching: [{ id: 'economics', name: 'Year 12 Economics', code: 'ECON12' }],
      student: [{ id: 'science', name: 'Science Club', code: 'SCIENCE' }],
    });

    const { container } = render(<MemoryRouter><Classes /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('Year 12 Economics')).toBeInTheDocument());
    expect(screen.getByText('Science Club')).toBeInTheDocument();
    expect(screen.getAllByTestId('class-icon').map((icon) => icon.dataset.classIcon)).toEqual(['economics', 'science']);
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });
});
