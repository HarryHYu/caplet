import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../services/api', () => ({
  default: { askTutor: vi.fn() },
}));

import api from '../services/api';
import StudyCoachHighlight from '../components/StudyCoachHighlight';

// Force window.getSelection().toString() to return a chosen highlight.
function setSelection(text) {
  vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => text });
}

describe('StudyCoachHighlight', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('right-clicking a highlight opens the coach and sends the selection as slide context', async () => {
    setSelection('Opportunity cost is the value of the next best alternative forgone.');
    api.askTutor.mockResolvedValue({ unavailable: false, answer: 'It is the best option you gave up.' });

    render(<><p data-testid="reading">reading area</p><StudyCoachHighlight /></>);

    fireEvent.contextMenu(screen.getByTestId('reading'), { clientX: 120, clientY: 120 });

    fireEvent.click(await screen.findByText('Ask coach about this'));

    // The panel opens with the highlight shown as context.
    expect(await screen.findByText('About your highlight')).toBeInTheDocument();

    const box = screen.getByPlaceholderText(/ask about the highlight/i);
    fireEvent.change(box, { target: { value: 'explain this please' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    await waitFor(() => expect(api.askTutor).toHaveBeenCalledTimes(1));
    const arg = api.askTutor.mock.calls[0][0];
    expect(arg.question).toBe('explain this please');
    expect(arg.slide).toMatchObject({ type: 'selection', content: expect.stringContaining('Opportunity cost') });

    expect(await screen.findByText(/best option you gave up/i)).toBeInTheDocument();
  });

  it('right-clicking with no selection asks a general question (no slide context)', async () => {
    setSelection('');
    api.askTutor.mockResolvedValue({ unavailable: false, answer: 'Inflation is a rise in the general price level.' });

    render(<><p data-testid="reading">reading area</p><StudyCoachHighlight /></>);

    fireEvent.contextMenu(screen.getByTestId('reading'), { clientX: 10, clientY: 10 });
    fireEvent.click(await screen.findByText('Ask study coach…'));

    const box = screen.getByPlaceholderText(/ask the coach anything/i);
    fireEvent.change(box, { target: { value: 'what is inflation' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    await waitFor(() => expect(api.askTutor).toHaveBeenCalledTimes(1));
    expect(api.askTutor.mock.calls[0][0].slide).toBeUndefined();
  });

  it('degrades to a friendly message when the tutor is unavailable', async () => {
    setSelection('supply and demand');
    api.askTutor.mockResolvedValue({ unavailable: true, answer: '', message: 'The coach is unavailable right now.' });

    render(<><p data-testid="reading">reading area</p><StudyCoachHighlight /></>);

    fireEvent.contextMenu(screen.getByTestId('reading'), { clientX: 10, clientY: 10 });
    fireEvent.click(await screen.findByText('Ask coach about this'));
    fireEvent.click(await screen.findByRole('button', { name: 'Give an example' }));

    expect(await screen.findByText(/unavailable/i)).toBeInTheDocument();
  });

  it('leaves the native menu alone when right-clicking an input', () => {
    setSelection('some text');

    render(<><input data-testid="field" defaultValue="x" /><StudyCoachHighlight /></>);

    fireEvent.contextMenu(screen.getByTestId('field'), { clientX: 10, clientY: 10 });

    expect(screen.queryByText('Ask coach about this')).not.toBeInTheDocument();
    expect(screen.queryByText('Ask study coach…')).not.toBeInTheDocument();
  });
});
