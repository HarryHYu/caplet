import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const authMocks = {
  login: vi.fn(),
  register: vi.fn(),
  loginWithGoogle: vi.fn(),
  error: null,
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => authMocks,
}));

vi.mock('@react-oauth/google', () => ({ GoogleLogin: () => <div>Google sign in</div> }));

vi.mock('../services/api', () => ({
  default: {
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    request: vi.fn(),
  },
}));

import api from '../services/api';
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import GuardianConsent from '../pages/GuardianConsent';

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('LoginForm', () => {
  it('links to the forgot-password flow beside the password label', () => {
    render(<MemoryRouter><LoginForm /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Forgot password\?/i })).toHaveAttribute('href', '/forgot-password');
  });

  it('offers a password reveal toggle that flips the input type', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><LoginForm /></MemoryRouter>);

    const input = screen.getByLabelText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(input).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('announces sign-in failures as an alert', async () => {
    const user = userEvent.setup();
    authMocks.login.mockRejectedValueOnce(new Error('Invalid email or password.'));
    render(<MemoryRouter><LoginForm /></MemoryRouter>);

    await user.type(screen.getByLabelText('Email'), 'kid@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  });
});

describe('RegisterForm', () => {
  it('links terms and privacy separately in the consent line', () => {
    render(<MemoryRouter><RegisterForm /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /terms of use/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /trust and privacy information/i })).toHaveAttribute('href', '/trust');
  });

  it('provides reveal toggles for both password fields', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><RegisterForm /></MemoryRouter>);

    const password = screen.getByLabelText(/Password \(at least 8 characters\)/i);
    const confirm = screen.getByLabelText('Confirm password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password).toHaveAttribute('type', 'text');
    expect(confirm).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show confirmed password' }));
    expect(confirm).toHaveAttribute('type', 'text');
  });
});

describe('ForgotPassword', () => {
  it('shows the neutral copy only after a successful request', async () => {
    const user = userEvent.setup();
    api.requestPasswordReset.mockResolvedValueOnce({ message: 'If an account can use that email, a password reset link will be sent shortly.' });
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    await user.type(screen.getByLabelText('Email'), 'kid@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/if an account can use that email/i);
    expect(screen.queryByRole('button', { name: /Send reset link|Try again/ })).not.toBeInTheDocument();
  });

  it('surfaces a retryable error instead of masking failures as success', async () => {
    const user = userEvent.setup();
    api.requestPasswordReset.mockRejectedValueOnce(new Error('network down'));
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    await user.type(screen.getByLabelText('Email'), 'kid@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not send the reset email/i);
    expect(screen.queryByText(/if an account can use that email/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  });
});

describe('ResetPassword', () => {
  const renderPage = () => render(
    <MemoryRouter initialEntries={['/reset-password?token=abc123']}>
      <Routes><Route path="/reset-password" element={<ResetPassword />} /></Routes>
    </MemoryRouter>,
  );

  it('catches mismatched passwords before calling the API', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText('New password'), 'password-one');
    await user.type(screen.getByLabelText('Confirm new password'), 'password-two');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText('Passwords do not match.')).toBeInTheDocument();
    expect(api.resetPassword).not.toHaveBeenCalled();
  });

  it('shows an explicit ready-to-sign-in success state', async () => {
    const user = userEvent.setup();
    api.resetPassword.mockResolvedValueOnce({ message: 'Password reset.' });
    renderPage();

    await user.type(screen.getByLabelText('New password'), 'brand-new-pass');
    await user.type(screen.getByLabelText('Confirm new password'), 'brand-new-pass');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/ready to sign in/i);
    expect(screen.getByRole('link', { name: 'Go to sign in' })).toHaveAttribute('href', '/login');
    expect(api.resetPassword).toHaveBeenCalledWith(expect.objectContaining({ token: 'abc123' }));
  });
});

describe('GuardianConsent', () => {
  it('explains the prerequisites for the disabled decision buttons', async () => {
    api.request.mockResolvedValueOnce({
      request: { status: 'pending', expiresAt: new Date(Date.now() + 86400000).toISOString() },
    });
    render(
      <MemoryRouter initialEntries={['/guardian-consent/tok']}>
        <Routes><Route path="/guardian-consent/:token" element={<GuardianConsent />} /></Routes>
      </MemoryRouter>,
    );

    const approve = await screen.findByRole('button', { name: 'Approve safeguards' });
    const decline = screen.getByRole('button', { name: 'Decline' });
    expect(approve).toBeDisabled();
    expect(decline).toBeDisabled();
    expect(approve).toHaveAttribute('aria-describedby', 'guardian-consent-requirements');
    expect(decline).toHaveAttribute('aria-describedby', 'guardian-consent-requirements');
    await waitFor(() => {
      expect(screen.getByText(/enter your full name and tick the box/i)).toBeInTheDocument();
    });
  });
});
