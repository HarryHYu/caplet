import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import SpeedTypeMode from '../components/essay/SpeedTypeMode';
import {
  typeable,
  foldAccents,
  compareWord,
  charStatuses,
  splitSentences,
  buildSpeedSections,
  presetIds,
  buildRun,
  computeStats,
} from '../lib/speedType';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

const essay = {
  id: 'e-speed',
  parsedStructure: {
    thesis: '',
    introduction: 'Empire lies. Poets answer.',
    bodyParagraphs: [
      { topicSentence: 'Conrad exposes the theft.', text: 'Conrad exposes the theft. His narrator refuses comfort.' },
      { topicSentence: 'Walcott holds the sea.', text: 'Walcott holds the sea. The drowned keep the record.' },
    ],
    conclusion: 'Both refuse the alibi.',
  },
};

// ── Pure helpers ─────────────────────────────────────────────────────────────

describe('speed run helpers', () => {
  it('maps smart punctuation onto typeable keys', () => {
    expect(typeable('“It’s — fine…”')).toBe('"It\'s - fine..."');
    expect(typeable('« Voilà »')).toBe('" Voilà "'); // guillemets incl. their NBSPs
  });

  it('folds accents and ligatures onto plain keyboard letters', () => {
    expect(foldAccents('École déjà çà cœur Æther straße')).toBe('Ecole deja ca coeur AEther strasse');
  });

  it('forgives accents in word verdicts and live colouring when asked', () => {
    expect(compareWord('café', 'cafe', { ignoreAccents: true })).toBe(true);
    expect(compareWord('café', 'cafe')).toBe(false);
    expect(compareWord('cœur', 'coeur', { ignoreAccents: true })).toBe(true);
    // The reported bug: an accented CAPITAL — case folding alone never
    // reaches it, accents must fold too for Ignore capitals to feel right.
    expect(compareWord('État', 'etat', { ignoreAccents: true, ignoreCase: true })).toBe(true);
    expect(charStatuses('éé', 'ee', { ignoreAccents: true }).every((c) => c.status === 'ok')).toBe(true);
    expect(charStatuses('Éé', 'ee', { ignoreAccents: true, ignoreCase: true }).every((c) => c.status === 'ok')).toBe(true);
  });

  it('compares words under the forgiveness toggles', () => {
    expect(compareWord('Empire', 'Empire')).toBe(true);
    expect(compareWord('Empire', 'empire')).toBe(false);
    expect(compareWord('Empire', 'empire', { ignoreCase: true })).toBe(true);
    expect(compareWord('alibi.', 'alibi', { ignorePunct: true })).toBe(true);
    expect(compareWord('alibi.', 'alibi')).toBe(false);
    expect(compareWord("it's", "it's")).toBe(true);
  });

  it('grades characters for live colouring, flagging extras', () => {
    // A mistyped character keeps showing the TARGET letter (tinted red), the
    // way MonkeyType keeps the passage readable.
    expect(charStatuses('sea', 'sXa')).toEqual([
      { ch: 's', status: 'ok' },
      { ch: 'e', status: 'bad' },
      { ch: 'a', status: 'ok' },
    ]);
    expect(charStatuses('sea', 'seas')[3]).toEqual({ ch: 's', status: 'extra' });
    expect(charStatuses('sea', 's')[2]).toEqual({ ch: 'a', status: 'pending' });
    expect(charStatuses('Sea', 'sea', { ignoreCase: true })[0].status).toBe('ok');
  });

  it('builds sections in reading order and honours the presets', () => {
    const sections = buildSpeedSections(essay);
    expect(sections.map((s) => s.id)).toEqual(['intro', 'bp0', 'bp1', 'conclusion']);
    expect(presetIds('intro', sections)).toEqual(['intro']);
    expect(presetIds('bodies', sections)).toEqual(['bp0', 'bp1']);
    expect(presetIds('lastBpConclusion', sections)).toEqual(['bp1', 'conclusion']);
    expect(presetIds('all', sections)).toHaveLength(4);
  });

  it('tags every word of the run with its sentence', () => {
    const run = buildRun('Empire lies. Poets answer.');
    expect(run.sentenceCount).toBe(2);
    expect(run.words).toEqual([
      { w: 'Empire', si: 0 }, { w: 'lies.', si: 0 },
      { w: 'Poets', si: 1 }, { w: 'answer.', si: 1 },
    ]);
    expect(splitSentences('One. Two! Three?')).toHaveLength(3);
  });

  it('computes MonkeyType-style stats from word records', () => {
    const records = [
      { target: 'Empire', typed: 'Empire', correct: true },
      { target: 'lies.', typed: 'lied.', correct: false },
    ];
    const stats = computeStats(records, 60000); // one minute
    // Correct chars: "Empire" + its space = 7 → 7/5 wpm.
    expect(stats.wpm).toBe(Math.round(7 / 5));
    expect(stats.accuracy).toBe(50);
    expect(stats.errors).toBe(1);
    expect(stats.seconds).toBe(60);
  });
});

