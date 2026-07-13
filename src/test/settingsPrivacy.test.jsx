import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const auth = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ logout: auth.logout }),
}));

vi.mock('../services/api', () => ({
  default: { request: vi.fn() },
}));

import api from '../services/api';
import SettingsPrivacy from '../pages/SettingsPrivacy';

const PREFERENCE = {
  id: 'preference-1',
  aiHistoryEnabled: true,
  aiRetentionDays: 365,
  analyticsEnabled: true,
  ageNoticeAcknowledgedAt: null,
  parentConsentStatus: 'not_required',
};

const CONSENTS = [
  {
    id: 'consent-ai',
    type: 'ai_processing',
    status: 'granted',
    policyVersion: 'privacy-controls-v1',
    grantedAt: '2026-07-01T00:00:00.000Z',
  },
  {
    id: 'consent-analytics',
    type: 'learning_analytics',
    status: 'withdrawn',
    policyVersion: 'privacy-controls-v1',
    withdrawnAt: '2026-06-20T00:00:00.000Z',
  },
];

const INTERACTIONS = [{
  id: 'interaction-1',
  feature: 'practice_feedback',
  status: 'completed',
  confidence: 'medium',
  modelVersion: 'gpt-test',
  inputSummary: 'An answer about inflation.',
  outputSummary: 'Feedback on the transmission mechanism.',
  occurredAt: '2026-07-12T10:30:00.000Z',
  expiresAt: '2027-07-12T10:30:00.000Z',
}];

const PROCESSORS = {
  processors: [{
    name: 'OpenAI',
    purpose: 'Optional tutoring and practice feedback',
    categories: ['submitted learning text', 'generated feedback'],
    optional: true,
  }],
  note: 'Current production configuration should be confirmed by schools.',
};

