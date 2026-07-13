import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  default: {
    request: vi.fn(),
    editorEnter: vi.fn(),
    clearEditorToken: vi.fn(),
  },
}));

import api from '../services/api';
import { emptyQuestion, questionPayload } from '../lib/questionBank';
import QuestionBank from '../pages/QuestionBank';

const OUTCOMES = [
  {
    id: 'outcome-1',
    subject: 'economics',
    code: 'E12.3',
    title: 'Price stability',
    description: 'Analyse causes and consequences of inflation.',
    yearLevel: '12',
    syllabusVersion: 'NESA 2025',
  },
  {
    id: 'outcome-2',
    subject: 'economics',
    code: 'E12.4',
    title: 'Monetary policy',
    yearLevel: '12',
    syllabusVersion: 'NESA 2025',
  },
];

const QUESTION = {
  id: 'question-1',
  questionKey: 'econ-cpi-1',
  version: 1,
  subject: 'economics',
  syllabusVersion: 'NESA 2025',
  prompt: 'Which measure tracks changes in the general price level?',
  responseType: 'multiple_choice',
  options: ['Consumer Price Index', 'Gross Domestic Product'],
  answerKey: { index: 0, value: 'Consumer Price Index' },
  explanation: 'The CPI measures price changes in a representative basket.',
  difficulty: 'standard',
  marks: 1,
  expectedMinutes: 2,
  commandVerb: 'Identify',
  rubric: ['Selects the Consumer Price Index.'],
  modelAnswer: 'Consumer Price Index.',
  misconceptions: ['gdp-is-price-level'],
  source: { title: 'NESA Economics syllabus', url: 'https://example.edu/syllabus', author: 'NESA', year: '2025', notes: 'Adapted for practice.' },
  sourceKey: 'nesa-cpi-1',
  outcomeIds: ['outcome-1'],
  outcomes: [OUTCOMES[0]],
  lifecycleStatus: 'draft',
  metadata: {},
  updatedAt: '2026-07-12T00:00:00.000Z',
};

const HISTORY = [{
  id: 'revision-1',
  version: 1,
  lifecycleStatus: 'draft',
  changeSummary: 'Question created',
  createdAt: '2026-07-12T00:00:00.000Z',
}];

function requestResponse(endpoint, options = {}) {
  const method = options.method || 'GET';
  if (endpoint === '/editor/curriculum-outcomes') return Promise.resolve({ outcomes: OUTCOMES });
  if (endpoint.startsWith('/editor/questions?')) return Promise.resolve({ questions: [QUESTION] });
  if (endpoint === '/editor/questions/question-1/history') return Promise.resolve({ revisions: HISTORY });
  if (endpoint === '/editor/questions' && method === 'POST') {
    const body = JSON.parse(options.body);
    return Promise.resolve({ question: { ...QUESTION, ...body, id: 'created-question', questionKey: 'created-key', version: 1, lifecycleStatus: 'draft', outcomes: OUTCOMES.filter((outcome) => body.outcomeIds.includes(outcome.id)) } });
  }
  if (endpoint === '/editor/questions/question-1' && method === 'PUT') {
    const body = JSON.parse(options.body);
    return Promise.resolve({ question: { ...QUESTION, ...body, version: 2 } });
  }
  if (endpoint === '/editor/questions/question-1/lifecycle' && method === 'POST') {
    const body = JSON.parse(options.body);
    return Promise.resolve({ question: { ...QUESTION, lifecycleStatus: body.status } });
  }
  return Promise.reject(new Error(`Unexpected editor request: ${method} ${endpoint}`));
}

function renderPage() {
  return render(<MemoryRouter><QuestionBank /></MemoryRouter>);
}