// ── Component flows ──────────────────────────────────────────────────────────

const typeWord = (word) => {
  fireEvent.change(screen.getByLabelText('Type the essay here'), { target: { value: `${word} ` } });
};

const startIntroRun = (extraSetup) => {
  render(<SpeedTypeMode essay={essay} />);
  fireEvent.click(screen.getByRole('button', { name: 'Just the intro' }));
  if (extraSetup) extraSetup();
  fireEvent.click(screen.getByRole('button', { name: /Start the run/ }));
  fireEvent.focus(screen.getByLabelText('Type the essay here'));
};

describe('SpeedTypeMode', () => {
  it('offers every toggle and scope preset in setup', () => {
    render(<SpeedTypeMode essay={essay} />);
    for (const name of ['Live', 'Word by word', 'Blind — review only', 'Whole passage', 'Sentence by sentence',
      'Ignore capitals', 'Ignore punctuation', 'Strict stop on error',
      'Whole essay', 'Just the intro', 'Body ¶s only', 'Just the conclusion', 'Last BP + conclusion']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    // Section chips too.
    expect(screen.getByRole('button', { name: 'Body ¶2' })).toBeInTheDocument();
  });

  it('narrows the passage with a preset (word count + preview follow)', () => {
    render(<SpeedTypeMode essay={essay} />);
    fireEvent.click(screen.getByRole('button', { name: 'Just the intro' }));
    expect(screen.getByText(/4 words/)).toBeInTheDocument();
    expect(screen.getByText('Empire lies. Poets answer.')).toBeInTheDocument();
    expect(screen.queryByText(/Conrad exposes the theft/)).not.toBeInTheDocument();
  });

  it('runs a clean intro sprint to a perfect score (auto-finish on the exact last word)', () => {
    startIntroRun();
    typeWord('Empire');
    typeWord('lies.');
    typeWord('Poets');
    // No trailing space needed on the final word.
    fireEvent.change(screen.getByLabelText('Type the essay here'), { target: { value: 'answer.' } });

    expect(screen.getByText('Run complete')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument(); // accuracy
    expect(screen.getAllByText(/wpm/).length).toBeGreaterThan(0);
  });

  it('marks a wrong word in the end-of-run review with what was typed', () => {
    startIntroRun();
    typeWord('Empire');
    typeWord('lied.'); // wrong
    typeWord('Poets');
    fireEvent.change(screen.getByLabelText('Type the essay here'), { target: { value: 'answer.' } });

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText(/✗ lied\./)).toBeInTheDocument();
  });

  it('blind mode hides every verdict during the run but reviews at the end', () => {
    startIntroRun(() => fireEvent.click(screen.getByRole('button', { name: 'Blind — review only' })));

    expect(screen.getByText(/blind run — verdicts at the end/)).toBeInTheDocument();
    typeWord('Empire');
    typeWord('wrong.');
    // No live wpm/accuracy in the stats bar during a blind run.
    expect(screen.queryByText(/% acc/)).not.toBeInTheDocument();
    typeWord('Poets');
    fireEvent.change(screen.getByLabelText('Type the essay here'), { target: { value: 'answer.' } });

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText(/✗ wrong\./)).toBeInTheDocument();
  });

  it('strict stop refuses to advance past a wrong word', () => {
    startIntroRun(() => fireEvent.click(screen.getByRole('button', { name: 'Strict stop on error' })));

    typeWord('Empire');
    typeWord('lied.'); // wrong — space must NOT advance
    const input = screen.getByLabelText('Type the essay here');
    expect(input).toHaveValue('lied.'); // still on the word, space stripped
    fireEvent.change(input, { target: { value: 'lies. ' } }); // corrected
    typeWord('Poets');
    fireEvent.change(input, { target: { value: 'answer.' } });

    expect(screen.getByText('Run complete')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('strict stop is unavailable in blind mode (nothing to stop on)', () => {
    render(<SpeedTypeMode essay={essay} />);
    fireEvent.click(screen.getByRole('button', { name: 'Blind — review only' }));
    expect(screen.getByRole('button', { name: 'Strict stop on error' })).toBeDisabled();
  });

  it('forgiveness toggles make lowercase and missing punctuation count', () => {
    startIntroRun(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Ignore capitals' }));
      fireEvent.click(screen.getByRole('button', { name: 'Ignore punctuation' }));
    });
    typeWord('empire');
    typeWord('lies');
    typeWord('poets');
    typeWord('answer');

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('sentence-by-sentence flow shows one sentence at a time', () => {
    startIntroRun(() => fireEvent.click(screen.getByRole('button', { name: 'Sentence by sentence' })));

    expect(screen.getByText('Sentence 1 of 2')).toBeInTheDocument();
    typeWord('Empire');
    typeWord('lies.');
    expect(screen.getByText('Sentence 2 of 2')).toBeInTheDocument();
    typeWord('Poets');
    fireEvent.change(screen.getByLabelText('Type the essay here'), { target: { value: 'answer.' } });

    // Per-sentence breakdown on the results screen.
    expect(screen.getByText('S1: 2/2')).toBeInTheDocument();
    expect(screen.getByText('S2: 2/2')).toBeInTheDocument();
  });

  it('a manual highlight becomes the passage', () => {
    render(<SpeedTypeMode essay={essay} />);
    const preview = screen.getByText('Empire lies. Poets answer.');
    vi.spyOn(window, 'getSelection').mockReturnValue({
      isCollapsed: false,
      toString: () => 'Poets answer.',
      anchorNode: preview,
    });
    fireEvent.mouseUp(preview);

    expect(screen.getByText(/Highlighted from Introduction/)).toBeInTheDocument();
    expect(screen.getByText(/2 words/)).toBeInTheDocument();

    // Clearing restores the section scope.
    fireEvent.click(screen.getByRole('button', { name: 'Clear highlighted selection' }));
    expect(screen.queryByText(/Highlighted from/)).not.toBeInTheDocument();
  });

  it('types a French essay on a plain keyboard (accents forgiven by default)', () => {
    const french = {
      id: 'e-fr',
      parsedStructure: {
        thesis: '', introduction: 'Ça brûle déjà. À cœur vaillant.', bodyParagraphs: [], conclusion: '',
      },
    };
    render(<SpeedTypeMode essay={french} />);
    expect(screen.getByRole('button', { name: 'Ignore accents (é = e)' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /Start the run/ }));
    fireEvent.focus(screen.getByLabelText('Type the essay here'));

    typeWord('Ca');
    typeWord('brule');
    typeWord('deja.');
    typeWord('A');
    typeWord('coeur');
    fireEvent.change(screen.getByLabelText('Type the essay here'), { target: { value: 'vaillant.' } });

    expect(screen.getByText('Run complete')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('stores a personal best (10+ words) and shows it back in setup', () => {
    localStorage.setItem('caplet:speedbest:e-speed', JSON.stringify({ wpm: 87, accuracy: 98, at: '2026-08-01' }));
    render(<SpeedTypeMode essay={essay} />);
    expect(screen.getByText(/Personal best:/)).toBeInTheDocument();
    expect(screen.getByText(/87 wpm/)).toBeInTheDocument();
  });
});
