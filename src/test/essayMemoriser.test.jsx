import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock the API singleton — the library calls getEssays and getDueReviewItems
// in parallel on mount; the workspace loads its essay by id from the route.
vi.mock('../services/api', () => ({
  default: {
    getEssays: vi.fn().mockResolvedValue({ essays: [] }),
    getEssay: vi.fn(),
    createEssay: vi.fn(),
    updateEssay: vi.fn(),
    parseEssay: vi.fn(),
    getEssayContext: vi.fn().mockResolvedValue({ docs: [] }),
    addEssayContext: vi.fn(),
    deleteEssayContext: vi.fn().mockResolvedValue(null),
    getEssayAnnotations: vi.fn().mockResolvedValue({ annotations: [] }),
    addEssayAnnotation: vi.fn(),
    updateEssayAnnotation: vi.fn().mockResolvedValue({}),
    deleteEssayAnnotation: vi.fn().mockResolvedValue(null),
    essayChat: vi.fn(),
    explainEssay: vi.fn(),
    deleteEssay: vi.fn(),
    request: vi.fn(),
    getDueReviewItems: vi.fn().mockResolvedValue({ items: [] }),
    submitReview: vi.fn().mockResolvedValue({ reviewItem: {} }),
    getProxiedImageSrc: (u) => u,
  },
}));

import EssayMemoriser, { MemoriseDrill } from '../pages/EssayMemoriser';
import api from '../services/api';

afterEach(() => cleanup());

// Each test queues its own mockResolvedValueOnce responses; reset between
// tests so an unconsumed queue can never leak into the next one.
beforeEach(() => {
  vi.mocked(api.getEssays).mockReset().mockResolvedValue({ essays: [] });
  vi.mocked(api.getEssayContext).mockReset().mockResolvedValue({ docs: [] });
  vi.mocked(api.getEssayAnnotations).mockReset().mockResolvedValue({ annotations: [] });
  vi.mocked(api.getDueReviewItems).mockReset().mockResolvedValue({ items: [] });
  vi.mocked(api.submitReview).mockReset().mockResolvedValue({ reviewItem: {} });
  vi.mocked(api.deleteEssayAnnotation).mockReset().mockResolvedValue(null);
  vi.mocked(api.deleteEssayContext).mockReset().mockResolvedValue(null);
  vi.mocked(api.updateEssayAnnotation).mockReset().mockResolvedValue({});
  [api.getEssay, api.createEssay, api.updateEssay, api.parseEssay, api.deleteEssay,
    api.addEssayContext, api.addEssayAnnotation, api.essayChat, api.explainEssay,
    api.request].forEach((fn) => vi.mocked(fn).mockReset());
});

const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/essays" element={<EssayMemoriser />} />
      <Route path="/essays/:essayId" element={<EssayMemoriser />} />
    </Routes>
  </MemoryRouter>,
);

const parsedEssay = {
  id: 'essay-1',
  title: 'Macbeth: ambition',
  originalText: 'Shakespeare presents ambition as destructive.\n\nMacbeth chooses ambition over loyalty.\n\nAmbition destroys Macbeth.',
  parsedStructure: {
    thesis: 'Shakespeare presents ambition as destructive.',
    introduction: 'Shakespeare presents ambition as destructive.',
    bodyParagraphs: [{ topicSentence: 'Macbeth chooses ambition over loyalty.', text: 'Macbeth chooses ambition over loyalty.', quotes: [], techniques: [] }],
    conclusion: 'Ambition destroys Macbeth.',
  },
};

