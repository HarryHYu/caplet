import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

// A hand-rolled fake socket: tests drive both directions of the wire.
function makeFakeSocket() {
  const handlers = new Map();
  return {
    connected: true,
    emitted: [],
    on(event, fn) { handlers.set(event, fn); return this; },
    once(event, fn) { handlers.set(event, fn); return this; },
    off() { return this; },
    emit(event, payload, ack) { this.emitted.push({ event, payload }); this.lastAck = ack; },
    disconnect: vi.fn(),
    fire(event, payload) { handlers.get(event)?.(payload); },
  };
}

let fakeSocket;
vi.mock('../services/partySocket', () => ({
  connectPartySocket: () => fakeSocket,
}));

import StudyParty from '../components/essay/StudyParty';

afterEach(() => cleanup());
beforeEach(() => { fakeSocket = makeFakeSocket(); });

const snapshot = (over = {}) => ({
  code: 'ABC234',
  hostId: 'u1',
  goalWords: 100,
  members: [
    { id: 'u1', name: 'Harry', connected: true, words: 40, para: 2, paraCount: 4, accuracy: 95, money: 62, rateLevel: 1, wordValue: 2, shields: 1, goalHit: false },
    { id: 'u2', name: 'Alex P.', connected: true, words: 25, para: 1, paraCount: 3, accuracy: 88, money: 25, rateLevel: 0, wordValue: 1, shields: 0, goalHit: false },
  ],
  chat: [{ id: 'c1', from: null, system: true, text: 'Harry opened the party', at: 1 }],
  ...over,
});

describe('StudyParty', () => {
  it('opens a party and shows the race, the wallet, and the weapons', async () => {
    const registerReporter = vi.fn();
    render(<StudyParty registerReporter={registerReporter} />);

    expect(screen.getByText(/Study party/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Open a party/i }));
    expect(fakeSocket.emitted[0].event).toBe('party:create');

    // Server acks with who we are and the first snapshot.
    await act(async () => { fakeSocket.lastAck({ ok: true, you: 'u1', snapshot: snapshot() }); });

    expect(screen.getByRole('button', { name: 'ABC234' })).toBeInTheDocument();
    expect(screen.getByText(/goal 100 words/i)).toBeInTheDocument();
    expect(screen.getByText(/· you/)).toBeInTheDocument();
    expect(screen.getByText('Alex P.')).toBeInTheDocument();
    // My wallet chip, from my roster row: $62 at $2/word.
    expect(screen.getAllByText('$62').length).toBeGreaterThan(0);
    expect(screen.getByText('$2/word')).toBeInTheDocument();
    // Sabotage and gift buttons exist only on OTHER people's rows.
    expect(screen.getByTitle(/Ink their screen/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Blur-bomb them/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Send them \$10/i)).toBeInTheDocument();
    // The drill reporter was registered so typed words can earn.
    expect(registerReporter).toHaveBeenCalled();
  });

  it('relays chat live and marks it as unsaved', async () => {
    render(<StudyParty registerReporter={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Open a party/i }));
    await act(async () => { fakeSocket.lastAck({ ok: true, you: 'u1', snapshot: snapshot() }); });

    expect(screen.getByText(/not saved/i)).toBeInTheDocument();
    expect(screen.getByText(/opened the party/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Party chat message/i), { target: { value: 'oi hurry up' } });
    fireEvent.click(screen.getByRole('button', { name: /^Send$/i }));
    expect(fakeSocket.emitted.some((e) => e.event === 'party:chat' && e.payload.text === 'oi hurry up')).toBe(true);

    await act(async () => { fakeSocket.fire('party:chat', { id: 'c2', from: 'Alex P.', system: false, text: 'no u', at: 2 }); });
    expect(screen.getByText('no u')).toBeInTheDocument();
  });

  it('shows the ink overlay when hit, and clears it after the duration', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      render(<StudyParty registerReporter={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: /Open a party/i }));
      await act(async () => { fakeSocket.lastAck({ ok: true, you: 'u1', snapshot: snapshot() }); });

      await act(async () => { fakeSocket.fire('party:hit', { kind: 'ink', from: 'Alex P.', durationMs: 4000 }); });
      expect(document.querySelectorAll('.animate-ink-splat').length).toBeGreaterThan(0);
      expect(screen.getByText(/inked you/i)).toBeInTheDocument();

      await act(async () => { await vi.advanceTimersByTimeAsync(4200); });
      expect(document.querySelectorAll('.animate-ink-splat').length).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
