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
    emit(event, payload, ackFn) { this.emitted.push({ event, payload, ackFn }); this.lastAck = ackFn; },
    disconnect: vi.fn(),
    fire(event, payload) { handlers.get(event)?.(payload); },
    ackOf(event) { return [...this.emitted].reverse().find((e) => e.event === event)?.ackFn; },
  };
}

let fakeSocket;
vi.mock('../services/partySocket', () => ({ connectPartySocket: () => fakeSocket }));
// The visual children are exercised by their own render checks; here they are
// stand-ins so this test pins the game logic, not the art.
vi.mock('../components/essay/TycoonMonkey', () => ({
  default: ({ tier, typePulse }) => <div data-testid="monkey" data-tier={tier} data-pulse={typePulse} />,
}));
vi.mock('../components/essay/sabotageFx', () => ({
  SABOTAGE_FX: { ink: ({ wipe }) => <div data-testid="fx-ink" data-wipe={wipe} /> },
  SABOTAGE_META: { ink: { label: 'Ink Splat', durationMs: 7000 } },
}));
vi.mock('../components/essay/TycoonClassroom', () => ({
  default: ({ members, fx }) => <div data-testid="classroom" data-members={members.length} data-fx={fx.length} />,
}));

import TycoonPanel from '../components/essay/TycoonPanel';

afterEach(() => cleanup());
beforeEach(() => { fakeSocket = makeFakeSocket(); });

const selfSnapshot = (over = {}) => ({
  me: {
    id: 'u1', name: 'Harry', connected: true, watching: false, words: 12, para: 1, paraCount: 4,
    accuracy: 95, money: 120, tier: 'wood', tierIndex: 1, b: 2, shields: 1, wipers: false,
    umbrella: false, pets: ['snailPet'], goalHit: false,
  },
  up: { streak: 1, ribbon: 0, paper: 0 },
  meter: 12,
  meterFull: 20,
  lifetimeWords: 400,
  shop: {
    tier: { key: 'copper', label: 'Copper', b: 4, cost: 350 },
    streak: { level: 1, max: 5, cost: 66 },
    ribbon: { level: 0, max: 4, cost: 120 },
    paper: { level: 0, max: 3, cost: 110 },
    shield: { cost: 40, held: 1, max: 3 },
    wipers: { cost: 150, owned: false },
    umbrella: { cost: 200, owned: false },
    pets: [
      { key: 'snailPet', label: 'Desk snail', cost: 60, owned: true },
      { key: 'catPet', label: 'Desk cat', cost: 180, owned: false },
      { key: 'dragonPet', label: 'Desk dragon', cost: 500, owned: false },
    ],
    sabotages: [
      { key: 'ink', label: 'Ink Splat', cost: 28, durationMs: 7000 },
      { key: 'bomb', label: 'Blur Bomb', cost: 60, durationMs: 6000 },
    ],
    autos: { count: 2, max: 10, cost: 500 },
    robo: { owned: false, cost: 3000 },
    wardrobe: [
      { slot: 'head', label: 'Head', level: 1, max: 3, current: 'Flat cap', next: { label: 'Top hat', perk: '+5% word pay', cost: 500 } },
      { slot: 'eyes', label: 'Eyes', level: 0, max: 3, current: null, next: { label: 'Reading glasses', perk: 'misses keep 60% of your streak', cost: 160 } },
      { slot: 'body', label: 'Body', level: 0, max: 3, current: null, next: { label: 'Scarf', perk: 'paragraph bonuses +10%', cost: 200 } },
    ],
    sophisticated: false,
  },
  ...over,
});

const roomSnapshot = () => ({
  code: 'ABC234',
  hostId: 'u1',
  goalWords: 100,
  sabotagesOff: false,
  members: [
    { id: 'u1', name: 'Harry', connected: true, watching: false, words: 12, para: 1, paraCount: 4, accuracy: 95, money: 120, tier: 'wood', tierIndex: 1, b: 2, shields: 1, wipers: false, umbrella: false, pets: [], goalHit: false },
    { id: 'u2', name: 'Alex P.', connected: true, watching: true, words: 4, para: 1, paraCount: 3, accuracy: 88, money: 30, tier: 'stone', tierIndex: 0, b: 1, shields: 0, wipers: false, umbrella: false, pets: [], goalHit: false },
  ],
  chat: [{ id: 'c1', from: null, system: true, text: 'Harry opened the party', at: 1 }],
});

const boot = async (props = {}) => {
  const registerReporter = vi.fn();
  render(<TycoonPanel registerReporter={registerReporter} {...props} />);
  await act(async () => { fakeSocket.ackOf('tycoon:hello')({ ok: true, self: selfSnapshot() }); });
  return { registerReporter };
};