describe('QuestionBank', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    api.editorEnter.mockResolvedValue({ token: 'editor-token', workspace: { id: 'workspace-1', label: 'Economics' } });
    api.request.mockImplementation(requestResponse);
  });

  it('uses the private editor code before loading the workspace', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Enter the question bank.' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Workspace code'), { target: { value: 'private-code' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open question bank' }));

    expect(await screen.findByRole('heading', { name: 'Question bank.' })).toBeInTheDocument();
    expect(api.editorEnter).toHaveBeenCalledWith('private-code');
    expect(api.request).toHaveBeenCalledWith('/editor/curriculum-outcomes', { auth: 'editor' });
    expect(await screen.findByText(QUESTION.prompt)).toBeInTheDocument();
  });

  it('queries the bank with subject, lifecycle, search, and outcome filters', async () => {
    window.sessionStorage.setItem('editorToken', 'editor-token');
    renderPage();
    await screen.findByText(QUESTION.prompt);

    fireEvent.change(screen.getByLabelText('Filter by lifecycle status'), { target: { value: 'published' } });
    fireEvent.change(screen.getByLabelText('Filter by syllabus outcome'), { target: { value: 'outcome-1' } });
    fireEvent.change(screen.getByLabelText('Search question bank'), { target: { value: 'inflation' } });
    fireEvent.submit(screen.getByLabelText('Search question bank').closest('form'));

    await waitFor(() => expect(api.request).toHaveBeenCalledWith(
      '/editor/questions?subject=economics&status=published&search=inflation&outcomeId=outcome-1',
      { auth: 'editor' },
    ));
  });

  it('creates a complete syllabus-mapped multiple-choice draft', async () => {
    window.sessionStorage.setItem('editorToken', 'editor-token');
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'New question' }));

    fireEvent.change(screen.getByLabelText('Syllabus version'), { target: { value: 'NESA 2025' } });
    fireEvent.change(screen.getByLabelText(/Question prompt/), { target: { value: 'What does the CPI measure?' } });
    fireEvent.change(screen.getByLabelText(/Marks/), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText(/Expected time \(minutes\)/), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Difficulty'), { target: { value: 'challenging' } });
    fireEvent.change(screen.getByLabelText('Command verb'), { target: { value: 'Explain' } });
    fireEvent.change(screen.getByLabelText('Option 1'), { target: { value: 'Changes in a representative basket of prices' } });
    fireEvent.change(screen.getByLabelText('Option 2'), { target: { value: 'Changes in real output' } });
    fireEvent.click(screen.getByLabelText('Mark option 1 correct'));
    fireEvent.change(screen.getByLabelText('Answer explanation'), { target: { value: 'The CPI measures changes in consumer prices.' } });
    fireEvent.change(screen.getByLabelText('Rubric'), { target: { value: 'Identifies the CPI\nExplains the representative basket' } });
    fireEvent.change(screen.getByLabelText('Model answer'), { target: { value: 'It measures changes in a representative basket.' } });
    fireEvent.change(screen.getByLabelText('Common misconceptions'), { target: { value: 'cpi-is-output' } });
    fireEvent.change(screen.getByLabelText('Source title'), { target: { value: 'NESA syllabus' } });
    fireEvent.change(screen.getByLabelText('Source URL'), { target: { value: 'https://example.edu/nesa' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /E12.3.*Price stability/i }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Save draft' })[0]);

    await waitFor(() => expect(api.request).toHaveBeenCalledWith('/editor/questions', expect.objectContaining({ method: 'POST', auth: 'editor' })));
    const call = api.request.mock.calls.find(([endpoint, options]) => endpoint === '/editor/questions' && options.method === 'POST');
    const payload = JSON.parse(call[1].body);
    expect(payload).toMatchObject({
      subject: 'economics',
      syllabusVersion: 'NESA 2025',
      prompt: 'What does the CPI measure?',
      responseType: 'multiple_choice',
      marks: 2,
      expectedMinutes: 3,
      difficulty: 'challenging',
      commandVerb: 'Explain',
      options: ['Changes in a representative basket of prices', 'Changes in real output'],
      answerKey: { index: 0, value: 'Changes in a representative basket of prices' },
      rubric: ['Identifies the CPI', 'Explains the representative basket'],
      misconceptions: ['cpi-is-output'],
      outcomeIds: ['outcome-1'],
    });
    expect(payload.source).toMatchObject({ title: 'NESA syllabus', url: 'https://example.edu/nesa' });
    expect(await screen.findByText('Question draft created.')).toBeInTheDocument();
  });

  it('edits a versioned question and displays its history', async () => {
    window.sessionStorage.setItem('editorToken', 'editor-token');
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(QUESTION.prompt) }));

    expect(await screen.findByText(/Question created/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Question prompt/), { target: { value: 'Which index measures changes in the general price level?' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save draft' })[0]);

    await waitFor(() => expect(api.request).toHaveBeenCalledWith('/editor/questions/question-1', expect.objectContaining({ method: 'PUT', auth: 'editor' })));
    expect(await screen.findByText('Saved version 2.')).toBeInTheDocument();
  });

  it('requires human review before approval and confirms publishing', async () => {
    window.sessionStorage.setItem('editorToken', 'editor-token');
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: new RegExp(QUESTION.prompt) }));

    fireEvent.click(await screen.findByRole('button', { name: 'Submit for review' }));
    await waitFor(() => expect(api.request).toHaveBeenCalledWith('/editor/questions/question-1/lifecycle', {
      method: 'POST',
      body: JSON.stringify({ status: 'in_review', humanReviewed: false }),
      auth: 'editor',
    }));

    expect(await screen.findByText('I completed a human review')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /I completed a human review/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(api.request).toHaveBeenCalledWith('/editor/questions/question-1/lifecycle', {
      method: 'POST',
      body: JSON.stringify({ status: 'approved', humanReviewed: true }),
      auth: 'editor',
    }));

    fireEvent.click(await screen.findByRole('button', { name: 'Publish question' }));
    expect(screen.getByRole('alertdialog', { name: 'Move this question to Published?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm published' }));
    await waitFor(() => expect(api.request).toHaveBeenCalledWith('/editor/questions/question-1/lifecycle', {
      method: 'POST',
      body: JSON.stringify({ status: 'published', humanReviewed: false }),
      auth: 'editor',
    }));
    expect(await screen.findByText('Question moved to Published.')).toBeInTheDocument();
  });

  it('shows accessible validation and protects unsaved work', async () => {
    window.sessionStorage.setItem('editorToken', 'editor-token');
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'New question' }));
    fireEvent.change(screen.getByLabelText(/Question prompt/), { target: { value: 'Incomplete question' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save draft' })[0]);
    expect(screen.getByRole('alert')).toHaveTextContent('Add at least two answer options.');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Discard unsaved changes?' });
    expect(dialog).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByLabelText(/Question prompt/)).toHaveValue('Incomplete question');
  });

  it('keeps the selected answer aligned when blank options are omitted', () => {
    const draft = {
      ...emptyQuestion('economics'),
      prompt: 'Which option is correct?',
      options: ['', 'First populated option', 'Second populated option'],
      correctOptionIndex: 1,
    };

    expect(questionPayload(draft)).toMatchObject({
      options: ['First populated option', 'Second populated option'],
      answerKey: { index: 0, value: 'First populated option' },
    });
  });
});