function successResponse(endpoint, options = {}) {
  const method = options.method || 'GET';
  if (endpoint === '/privacy/preferences' && method === 'GET') return Promise.resolve({ preference: PREFERENCE, consents: CONSENTS });
  if (endpoint === '/privacy/ai-history?limit=100') return Promise.resolve({ interactions: INTERACTIONS });
  if (endpoint === '/privacy/processors') return Promise.resolve(PROCESSORS);
  if (endpoint === '/privacy/preferences' && method === 'PUT') {
    const patch = JSON.parse(options.body);
    return Promise.resolve({
      preference: {
        ...PREFERENCE,
        ...patch,
        ...(patch.ageNoticeAcknowledged ? { ageNoticeAcknowledgedAt: '2026-07-13T00:00:00.000Z' } : {}),
      },
    });
  }
  if (endpoint === '/privacy/consents' && method === 'POST') {
    const body = JSON.parse(options.body);
    return Promise.resolve({ consent: { id: 'new-consent', ...body, status: 'granted', grantedAt: '2026-07-13T00:00:00.000Z' } });
  }
  if (endpoint.startsWith('/privacy/consents/') && method === 'DELETE') {
    const type = decodeURIComponent(endpoint.split('/').at(-1));
    return Promise.resolve({ consent: { id: 'withdrawn-consent', type, status: 'withdrawn', withdrawnAt: '2026-07-13T00:00:00.000Z' } });
  }
  if (endpoint === '/privacy/ai-history' && method === 'DELETE') return Promise.resolve({ deleted: 1 });
  if (endpoint === '/privacy/export') return Promise.resolve({ schemaVersion: 1, account: { id: 'user-1' }, data: {} });
  if (endpoint === '/privacy/account' && method === 'DELETE') return Promise.resolve(null);
  return Promise.reject(new Error(`Unexpected request: ${method} ${endpoint}`));
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/settings/privacy']}>
      <Routes>
        <Route path="/settings/privacy" element={<SettingsPrivacy />} />
        <Route path="/login" element={<h1>Signed out after deletion</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SettingsPrivacy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.logout.mockResolvedValue(undefined);
    api.request.mockImplementation(successResponse);
  });

  it('loads preferences, consent state, AI history, and processor disclosures', async () => {
    renderPage();

    expect(screen.getByRole('status', { name: 'Loading privacy controls' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Privacy & data' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Keep my AI activity history' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: 'AI-assisted learning' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: 'Personal learning analytics' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByLabelText('AI history retention')).toHaveValue('365');
    expect(screen.getByText('Practice Feedback')).toBeInTheDocument();
    expect(screen.getByText('An answer about inflation.')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText(/submitted learning text/i)).toBeInTheDocument();
  });

  it('updates preferences and records consent grants and withdrawals', async () => {
    renderPage();
    const historySwitch = await screen.findByRole('switch', { name: 'Keep my AI activity history' });

    fireEvent.click(historySwitch);
    await waitFor(() => expect(api.request).toHaveBeenCalledWith('/privacy/preferences', {
      method: 'PUT',
      body: JSON.stringify({ aiHistoryEnabled: false }),
    }));
    expect(await screen.findByText('Your privacy preference was updated.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: 'AI-assisted learning' }));
    await waitFor(() => expect(api.request).toHaveBeenCalledWith('/privacy/consents/ai_processing', { method: 'DELETE' }));
    expect(screen.getByRole('switch', { name: 'AI-assisted learning' })).toHaveAttribute('aria-checked', 'false');

    fireEvent.click(screen.getByRole('switch', { name: 'Personal learning analytics' }));
    await waitFor(() => expect(api.request).toHaveBeenCalledWith('/privacy/consents', {
      method: 'POST',
      body: JSON.stringify({ type: 'learning_analytics', policyVersion: 'privacy-controls-v2' }),
    }));
    expect(screen.getByRole('switch', { name: 'Personal learning analytics' })).toHaveAttribute('aria-checked', 'true');
  });

  it('requires confirmation before clearing AI history', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Clear history' }));

    expect(screen.getByRole('alertdialog', { name: 'Clear all AI activity history?' })).toBeInTheDocument();
    expect(api.request).not.toHaveBeenCalledWith('/privacy/ai-history', { method: 'DELETE' });
    fireEvent.click(screen.getByRole('button', { name: 'Clear AI history' }));

    await waitFor(() => expect(api.request).toHaveBeenCalledWith('/privacy/ai-history', { method: 'DELETE' }));
    expect(await screen.findByText('No stored AI activity')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('1 AI interaction was deleted.');
  });

  it('keeps confirmation dialog focus contained and restores it when dismissed', async () => {
    renderPage();
    const trigger = await screen.findByRole('button', { name: 'Clear history' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('alertdialog', { name: 'Clear all AI activity history?' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const confirm = screen.getByRole('button', { name: 'Clear AI history' });
    expect(cancel).toHaveFocus();

    confirm.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(cancel).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(dialog).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('downloads a machine-readable account export', async () => {
    const createObjectURL = vi.fn(() => 'blob:privacy-export');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Download export' }));

    await waitFor(() => expect(api.request).toHaveBeenCalledWith('/privacy/export'));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:privacy-export');
    expect(await screen.findByText('Your data export was downloaded.')).toBeInTheDocument();
    click.mockRestore();
  });

  it('requires the exact phrase, deletes the account, and logs the user out', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete account' }));

    const permanentButton = screen.getByRole('button', { name: 'Delete permanently' });
    expect(permanentButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Confirmation phrase'), { target: { value: 'DELETE MY ACCOUNT' } });
    expect(permanentButton).toBeEnabled();
    fireEvent.click(permanentButton);

    await waitFor(() => expect(api.request).toHaveBeenCalledWith('/privacy/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirmation: 'DELETE MY ACCOUNT' }),
    }));
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Signed out after deletion' })).toBeInTheDocument();
  });

  it('offers a retry when privacy controls fail to load', async () => {
    api.request.mockRejectedValueOnce(new Error('Privacy service unavailable'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Privacy service unavailable');
    api.request.mockImplementation(successResponse);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Privacy & data' })).toBeInTheDocument();
  });
});