describe('TycoonPanel', () => {
  it('loads the saved game: monkey tier, money, streak meter, shop prices', async () => {
    const { registerReporter } = await boot();
    expect(screen.getByTestId('monkey')).toHaveAttribute('data-tier', '2'); // wood
    expect(screen.getAllByText('$120').length).toBeGreaterThan(0); // wallet (and the ribbon price happens to match)
    expect(screen.getByText(/Wood · \$2\/word/)).toBeInTheDocument();
    expect(screen.getByText(/Copper typewriter/)).toBeInTheDocument();
    expect(screen.getByText('$350')).toBeInTheDocument();
    expect(registerReporter).toHaveBeenCalled();
  });

  it('typed words pulse the monkey immediately and settle up in one batch', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { registerReporter } = await boot();
      const report = registerReporter.mock.calls[0][0];
      await act(async () => {
        report({ kind: 'word', para: 0, paraCount: 4, accuracy: 100, watching: false });
        report({ kind: 'word', para: 0, paraCount: 4, accuracy: 100, watching: false });
        report({ kind: 'miss', para: 0, paraCount: 4, accuracy: 90, watching: false });
      });
      expect(screen.getByTestId('monkey')).toHaveAttribute('data-pulse', '2');
      await act(async () => { await vi.advanceTimersByTimeAsync(800); });
      const progress = fakeSocket.emitted.find((e) => e.event === 'tycoon:progress');
      expect(progress.payload).toMatchObject({ wordsDelta: 2, missesDelta: 1, para: 1, accuracy: 90 });
      // The ack updates the wallet and floats the earnings.
      await act(async () => {
        progress.ackFn({ ok: true, earned: 4, crits: 0, jackpot: 0, paperLump: 0, meter: 14, self: selfSnapshot({ me: { ...selfSnapshot().me, money: 124 } }) });
      });
      expect(screen.getByText('$124')).toBeInTheDocument();
      expect(screen.getByText('+$4')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('opens a party, shows the roster with tiers and the watcher badge, sends chat', async () => {
    await boot();
    fireEvent.click(screen.getByRole('button', { name: /Open party/i }));
    await act(async () => {
      fakeSocket.ackOf('party:create')({ ok: true, you: 'u1', self: selfSnapshot(), snapshot: roomSnapshot() });
    });
    expect(screen.getByRole('button', { name: 'ABC234' })).toBeInTheDocument();
    expect(screen.getByText(/goal 100/)).toBeInTheDocument();
    expect(screen.getByText(/🧘Alex P\./)).toBeInTheDocument(); // the zen watcher
    // Host-only peace toggle exists.
    expect(screen.getByRole('button', { name: /Declare peace/i })).toBeInTheDocument();

    // The attack tray opens on the other player only, with priced weapons.
    fireEvent.click(screen.getByRole('button', { name: /Interact with Alex P\./i }));
    const ink = screen.getByTitle(/Ink Splat — \$28/);
    fireEvent.click(ink);
    expect(fakeSocket.emitted.some((e) => e.event === 'party:sabotage' && e.payload.kind === 'ink' && e.payload.target === 'u2')).toBe(true);

    fireEvent.change(screen.getByLabelText(/Party chat message/i), { target: { value: 'oi' } });
    fireEvent.click(screen.getByRole('button', { name: /^Send$/i }));
    expect(fakeSocket.emitted.some((e) => e.event === 'party:chat' && e.payload.text === 'oi')).toBe(true);
    await act(async () => { fakeSocket.fire('party:chat', { id: 'c2', from: 'Alex P.', system: false, text: 'no u', at: 2 }); });
    expect(screen.getByText('no u')).toBeInTheDocument();
  });

  it('a landed hit starts the tray countdown, disables weapons, and gifts are priced in dollars', async () => {
    await boot();
    fireEvent.click(screen.getByRole('button', { name: /Open party/i }));
    await act(async () => {
      fakeSocket.ackOf('party:create')({ ok: true, you: 'u1', self: selfSnapshot(), snapshot: roomSnapshot() });
    });
    fireEvent.click(screen.getByRole('button', { name: /Interact with Alex P\./i }));
    expect(screen.getByTitle(/Send them \$20 of your money/)).toBeInTheDocument(); // 10 x b($2), in dollars not "b"
    fireEvent.click(screen.getByTitle(/Ink Splat — \$28/));
    await act(async () => {
      fakeSocket.ackOf('party:sabotage')({ ok: true, outcome: 'hit', reloadMs: 8000, targetCooldownMs: 20000, self: selfSnapshot() });
    });
    expect(screen.getByRole('timer')).toHaveTextContent(/20s/);
    expect(screen.getByTitle(/Ink Splat — \$28/)).toBeDisabled();
  });

  it('cooldown rejections surface right in the tray with their countdown', async () => {
    await boot();
    fireEvent.click(screen.getByRole('button', { name: /Open party/i }));
    await act(async () => {
      fakeSocket.ackOf('party:create')({ ok: true, you: 'u1', self: selfSnapshot(), snapshot: roomSnapshot() });
    });
    fireEvent.click(screen.getByRole('button', { name: /Interact with Alex P\./i }));
    fireEvent.click(screen.getByTitle(/Ink Splat — \$28/));
    await act(async () => {
      fakeSocket.ackOf('party:sabotage')({ error: 'Alex P. is still recovering — 12s.', retryInMs: 12000, scope: 'target' });
    });
    expect(screen.getByText(/still recovering — 12s/)).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent(/12s/);
    expect(screen.getByTitle(/Ink Splat — \$28/)).toBeDisabled();
  });

  it('the wallet opens the password-gated admin form and sets money over the wire', async () => {
    await boot();
    fireEvent.click(screen.getByTitle('Admin'));
    fireEvent.change(screen.getByLabelText('Admin password'), { target: { value: 'test' } });
    fireEvent.change(screen.getByLabelText('Admin money amount'), { target: { value: '5000' } });
    fireEvent.click(screen.getByRole('button', { name: /^Set$/ }));
    const call = fakeSocket.emitted.find((e) => e.event === 'tycoon:admin');
    expect(call.payload).toEqual({ password: 'test', money: 5000 });
    await act(async () => {
      call.ackFn({ ok: true, self: selfSnapshot({ me: { ...selfSnapshot().me, money: 5000 } }) });
    });
    expect(screen.getByText('$5,000')).toBeInTheDocument();
    expect(screen.queryByLabelText('Admin password')).not.toBeInTheDocument(); // closes on success
  });

  it('renders incoming hits as FX whose wipe counter climbs with typed words', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { registerReporter } = await boot();
      const report = registerReporter.mock.calls[0][0];
      await act(async () => { fakeSocket.fire('party:hit', { kind: 'ink', from: 'Alex P.', durationMs: 4000 }); });
      expect(screen.getByTestId('fx-ink')).toHaveAttribute('data-wipe', '0');
      await act(async () => { report({ kind: 'word', para: 0, paraCount: 4, accuracy: 100, watching: false }); });
      expect(screen.getByTestId('fx-ink')).toHaveAttribute('data-wipe', '1');
      await act(async () => { await vi.advanceTimersByTimeAsync(4200); });
      expect(screen.queryByTestId('fx-ink')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('absorbed attacks pay the bounty notice instead of an effect', async () => {
    await boot();
    await act(async () => { fakeSocket.fire('party:blocked', { kind: 'ink', from: 'Alex P.', how: 'absorbed', bounty: 28 }); });
    expect(screen.getByText(/Absorbed Alex P\.'s Ink Splat \(\+\$28\)/)).toBeInTheDocument();
    expect(screen.queryByTestId('fx-ink')).not.toBeInTheDocument();
  });

  it('game layout: classroom on top, the drill as children, the shop beside', async () => {
    const registerReporter = vi.fn();
    render(
      <TycoonPanel game registerReporter={registerReporter} onExitFullscreen={vi.fn()}>
        <div data-testid="drill" />
      </TycoonPanel>,
    );
    await act(async () => { fakeSocket.ackOf('tycoon:hello')({ ok: true, self: selfSnapshot() }); });
    expect(screen.getByTestId('classroom')).toHaveAttribute('data-members', '1'); // solo: just me
    expect(screen.getByTestId('drill')).toBeInTheDocument();
    expect(screen.getByText(/Copper typewriter/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open party/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exit game/i })).toBeInTheDocument();
    expect(screen.queryByTestId('monkey')).not.toBeInTheDocument(); // the classroom replaces the solo scene
    // Live effects still reach the game layout.
    await act(async () => { fakeSocket.fire('party:hit', { kind: 'ink', from: 'Alex P.', durationMs: 3000 }); });
    expect(screen.getByTestId('fx-ink')).toBeInTheDocument();
  });

  it('the classroom animates room fx and the roster feeds it members', async () => {
    render(<TycoonPanel game registerReporter={vi.fn()} />);
    await act(async () => {
      fakeSocket.ackOf('tycoon:hello')({ ok: true, self: selfSnapshot(), snapshot: roomSnapshot() });
    });
    expect(screen.getByTestId('classroom')).toHaveAttribute('data-members', '2'); // the hello handed the room back
    await act(async () => { fakeSocket.fire('party:fx', { kind: 'bomb', from: 'u2', to: 'u1', outcome: 'hit' }); });
    expect(screen.getByTestId('classroom')).toHaveAttribute('data-fx', '1');
  });

  it('sells staff and wardrobe: automonkeys, robo, accessory tiers', async () => {
    render(<TycoonPanel registerReporter={vi.fn()} />);
    await act(async () => {
      fakeSocket.ackOf('tycoon:hello')({ ok: true, self: selfSnapshot({ me: { ...selfSnapshot().me, money: 100000 } }) });
    });
    fireEvent.click(screen.getByRole('button', { name: /Automonkey ×2\/10/i }));
    expect(fakeSocket.emitted.some((e) => e.event === 'tycoon:buy' && e.payload.item === 'auto')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Robo monkey/i }));
    expect(fakeSocket.emitted.some((e) => e.event === 'tycoon:buy' && e.payload.item === 'robo')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Head 1\/3 · Flat cap/i }));
    expect(fakeSocket.emitted.some((e) => e.event === 'tycoon:buy' && e.payload.item === 'acc:head')).toBe(true);
    expect(screen.getByText(/next: Top hat — \+5% word pay/)).toBeInTheDocument();
  });
});
