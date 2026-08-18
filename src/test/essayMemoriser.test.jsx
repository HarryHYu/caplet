import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

import EssayMemoriser, { GuidedTypeMode } from '../pages/EssayMemoriser';
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
    // Four consolidated tools — overlapping modes became option toggles.
    expect(screen.getByRole('button', { name: /Rebuild it/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /First letters/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exam run/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Review/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Sentences$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Openings$/i })).not.toBeInTheDocument();
    // Unavailable drills (no quotes, one paragraph) are hidden, not dead ends.
    expect(screen.queryByRole('button', { name: /Quote cards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Paragraph order/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Rebuild it/i }));
    expect(await screen.findByText(/Step 1 of 4/i)).toBeInTheDocument();
    // The merged tool exposes its unit options inside the mode.
    expect(screen.getByRole('button', { name: /Word by word/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sentence by sentence/i })).toBeInTheDocument();
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

    const chip = await screen.findByRole('button', { name: /Practising: All 2 paragraphs/i });
    fireEvent.click(chip);
    // Deselect the first paragraph — practice narrows to the second.
    fireEvent.click(screen.getByRole('checkbox', { name: /¶1/ }));
    expect(screen.getByRole('button', { name: /Practising: 1 of 2 paragraphs/i })).toBeInTheDocument();
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
    render(<GuidedTypeMode essay={essay} />);
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
    render(<GuidedTypeMode essay={essay} />);
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
    render(<GuidedTypeMode essay={essay} />);

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
      { mode: 'word_by_word', accuracy: 94, hintCount: 2 },
    );
  });
});
