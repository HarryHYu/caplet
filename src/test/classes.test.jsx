import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const authState = { user: { role: 'instructor' }, isAuthenticated: true };

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authState,
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
beforeEach(() => {
  vi.clearAllMocks();
  authState.user = { role: 'instructor' };
  authState.isAuthenticated = true;
});

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

  it('hides the join action for teachers and shows it for students', async () => {
    api.getClasses.mockResolvedValue({ teaching: [], student: [] });
    render(<MemoryRouter><Classes /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Classes You Teach')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Join class/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create class/i })).toBeInTheDocument();
    cleanup();

    authState.user = { role: 'student' };
    render(<MemoryRouter><Classes /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('button', { name: /Join class/i })).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Create class/i })).not.toBeInTheDocument();
  });

  it('renders join failures inside the modal instead of behind the overlay', async () => {
    authState.user = { role: 'student' };
    api.getClasses.mockResolvedValue({ teaching: [], student: [] });
    api.joinClass.mockRejectedValue(new Error('Invalid class code'));

    render(<MemoryRouter><Classes /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Join class/i }));

    const dialog = screen.getByRole('dialog');
    fireEvent.change(screen.getByLabelText('Enter Your Class Code'), { target: { value: 'NOPE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Join Class' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Invalid class code');
    expect(dialog).toContainElement(alert);
    expect(alert.className).toContain('animate-shake-x');
    // Modal stays open so the student can correct the code.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('disables the create button while submitting so double-clicks cannot duplicate', async () => {
    api.getClasses.mockResolvedValue({ teaching: [], student: [] });
    let resolveCreate;
    api.createClass.mockImplementation(() => new Promise((resolve) => { resolveCreate = resolve; }));

    render(<MemoryRouter><Classes /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Create class/i }));
    fireEvent.change(screen.getByLabelText('Class Name'), { target: { value: 'Year 11 Legal' } });

    const submit = screen.getByRole('button', { name: 'Create Class' });
    fireEvent.click(submit);
    const inFlight = await screen.findByRole('button', { name: /Creating/ });
    expect(inFlight).toBeDisabled();
    fireEvent.click(inFlight);
    fireEvent.click(inFlight);
    expect(api.createClass).toHaveBeenCalledTimes(1);

    resolveCreate({});
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('exposes an accessible dialog that closes on Escape', async () => {
    api.getClasses.mockResolvedValue({ teaching: [], student: [] });
    render(<MemoryRouter><Classes /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Create class/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'create-class-heading');
    await waitFor(() => expect(dialog).toHaveFocus());

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