describe('EssayMemoriser', () => {
  it('keeps the library calm, then opens the new-essay composer with a model picker', async () => {
    renderAt('/essays');
    expect(await screen.findByText(/Learn it by heart/i)).toBeInTheDocument();
    expect(screen.getByText(/Start a new essay/i)).toBeInTheDocument();
    expect(await screen.findByText(/No essays yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add essay/i }));
    expect(screen.getByText(/Add an essay/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/uses AI to map the essay’s structure/i)).toBeInTheDocument();
    // PDFs attach as named files, never dumped as raw text into the textarea.
    expect(screen.getByText(/Attach essay PDF/i)).toBeInTheDocument();
    // Context can be supplied up front, beside the essay.
    expect(screen.getByText(/Context library|Marker feedback, quote banks/i)).toBeInTheDocument();
    // The AI model is choosable before generating, like the lesson generator.
    fireEvent.click(screen.getByRole('button', { name: /GPT-5\.4 Mini/i }));
    expect(screen.getByRole('option', { name: /GPT-5\.5/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: /GPT-5\.5/i }));
    expect(screen.getByRole('button', { name: /GPT-5\.5/i })).toBeInTheDocument();
  });

  it('links each library card to its own workspace route', async () => {
    api.getEssays.mockResolvedValueOnce({ essays: [{ id: 'essay-1', title: 'Macbeth: ambition', parsed: true, paragraphCount: 1, wordCount: 18, excerpt: 'Shakespeare presents…' }] });
    renderAt('/essays');
    const card = await screen.findByRole('link', { name: /Macbeth: ambition/i });
    expect(card).toHaveAttribute('href', '/essays/essay-1');
  });

  it('opens a workspace with Document, Context, Practice and Edit sections', async () => {
    api.getEssay.mockResolvedValue({ essay: parsedEssay });
    renderAt('/essays/essay-1');

    expect(await screen.findByRole('heading', { name: /Macbeth: ambition/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /All essays/i })).toHaveAttribute('href', '/essays');
    expect(screen.getByRole('button', { name: /Document/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /Context/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Practice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Edit$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Practice/i }));
    expect(await screen.findByText(/Your learning path/i)).toBeInTheDocument();
    // Three consolidated tools — overlapping modes became option toggles.
    expect(screen.getByRole('button', { name: /Memorise/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exam run/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Review/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Sentences$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Openings$/i })).not.toBeInTheDocument();
    // First letters is a unit of Rebuild it now, not a step of its own.
    expect(screen.queryByRole('button', { name: /^First letters$/i })).not.toBeInTheDocument();
    // Perfect run merged INTO Memorise — no separate drill chip any more.
    expect(screen.queryByRole('button', { name: /Perfect run/i })).not.toBeInTheDocument();
    // Unavailable drills (no quotes, one paragraph) are hidden, not dead ends.
    expect(screen.queryByRole('button', { name: /Quote cards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Paragraph order/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Memorise/i }));
    expect(await screen.findByText(/Step 1 of 3/i)).toBeInTheDocument();
    // Both typing units live inside the mode; sentence-by-sentence is gone.
    expect(screen.getByRole('button', { name: /Full word/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^First letters$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sentence by sentence/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /All activities/i })).toBeInTheDocument();
  });

  it('lets the student practise just a selected portion of the essay', async () => {
    const twoParas = {
      ...parsedEssay,
      parsedStructure: {
        ...parsedEssay.parsedStructure,
        bodyParagraphs: [
          { topicSentence: 'Macbeth chooses ambition over loyalty.', text: 'Macbeth chooses ambition over loyalty.', quotes: [], techniques: [] },
          { topicSentence: 'Lady Macbeth drives the plan.', text: 'Lady Macbeth drives the plan.', quotes: [], techniques: [] },
        ],
      },
    };
    api.getEssay.mockResolvedValue({ essay: twoParas });
    renderAt('/essays/essay-1?tab=practice');

    // Intro + two bodies + conclusion — the intro and conclusion are sections
    // you can practise, not scenery, so they are in the count and the picker.
    const chip = await screen.findByRole('button', { name: /Practising: All 4 sections/i });
    fireEvent.click(chip);
    expect(screen.getByRole('checkbox', { name: /Introduction/ })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Conclusion/ })).toBeInTheDocument();
    // Deselect the first body paragraph — practice narrows to the rest.
    fireEvent.click(screen.getByRole('checkbox', { name: /Body ¶1/ }));
    expect(screen.getByRole('button', { name: /Practising: 3 of 4 sections/i })).toBeInTheDocument();
  });

  it('practises the introduction and the conclusion, not only body paragraphs', async () => {
    api.getEssay.mockResolvedValue({ essay: parsedEssay });
    renderAt('/essays/essay-1?tab=practice');

    // Memorise walks the whole essay in reading order: intro first.
    fireEvent.click(await screen.findByRole('button', { name: /Memorise/i }));
    expect(await screen.findByText(/Introduction · 1 of 3/i)).toBeInTheDocument();

    // Scoping to the conclusion alone must actually drill the conclusion —
    // every mode used to silently fall back to body paragraphs only.
    cleanup();
    renderAt('/essays/essay-1?tab=practice&mode=wordbyword&scope=conclusion');
    expect(await screen.findByText(/Conclusion · 1 of 1/i)).toBeInTheDocument();

    // …and Review, which schedules its spaced repetition per section.
    cleanup();
    renderAt('/essays/essay-1?tab=practice&mode=recall&scope=intro');
    expect(await screen.findByText(/Introduction · 1 of 1/i)).toBeInTheDocument();
  });

  it('Memorise offers both typing units, and "Just marks it" keeps the old rebuild behaviour', async () => {
    api.getEssay.mockResolvedValue({ essay: parsedEssay });
    renderAt('/essays/essay-1?tab=practice&mode=wordbyword&scope=intro');

    // Full word is the default unit; both units share the same inline stream.
    await screen.findByRole('application', { name: /Memorise — full words/i });
    fireEvent.click(screen.getByRole('button', { name: /^First letters$/i }));
    expect(screen.getByRole('application', { name: /Memorise — first letters/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Full word$/i }));
    expect(screen.getByRole('application', { name: /Memorise — full words/i })).toBeInTheDocument();

    // With the gentle policy, a wrong word is marked and you move on — no
    // restart, exactly the old Rebuild it.
    fireEvent.click(screen.getByRole('button', { name: /Just marks it/i }));
    const input = screen.getByLabelText(/Type the next word/i);
    fireEvent.change(input, { target: { value: 'Shakespeare' } });
    fireEvent.keyDown(input, { key: ' ' });
    expect(screen.getByText('100%')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'offers' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByTitle(/You typed “offers”/)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.queryByText(/restarted/i)).not.toBeInTheDocument();
  });

  it('offers full screen only where the browser supports it', async () => {
    api.getEssay.mockResolvedValue({ essay: parsedEssay });

    // jsdom has no Fullscreen API, so the control must stay out of the way.
    renderAt('/essays/essay-1?tab=practice');
    await screen.findByText(/Your learning path/i);
    expect(screen.queryByRole('button', { name: /Full screen/i })).not.toBeInTheDocument();
    cleanup();

    const request = vi.fn().mockResolvedValue(undefined);
    Element.prototype.requestFullscreen = request;
    try {
      renderAt('/essays/essay-1?tab=practice');
      await screen.findByText(/Your learning path/i);
      const button = screen.getByRole('button', { name: /Full screen/i });
      expect(button).toHaveAttribute('aria-pressed', 'false');
      fireEvent.click(button);
      expect(request).toHaveBeenCalled();
    } finally {
      delete Element.prototype.requestFullscreen;
    }
  });

  describe('Memorise — the Space gestures', () => {
    const sprint = () => screen.getByRole('application', { name: /Memorise — first letters/i });
    const answered = () => sprint().querySelectorAll('.animate-pop').length;
    const input = () => screen.getByLabelText(/Type the first letter of the next word/i);
    const press = (key) => fireEvent.keyDown(input(), { key });
    const tapSpace = () => { fireEvent.keyDown(input(), { key: ' ' }); fireEvent.keyUp(input(), { key: ' ' }); };

    it('three quick Space taps restart the sentence', async () => {
      api.getEssay.mockResolvedValue({
        essay: {
          ...parsedEssay,
          parsedStructure: { ...parsedEssay.parsedStructure, introduction: 'Alpha beta gamma. Delta epsilon zeta.' },
        },
      });
      renderAt('/essays/essay-1?tab=practice&mode=letters&scope=intro');
      await screen.findByRole('application', { name: /Memorise — first letters/i });

      ['a', 'b', 'g', 'd', 'e'].forEach(press);
      expect(answered()).toBe(5);

      // One tap does nothing; two taps do nothing; the third restarts the
      // sentence you are in — a chosen restart, so no slip is recorded.
      tapSpace();
      tapSpace();
      expect(answered()).toBe(5);
      tapSpace();
      expect(answered()).toBe(3);
      expect(screen.getByRole('status')).toHaveTextContent(/Sentence restarted/i);
      expect(screen.queryByText(/× restarted/)).not.toBeInTheDocument();
    });

    it('holding Space restarts the paragraph, and holding on restarts everything', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        api.getEssay.mockResolvedValue({ essay: parsedEssay });
        renderAt('/essays/essay-1?tab=practice&mode=letters');
        expect(await screen.findByText(/Introduction · 1 of 3/i)).toBeInTheDocument();

        // Finish the introduction and move on to the first body paragraph.
        ['s', 'p', 'a', 'a', 'd'].forEach(press);
        fireEvent.click(await screen.findByRole('button', { name: /Got it/i }));
        expect(await screen.findByText(/Body ¶1 · 2 of 3/i)).toBeInTheDocument();
        ['m', 'c'].forEach(press);
        expect(answered()).toBe(2);

        // Hold past the first stage: the paragraph restarts…
        fireEvent.keyDown(input(), { key: ' ' });
        await act(async () => { await vi.advanceTimersByTimeAsync(700); });
        expect(answered()).toBe(0);
        expect(screen.getByRole('status')).toHaveTextContent(/Paragraph restarted/i);
        expect(screen.getByText(/Body ¶1 · 2 of 3/i)).toBeInTheDocument();

        // …and holding on takes the whole run back to the top.
        await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
        fireEvent.keyUp(input(), { key: ' ' });
        expect(await screen.findByText(/Introduction · 1 of 3/i)).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent(/Back to the very top/i);
      } finally {
        vi.useRealTimers();
      }
    });

    it('typing a first letter re-masks the death reveal — no copying the passage', async () => {
      api.getEssay.mockResolvedValue({
        essay: {
          ...parsedEssay,
          parsedStructure: { ...parsedEssay.parsedStructure, introduction: 'Alpha beta gamma. Delta epsilon zeta.' },
        },
      });
      renderAt('/essays/essay-1?tab=practice&mode=letters&scope=intro');
      await screen.findByRole('application', { name: /Memorise — first letters/i });
      fireEvent.click(screen.getByRole('button', { name: 'Sentence' }));

      // A wrong first letter slips (sentence policy) and reveals.
      press('x');
      expect(sprint()).toHaveAttribute('data-revealed', 'true');

      // The very next keypress hides the passage again AND commits.
      press('a');
      expect(sprint()).not.toHaveAttribute('data-revealed');
      expect(answered()).toBe(1);
      // And a later slip reveals again — the cycle keeps working. (The slip
      // rewound the sentence, so the retry starts back on the first word.)
      press('x');
      expect(sprint()).toHaveAttribute('data-revealed', 'true');
      press('a');
      expect(sprint()).not.toHaveAttribute('data-revealed');
      expect(answered()).toBe(1);
    });

    it('remembers every slip and peek in a review, at the end and on demand', async () => {
      api.getEssay.mockResolvedValue({ essay: parsedEssay });
      renderAt('/essays/essay-1?tab=practice&mode=wordbyword&scope=intro');
      await screen.findByRole('application', { name: /Memorise — full words/i });
      fireEvent.click(screen.getByRole('button', { name: 'Sentence' }));
      const field = screen.getByLabelText(/Type the next word/i);
      const commit = (w) => {
        fireEvent.change(field, { target: { value: w } });
        fireEvent.keyDown(field, { key: ' ' });
        fireEvent.keyUp(field, { key: ' ' });
      };

      // Slip on the first word, then peek it on the retry — one entry, two marks.
      commit('nope');
      fireEvent.click(screen.getByRole('button', { name: 'Peek word' }));

      // Mid-run, the review opens from its button and names the damage.
      fireEvent.click(screen.getByRole('button', { name: /Review slips \(1\)/i }));
      expect(screen.getByText(/Where you tripped up/i)).toBeInTheDocument();
      expect(screen.getByText(/restarted you/)).toBeInTheDocument();
      expect(screen.getByText(/you typed “nope”/)).toBeInTheDocument();
      expect(screen.getByText(/peeked/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Close review/i }));
      expect(screen.queryByText(/Where you tripped up/i)).not.toBeInTheDocument();

      // Finish the section cleanly — the finish screen carries the review.
      ['Shakespeare', 'presents', 'ambition', 'as', 'destructive.'].forEach(commit);
      fireEvent.click(await screen.findByRole('button', { name: /Got it/i }));
      expect(await screen.findByText(/Where you tripped up/i)).toBeInTheDocument();
      expect(screen.getByText(/you typed “nope”/)).toBeInTheDocument();
      expect(screen.getByText(/Introduction/)).toBeInTheDocument();
    });

    it('a committing Space never counts towards the reset taps', async () => {
      api.getEssay.mockResolvedValue({ essay: parsedEssay });
      renderAt('/essays/essay-1?tab=practice&mode=wordbyword&scope=intro');
      await screen.findByRole('application', { name: /Memorise — full words/i });
      const field = screen.getByLabelText(/Type the next word/i);
      const commit = (w) => {
        fireEvent.change(field, { target: { value: w } });
        fireEvent.keyDown(field, { key: ' ' });
        fireEvent.keyUp(field, { key: ' ' });
      };
      // Three word commits in a row — three space keyups — must not restart.
      ['Shakespeare', 'presents', 'ambition'].forEach(commit);
      const stream = screen.getByRole('application', { name: /Memorise — full words/i });
      expect(stream.querySelectorAll('.animate-pop').length).toBe(3);
      expect(screen.queryByText(/Sentence restarted/i)).not.toBeInTheDocument();
    });
  });

  describe('Memorise — mistakes restart the chosen scope', () => {
    const stream = () => screen.getByRole('application', { name: /Memorise — full words/i });
    const answered = () => stream().querySelectorAll('.animate-pop').length;
    const typeWord = (w) => {
      const input = screen.getByLabelText(/Type the next word/i);
      fireEvent.change(input, { target: { value: w } });
      fireEvent.keyDown(input, { key: ' ' });
    };
    const conradEssay = () => ({
      ...parsedEssay,
      parsedStructure: {
        ...parsedEssay.parsedStructure,
        introduction: "Conrad's vision endures. Ambition corrupts entirely.",
      },
    });

    it('tolerates typos, flags punctuation slips, and restarts on wrong letters', async () => {
      api.getEssay.mockResolvedValue({ essay: conradEssay() });
      renderAt('/essays/essay-1?tab=practice&mode=perfect&scope=intro');
      await screen.findByRole('application', { name: /Memorise — full words/i });
      fireEvent.click(screen.getByRole('button', { name: 'Sentence' }));

      // "Conrad's" typed lowercase, no apostrophe, letters transposed → in.
      typeWord('conrdas');
      expect(answered()).toBe(1);
      expect(screen.getByTitle(/Close enough — you typed/)).toBeInTheDocument();

      // A missing full stop warns in amber but does NOT restart.
      typeWord('vision');
      typeWord('endures');
      expect(answered()).toBe(3);
      expect(screen.getByTitle('Punctuation slip — you typed “endures”')).toBeInTheDocument();
      expect(screen.queryByText(/restarted/i)).not.toBeInTheDocument();

      // Wrong LETTERS still kill: back to the start of the sentence you are in.
      ['ambition', 'corrupts'].forEach(typeWord);
      expect(answered()).toBe(5);
      typeWord('collapses');
      expect(answered()).toBe(3);
      expect(screen.getByRole('status')).toHaveTextContent(/sentence restarted/i);
    });

    it('can restart the paragraph or the entire run instead', async () => {
      api.getEssay.mockResolvedValue({ essay: conradEssay() });
      renderAt('/essays/essay-1?tab=practice&mode=perfect&scope=intro');
      await screen.findByRole('application', { name: /Memorise — full words/i });

      fireEvent.click(screen.getByRole('button', { name: 'Paragraph' }));
      ['conrads', 'vision', 'endures.', 'ambition'].forEach(typeWord);
      expect(answered()).toBe(4);
      typeWord('wrong');
      expect(answered()).toBe(0);
      expect(screen.getByRole('status')).toHaveTextContent(/paragraph restarted/i);
      cleanup();

      // Everything: a slip in Body ¶1 sends the run back to the Introduction.
      api.getEssay.mockResolvedValue({ essay: parsedEssay });
      renderAt('/essays/essay-1?tab=practice&mode=perfect');
      await screen.findByText(/Introduction · 1 of 3/i);
      fireEvent.click(screen.getByRole('button', { name: 'Everything' }));
      ['shakespeare', 'presents', 'ambition', 'as', 'destructive.'].forEach(typeWord);
      fireEvent.click(await screen.findByRole('button', { name: /Got it/i }));
      expect(await screen.findByText(/Body ¶1 · 2 of 3/i)).toBeInTheDocument();
      typeWord('wrong');
      expect(await screen.findByText(/Introduction · 1 of 3/i)).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(/back to the top/i);
    });

    it('Tab cycles hidden → word → passage → hidden; a long hold toggles blind', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        api.getEssay.mockResolvedValue({ essay: conradEssay() });
        renderAt('/essays/essay-1?tab=practice&mode=perfect&scope=intro');
        await screen.findByRole('application', { name: /Memorise — full words/i });
        const input = screen.getByLabelText(/Type the next word/i);
        const tap = () => {
          fireEvent.keyDown(input, { key: 'Tab' });
          fireEvent.keyUp(input, { key: 'Tab' });
        };

        // First tap: just the word, at the peek price.
        tap();
        expect(screen.getByText('97%')).toBeInTheDocument();
        expect(stream()).not.toHaveAttribute('data-revealed');
        // Second tap: the whole passage. Third: hidden again.
        tap();
        expect(stream()).toHaveAttribute('data-revealed', 'true');
        tap();
        expect(stream()).not.toHaveAttribute('data-revealed');
        // No rewind ladder here — nothing restarted.
        expect(screen.queryByText(/restarted/i)).not.toBeInTheDocument();

        // A long hold toggles fully-blind cues instead of cycling the peek.
        fireEvent.keyDown(input, { key: 'Tab' });
        // The toggle fires from a timer, outside React's event batching —
        // flush it inside act() so the re-render is guaranteed to land.
        await act(async () => { await vi.advanceTimersByTimeAsync(500); });
        fireEvent.keyUp(input, { key: 'Tab' });
        expect(screen.getByText(/Fully blind — no cues/i)).toBeInTheDocument();
        expect(stream()).not.toHaveAttribute('data-revealed');

        // Holding again brings the cues back.
        fireEvent.keyDown(input, { key: 'Tab' });
        await act(async () => { await vi.advanceTimersByTimeAsync(500); });
        fireEvent.keyUp(input, { key: 'Tab' });
        expect(screen.getByText(/Cues back on/i)).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('tuned resets escalate: sentence, then 2 sentences, then the paragraph, then over again', async () => {
      api.getEssay.mockResolvedValue({ essay: conradEssay() });
      renderAt('/essays/essay-1?tab=practice&mode=perfect&scope=intro');
      await screen.findByRole('application', { name: /Memorise — full words/i });

      fireEvent.click(screen.getByRole('button', { name: 'Tuned…' }));
      // The editor opens seeded with the commissioning ladder.
      const steps = screen.getAllByRole('combobox');
      expect(steps.map((el) => el.value)).toEqual(['s1', 's2', 'paragraph']);

      // Into sentence two, then the 1st mistake: back one sentence.
      ['conrads', 'vision', 'endures.', 'ambition'].forEach(typeWord);
      expect(answered()).toBe(4);
      typeWord('wrong');
      expect(answered()).toBe(3);
      expect(screen.getByRole('status')).toHaveTextContent(/sentence restarted/i);

      // 2nd mistake from sentence two: back TWO sentences — the whole intro.
      typeWord('ambition');
      typeWord('wrong');
      expect(answered()).toBe(0);
      expect(screen.getByRole('status')).toHaveTextContent(/back 2 sentences/i);

      // 3rd mistake: the paragraph rung.
      typeWord('conrads');
      typeWord('wrong');
      expect(answered()).toBe(0);
      expect(screen.getByRole('status')).toHaveTextContent(/paragraph restarted/i);

      // The ladder topped out, so it starts over: 4th mistake is a sentence.
      ['conrads', 'vision', 'endures.', 'ambition'].forEach(typeWord);
      typeWord('wrong');
      expect(answered()).toBe(3);
      expect(screen.getByRole('status')).toHaveTextContent(/sentence restarted/i);

      // The ladder is editable: retune step 1 to the paragraph and it fires.
      fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'paragraph' } });
      typeWord('ambition');
      typeWord('wrong');
      expect(answered()).toBe(0);
      expect(screen.getByRole('status')).toHaveTextContent(/paragraph restarted/i);
    });

    it('a full stop inside a quotation is not a reset point', async () => {
      // Sentence one contains a quote with its own terminators; sentence two
      // starts at word 6. A naive splitter would break inside the quote and
      // rewind a mistake to "Go." instead of the real sentence start.
      api.getEssay.mockResolvedValue({
        essay: {
          ...parsedEssay,
          parsedStructure: {
            ...parsedEssay.parsedStructure,
            introduction: 'He cites "Stop. Go." boldly here. Second sentence now.',
          },
        },
      });
      renderAt('/essays/essay-1?tab=practice&mode=perfect&scope=intro');
      await screen.findByRole('application', { name: /Memorise — full words/i });
      fireEvent.click(screen.getByRole('button', { name: 'Sentence' }));

      // Four words in — past the quote, still inside sentence one.
      ['he', 'cites', 'stop.', 'go."'].forEach(typeWord);
      expect(answered()).toBe(4);
      typeWord('wrong');
      // The whole first sentence rewinds — not just back to inside the quote.
      expect(answered()).toBe(0);

      // And with sentence one done, a slip in sentence two lands on word 6.
      ['he', 'cites', 'stop.', 'go."', 'boldly', 'here.', 'second'].forEach(typeWord);
      expect(answered()).toBe(7);
      typeWord('wrong');
      expect(answered()).toBe(6);
    });

    it('reveals the passage on death and hides it again when you type', async () => {
      api.getEssay.mockResolvedValue({ essay: conradEssay() });
      renderAt('/essays/essay-1?tab=practice&mode=perfect&scope=intro');
      await screen.findByRole('application', { name: /Memorise — full words/i });
      fireEvent.click(screen.getByRole('button', { name: 'Sentence' }));
      expect(stream()).not.toHaveAttribute('data-revealed');

      // Death lays the passage bare and marks the word that killed the pass.
      typeWord('wrong');
      expect(stream()).toHaveAttribute('data-revealed', 'true');
      expect(screen.getByTitle('You slipped here — you typed “wrong”')).toBeInTheDocument();

      // The first keystroke of the retry masks it again.
      fireEvent.change(screen.getByLabelText(/Type the next word/i), { target: { value: 'c' } });
      expect(stream()).not.toHaveAttribute('data-revealed');
      // …but the death marker stays until you make it past that word.
      expect(screen.getByTitle('You slipped here — you typed “wrong”')).toBeInTheDocument();
    });

    it('strict letters keeps caps and apostrophes forgiven but drops the fuzz', async () => {
      api.getEssay.mockResolvedValue({ essay: conradEssay() });
      renderAt('/essays/essay-1?tab=practice&mode=perfect&scope=intro');
      await screen.findByRole('application', { name: /Memorise — full words/i });

      fireEvent.click(screen.getByRole('button', { name: /Exact letters/i }));
      typeWord('conrdas');
      expect(answered()).toBe(0);
      typeWord('conrads');
      expect(answered()).toBe(1);
    });
  });

  describe('Memorise — Fix & go (the default) and the scenes', () => {
    const stream = () => screen.getByRole('application', { name: /Memorise — full words/i });
    const answered = () => stream().querySelectorAll('.animate-pop').length;
    const typeWord = (w) => {
      const input = screen.getByLabelText(/Type the next word/i);
      fireEvent.change(input, { target: { value: w } });
      fireEvent.keyDown(input, { key: ' ' });
    };
    const conradEssay = () => ({
      ...parsedEssay,
      parsedStructure: {
        ...parsedEssay.parsedStructure,
        introduction: "Conrad's vision endures. Ambition corrupts entirely.",
      },
    });

    it('a wrong word shows the answer, takes the retype, and never restarts', async () => {
      api.getEssay.mockResolvedValue({ essay: conradEssay() });
      renderAt('/essays/essay-1?tab=practice&mode=perfect&scope=intro');
      await screen.findByRole('application', { name: /Memorise — full words/i });

      // Wrong word: calm corrective feedback — the answer appears at the
      // centre, nothing rewinds, nothing is laid bare.
      typeWord('vision');
      expect(answered()).toBe(0);
      expect(screen.getByRole('status')).toHaveTextContent(/Read it, then type it back/i);
      expect(screen.getByLabelText(/Conrad's — type it back/i)).toBeInTheDocument();
      expect(stream()).not.toHaveAttribute('data-revealed');
      expect(screen.queryByText(/restarted/i)).not.toBeInTheDocument();

      // Typing it back moves on, recorded as the original wrong attempt.
      typeWord('conrads');
      expect(answered()).toBe(1);
      expect(screen.getByTitle(/You typed “vision”/)).toBeInTheDocument();

      // And the rest of the run continues normally.
      typeWord('vision');
      expect(answered()).toBe(2);
    });

    it('first letters: a wrong press reveals the word and waits for the right letter', async () => {
      api.getEssay.mockResolvedValue({ essay: conradEssay() });
      renderAt('/essays/essay-1?tab=practice&mode=letters&scope=intro');
      const sprint = await screen.findByRole('application', { name: /Memorise — first letters/i });
      const press = (key) => fireEvent.keyDown(screen.getByLabelText(/Type the first letter/i), { key });

      press('x');
      // No advance, no passage reveal, no restart — just the word, revealed.
      expect(sprint.querySelectorAll('.animate-pop').length).toBe(0);
      expect(sprint).not.toHaveAttribute('data-revealed');
      expect(screen.queryByText(/restarted/i)).not.toBeInTheDocument();

      press('c');
      expect(sprint.querySelectorAll('.animate-pop').length).toBe(1);
    });

    it('Watch plays the words by itself at the chosen pace, and Space pauses', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        api.getEssay.mockResolvedValue({ essay: conradEssay() });
        renderAt('/essays/essay-1?tab=practice&mode=perfect&scope=intro');
        await screen.findByRole('application', { name: /Memorise — full words/i });
        fireEvent.click(screen.getByRole('button', { name: /^Watch$/ }));

        // Default pace is 160 wpm — one word every 375ms, no typing needed.
        // One beat lands per 400ms window regardless of when the next beat
        // is re-armed, so step window by window.
        await act(async () => { await vi.advanceTimersByTimeAsync(400); });
        expect(answered()).toBe(1);
        await act(async () => { await vi.advanceTimersByTimeAsync(400); });
        expect(answered()).toBe(2);

        // Space pauses the roll…
        const input = screen.getByLabelText(/Type the next word/i);
        fireEvent.keyDown(input, { key: ' ' });
        fireEvent.keyUp(input, { key: ' ' });
        await act(async () => { await vi.advanceTimersByTimeAsync(1200); });
        expect(answered()).toBe(2);

        // …and Space again resumes it. Watching never counts as recall.
        fireEvent.keyDown(input, { key: ' ' });
        fireEvent.keyUp(input, { key: ' ' });
        await act(async () => { await vi.advanceTimersByTimeAsync(400); });
        expect(answered()).toBe(3);
        expect(screen.getByText('100%')).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('Watch rolls into the next paragraph by itself after 5s, looping at the end', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        api.getEssay.mockResolvedValue({ essay: conradEssay() });
        renderAt('/essays/essay-1?tab=practice&mode=perfect&scope=intro');
        await screen.findByRole('application', { name: /Memorise — full words/i });
        fireEvent.click(screen.getByRole('button', { name: /^Watch$/ }));

        // Roll through all 6 intro words, one beat per window.
        for (let i = 0; i < 6; i++) {
          await act(async () => { await vi.advanceTimersByTimeAsync(400); });
        }
        expect(screen.getByText(/watched 6 words/i)).toBeInTheDocument();
        expect(screen.getByText(/Rolling on in 5 seconds/i)).toBeInTheDocument();

        // No click: 5s later the scope loops back around and rolls again.
        await act(async () => { await vi.advanceTimersByTimeAsync(5100); });
        expect(screen.queryByText(/watched 6 words/i)).not.toBeInTheDocument();
        expect(answered()).toBeLessThanOrEqual(1);
        await act(async () => { await vi.advanceTimersByTimeAsync(450); });
        expect(answered()).toBeGreaterThanOrEqual(1);
        // No grade was auto-submitted for the watched pass.
        expect(api.submitReview).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('Focus and Party take the screen, Party pops confetti per word, Esc leaves', async () => {
      api.getEssay.mockResolvedValue({ essay: conradEssay() });
      renderAt('/essays/essay-1?tab=practice&mode=perfect&scope=intro');
      await screen.findByRole('application', { name: /Memorise — full words/i });

      // Focus: the word dial owns the screen and the entry ritual plays.
      fireEvent.click(screen.getByRole('button', { name: /^Focus$/ }));
      expect(screen.getByRole('button', { name: /^Focus$/ })).toHaveAttribute('aria-pressed', 'true');
      expect(stream().classList.contains('trance-stream')).toBe(true);
      expect(screen.getByText(/Everything but the next word is gone/i)).toBeInTheDocument();

      // Esc ends the scene.
      fireEvent.keyDown(screen.getByLabelText(/Type the next word/i), { key: 'Escape' });
      expect(screen.getByRole('button', { name: /^Focus$/ })).toHaveAttribute('aria-pressed', 'false');
      expect(stream().classList.contains('trance-stream')).toBe(false);

      // Trance: the vortex canvas mounts (still, in jsdom) with the dial.
      fireEvent.click(screen.getByRole('button', { name: /^Trance$/ }));
      expect(screen.getByRole('button', { name: /^Trance$/ })).toHaveAttribute('aria-pressed', 'true');
      expect(stream().classList.contains('trance-stream')).toBe(true);
      expect(document.querySelector('canvas')).not.toBeNull();
      fireEvent.keyDown(screen.getByLabelText(/Type the next word/i), { key: 'Escape' });
      expect(screen.getByRole('button', { name: /^Trance$/ })).toHaveAttribute('aria-pressed', 'false');

      // Party: every landed word earns a confetti burst, and the DJ deck is
      // on the wall.
      fireEvent.click(screen.getByRole('button', { name: /^Party$/ }));
      expect(screen.getByLabelText(/Tempo fader/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Glitter fader/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Party$/ })).toHaveAttribute('aria-pressed', 'true');
      expect(document.querySelectorAll('.animate-party-burst').length).toBe(0);
      typeWord('conrads');
      // Burst size follows the Drops fader: 6 + round(0.6 * 12) at rest.
      expect(document.querySelectorAll('.animate-party-burst').length).toBe(13);
      fireEvent.keyDown(screen.getByLabelText(/Type the next word/i), { key: 'Escape' });
      expect(screen.getByRole('button', { name: /^Party$/ })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('shows planning labels as annotations, never as exam prose', async () => {
    const annotated = {
      id: 'essay-notes',
      title: 'Conrad and Walcott',
      originalText: 'Cry\nTo interrogate the moral crises engendered by colonialism.',
      parsedStructure: {
        thesis: '',
        introduction: '',
        bodyParagraphs: [{
          heading: 'Cry',
          notes: ['two slots to fill'],
          topicSentence: 'To interrogate the moral crises engendered by colonialism.',
          text: 'To interrogate the moral crises engendered by colonialism.',
          quotes: [],
          techniques: [],
        }],
        conclusion: '',
      },
    };
    api.getEssay.mockResolvedValue({ essay: annotated });
    renderAt('/essays/essay-notes');

    // The label renders as a marked annotation beside the paragraph, and the
    // note as a pencil line — both outside the prose itself.
    const marked = await screen.findAllByTitle(/not part of the exam prose/i);
    expect(marked.length).toBeGreaterThan(0);
    expect(marked.some((el) => el.textContent.includes('Cry'))).toBe(true);
    expect(screen.getAllByText(/✎ two slots to fill/).length).toBeGreaterThan(0);
    screen.getAllByText(/To interrogate the moral crises/).forEach((prose) => {
      expect(prose.textContent).not.toContain('Cry');
    });
  });

  it('keeps the workspace tabs visible for an unparsed essay', async () => {
    const savedEssay = { id: 'essay-3', title: 'Unparsed', originalText: 'Some text.', parsedStructure: null };
    api.getEssay.mockResolvedValue({ essay: savedEssay });
    renderAt('/essays/essay-3?tab=edit');

    expect(await screen.findByLabelText(/Essay text/i)).toBeInTheDocument();
    // Switching to Practice must not strand the user — the tab bar stays and
    // the setup card renders instead of a blank page.
    fireEvent.click(screen.getByRole('button', { name: /Practice/i }));
    expect(await screen.findByRole('button', { name: /Set up practice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Edit$/i })).toBeInTheDocument();
  });

  it('edits the essay in place and rescans with the chosen model', async () => {
    api.getEssay.mockResolvedValue({ essay: parsedEssay });
    const updated = { ...parsedEssay, originalText: 'A new body paragraph only.', parsedStructure: null };
    api.updateEssay.mockResolvedValueOnce({ essay: updated });
    api.parseEssay.mockResolvedValueOnce({ essay: { ...updated, parsedStructure: parsedEssay.parsedStructure } });

    renderAt('/essays/essay-1?tab=edit');
    const textarea = await screen.findByLabelText(/Essay text/i);
    fireEvent.change(textarea, { target: { value: 'A new body paragraph only.' } });
    fireEvent.click(screen.getByRole('button', { name: /Save & rescan/i }));

    await waitFor(() => expect(api.updateEssay).toHaveBeenCalledWith('essay-1', {
      title: 'Macbeth: ambition',
      text: 'A new body paragraph only.',
    }));
    await waitFor(() => expect(api.parseEssay).toHaveBeenCalledWith('essay-1', expect.objectContaining({ model: 'gpt-5.4-mini' })));
  });

  it('requires confirmation before deleting and surfaces delete failures', async () => {
    api.getEssay.mockResolvedValue({ essay: parsedEssay });
    api.deleteEssay.mockRejectedValueOnce(new Error('Network down'));

    renderAt('/essays/essay-1');
    await screen.findByRole('heading', { name: /Macbeth: ambition/i });

    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }));
    expect(screen.getByText(/There is no undo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Delete essay/i }));

    expect(await screen.findByText(/Network down/i)).toBeInTheDocument();
    // The essay is still there — a failed delete never pretends to succeed.
    expect(screen.getByRole('heading', { name: /Macbeth: ambition/i })).toBeInTheDocument();
  });

  it('shows setup with a model picker when unparsed, without asking for AI permission on failure', async () => {
    const savedEssay = { id: 'essay-2', title: 'Macbeth', originalText: 'Power corrupts Macbeth.', parsedStructure: null };
    api.getEssay.mockResolvedValue({ essay: savedEssay });
    api.parseEssay.mockRejectedValueOnce(new Error('AI assistance is temporarily paused.'));

    renderAt('/essays/essay-2');
    expect(await screen.findByRole('button', { name: /Set up practice/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Set up practice/i }));

    expect(await screen.findByText(/AI assistance is temporarily paused/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.request).not.toHaveBeenCalledWith('/privacy/consents', expect.anything());
    expect(screen.getByRole('button', { name: /Try setup again/i })).toBeInTheDocument();
  });

  it('scores typed words with smart-quote tolerance', async () => {
    const essay = {
      id: 'essay-quotes',
      parsedStructure: {
        bodyParagraphs: [{ text: 'It’s Macbeth’s downfall', quotes: [], techniques: [] }],
      },
    };
    render(<MemoriseDrill essay={essay} initialUnit="word" />);
    const input = screen.getByRole('textbox');
    // Typed with a straight apostrophe; target has curly ones.
    fireEvent.change(input, { target: { value: "It's" } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('scores accented words typed on a plain keyboard, both transliteration styles', async () => {
    // The old comparator DELETED accented letters (café → caf) so these
    // words could never be typed correctly in any drill.
    const essay = {
      id: 'essay-accents',
      parsedStructure: {
        bodyParagraphs: [{ text: 'Café Größe für École', quotes: [], techniques: [] }],
      },
    };
    render(<MemoriseDrill essay={essay} initialUnit="word" />);
    const input = screen.getByRole('textbox');
    for (const word of ['Cafe', 'Groesse', 'fur', 'Ecole']) {
      fireEvent.change(input, { target: { value: word } });
      fireEvent.keyDown(input, { key: 'Enter' });
    }
    expect(screen.getByText('100%')).toBeInTheDocument();
  });


  it('keeps source material in a context library, separate from the essay', async () => {
    api.getEssay.mockResolvedValue({ essay: parsedEssay });
    api.getEssayContext.mockResolvedValueOnce({
      docs: [{ id: 'doc-1', title: 'Marker feedback', kind: 'text', chars: 420, preview: 'Push the analysis further…' }],
    });
    api.addEssayContext.mockResolvedValueOnce({
      doc: { id: 'doc-2', title: 'Quote bank', kind: 'text', chars: 90, preview: 'the horror…' },
    });
    renderAt('/essays/essay-1?tab=context');

    expect(await screen.findByText('Marker feedback')).toBeInTheDocument();
    expect(screen.getByText(/1\/12 sources/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Add source/i }));
    fireEvent.change(screen.getByLabelText(/Source name/i), { target: { value: 'Quote bank' } });
    fireEvent.change(screen.getByLabelText(/Source text/i), { target: { value: 'the horror, the horror' } });
    fireEvent.click(screen.getByRole('button', { name: /Add to context/i }));

    await waitFor(() => expect(api.addEssayContext).toHaveBeenCalledWith('essay-1', {
      title: 'Quote bank', kind: 'text', content: 'the horror, the horror',
    }));
    expect(await screen.findByText('Quote bank')).toBeInTheDocument();
  });

  it('adds a paragraph annotation from the document margin', async () => {
    api.getEssay.mockResolvedValue({ essay: parsedEssay });
    api.addEssayAnnotation.mockResolvedValueOnce({
      annotation: { id: 'ann-1', paragraphIndex: 0, anchor: '', note: 'Link this back to the thesis.', kind: 'note', source: 'user' },
    });
    renderAt('/essays/essay-1');

    fireEvent.click(await screen.findByRole('button', { name: /Add a note to paragraph 1/i }));
    fireEvent.change(screen.getByLabelText(/^Note text$/i), { target: { value: 'Link this back to the thesis.' } });
    fireEvent.click(screen.getByRole('button', { name: /Save note/i }));

    await waitFor(() => expect(api.addEssayAnnotation).toHaveBeenCalledWith('essay-1', {
      paragraphIndex: 0, anchor: '', note: 'Link this back to the thesis.', kind: 'note',
    }));
    // Generous timeout: CI runners under load flaked at the default 1s.
    expect(await screen.findByText('Link this back to the thesis.', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('shows existing annotations in the margin and can delete one', async () => {
    api.getEssay.mockResolvedValue({ essay: parsedEssay });
    api.getEssayAnnotations.mockResolvedValueOnce({
      annotations: [
        { id: 'ann-1', paragraphIndex: 0, anchor: 'ambition over loyalty', note: 'Strong evidence here.', kind: 'note', source: 'user' },
        { id: 'ann-2', paragraphIndex: 0, anchor: '', note: 'This paragraph argues X.', kind: 'explanation', source: 'ai' },
      ],
    });
    renderAt('/essays/essay-1');

    expect(await screen.findByText('Strong evidence here.')).toBeInTheDocument();
    expect(screen.getByText('This paragraph argues X.')).toBeInTheDocument();
    expect(screen.getByText('Explanation')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /Delete note/i })[0]);
    await waitFor(() => expect(api.deleteEssayAnnotation).toHaveBeenCalledWith('essay-1', 'ann-1'));
  });

  it('answers in the assistant and can push a suggestion into the margin', async () => {
    api.getEssay.mockResolvedValue({ essay: parsedEssay });
    api.essayChat.mockResolvedValueOnce({
      reply: 'Your second paragraph **leans on assertion** rather than evidence.',
      annotations: [{ paragraphIndex: 0, anchor: 'ambition over loyalty', note: 'Add a quote to support this.' }],
    });
    api.addEssayAnnotation.mockResolvedValueOnce({
      annotation: { id: 'ann-9', paragraphIndex: 0, anchor: 'ambition over loyalty', note: 'Add a quote to support this.', kind: 'note', source: 'ai' },
    });
    renderAt('/essays/essay-1');

    fireEvent.click(await screen.findByRole('button', { name: /Ask about this essay/i }));
    fireEvent.change(screen.getByLabelText(/Message the assistant/i), { target: { value: 'How is my evidence?' } });
    fireEvent.click(screen.getByRole('button', { name: /Send message/i }));

    // The reply is markdown — the **bold** span must render as <strong>,
    // never as raw asterisks.
    const bold = await screen.findByText('leans on assertion');
    expect(bold.tagName).toBe('STRONG');
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
    await waitFor(() => expect(api.essayChat).toHaveBeenCalledWith('essay-1', expect.objectContaining({
      messages: [{ role: 'user', content: 'How is my evidence?' }],
    })));

    fireEvent.click(screen.getByRole('button', { name: /Add to margin/i }));
    await waitFor(() => expect(api.addEssayAnnotation).toHaveBeenCalledWith('essay-1', {
      paragraphIndex: 0, anchor: 'ambition over loyalty', note: 'Add a quote to support this.', kind: 'note',
    }));
  });

  // Scoping is expressed in body-paragraph indices, so the scoped list can
  // never name the introduction or conclusion. Handing that list to the speed
  // run unconditionally silently dropped both from EVERY run — the whole essay
  // was never typeable and the intro/conclusion presets never appeared.
  it('offers the introduction and conclusion to the speed run when nothing is scoped', async () => {
    api.getEssay.mockResolvedValue({ essay: parsedEssay });
    renderAt('/essays/essay-1?tab=practice&mode=speed');

    expect(await screen.findByRole('button', { name: 'Introduction' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Conclusion' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Just the intro/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Just the conclusion/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Last BP \+ conclusion/i })).toBeInTheDocument();
    expect(screen.queryByText(/Scoped to your selected paragraph/i)).not.toBeInTheDocument();
  });

  it('narrows the speed run to the selected paragraphs once a scope is set', async () => {
    api.getEssay.mockResolvedValue({
      ...{},
      essay: {
        ...parsedEssay,
        parsedStructure: {
          ...parsedEssay.parsedStructure,
          bodyParagraphs: [
            { topicSentence: 'Macbeth chooses ambition over loyalty.', text: 'Macbeth chooses ambition over loyalty.', quotes: [], techniques: [] },
            { topicSentence: 'Lady Macbeth drives the plan.', text: 'Lady Macbeth drives the plan.', quotes: [], techniques: [] },
          ],
        },
      },
    });
    renderAt('/essays/essay-1?tab=practice&mode=speed&scope=1');

    expect(await screen.findByRole('button', { name: 'Body ¶2' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Introduction' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Body ¶1' })).not.toBeInTheDocument();
    expect(screen.getByText(/Scoped to your selected paragraph/i)).toBeInTheDocument();
  });

  it('generates paragraph explanations on demand', async () => {
    api.getEssay.mockResolvedValue({ essay: parsedEssay });
    api.explainEssay.mockResolvedValueOnce({
      annotations: [{ id: 'ex-1', paragraphIndex: 0, anchor: '', note: 'Argues ambition overrides loyalty.', kind: 'explanation', source: 'ai' }],
    });
    renderAt('/essays/essay-1');

    fireEvent.click(await screen.findByRole('button', { name: /Explain every paragraph/i }));
    await waitFor(() => expect(api.explainEssay).toHaveBeenCalledWith('essay-1', expect.any(Object)));
    expect(await screen.findByText('Argues ambition overrides loyalty.')).toBeInTheDocument();
  });

  it('penalises each uniquely revealed word once and persists hint-aware completion scoring', () => {
    const essay = {
      id: 'essay-hints',
      parsedStructure: {
        bodyParagraphs: [{ text: 'Alpha beta gamma delta', quotes: [], techniques: [] }],
      },
    };
    render(<MemoriseDrill essay={essay} initialUnit="word" />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Alpha' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('100%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Peek word' }));
    expect(screen.getByText('97%')).toBeInTheDocument();
    expect(screen.getByLabelText(/beta, revealed with a hint/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Peek word: beta/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Peek word' }));
    expect(screen.getByText('97%')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'beta' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Peek word' }));
    expect(screen.getByText('94%')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'gamma' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: 'delta' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /Got it/i }));

    expect(api.submitReview).toHaveBeenCalledWith(
      'essayParagraph',
      'essay-hints:0',
      'pass',
      { mode: 'word_by_word', policy: 'retype', accuracy: 94, hintCount: 2, restarts: 0, watched: 0 },
    );
  });
});
