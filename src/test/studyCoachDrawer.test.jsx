import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { api } = vi.hoisted(() => ({
  api: {
    getChatHistory: vi.fn(),
    askTutor: vi.fn(),
    saveChatMessage: vi.fn(),
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));
vi.mock('../services/api', () => ({ default: api }));

import StudyCoachDrawer from '../components/StudyCoachDrawer';

describe('StudyCoachDrawer', () => {
  beforeEach(() => {
    api.getChatHistory.mockResolvedValue({ messages: [] });
    api.askTutor.mockResolvedValue({ answer: 'Try one worked example, then explain the idea back in your own words.' });
    api.saveChatMessage.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  it('opens over the current page, traps the interaction in a labelled dialog, and restores focus', async () => {
    render(<StudyCoachDrawer />);
    const launcher = screen.getByRole('button', { name: 'Study coach' });
    launcher.focus();
    fireEvent.click(launcher);

    expect(screen.getByRole('dialog', { name: /What are you working on/i })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('button', { name: 'Close study coach' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.body.style.overflow).toBe('');
    expect(launcher).toHaveFocus();
  });

  it('uses the existing tutor and chat-history services without navigating away', async () => {
    render(<StudyCoachDrawer />);
    fireEvent.click(screen.getByRole('button', { name: 'Study coach' }));
    fireEvent.click(screen.getByRole('button', { name: 'How should I study today?' }));

    expect(await screen.findByText(/Try one worked example/i)).toBeInTheDocument();
    expect(api.askTutor).toHaveBeenCalledWith({ question: 'How should I study today?', slide: undefined });
    expect(api.saveChatMessage).toHaveBeenCalledWith('user', 'How should I study today?');
    expect(api.saveChatMessage).toHaveBeenCalledWith('assistant', expect.stringContaining('Try one worked example'));
  });
});
