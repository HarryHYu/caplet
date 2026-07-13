import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const OPTIONS = {
  yearLevels: [{ value: '12', label: 'Year 12' }],
  subjects: [{
    value: 'economics',
    label: 'Economics',
    topics: ['Macroeconomic management'],
    diagnostic: {
      topic: 'Macroeconomic management',
      question: 'Which measure tracks the general price level?',
      options: ['Consumer Price Index', 'Unemployment rate', 'Terms of trade', 'Cash balance'],
    },
  }],
};

const PLAN = {
  id: 'plan-1',
  yearLevel: '12',
  subjects: ['economics'],
  goal: 'Prepare consistently',
  examDates: { economics: '2026-09-01' },
  availableDays: [1, 3, 5],
  minutesPerDay: 45,
  diagnosticAnswers: { economics: 0 },
  signalSummary: 'Built from your quick subject diagnostic and exam deadlines.',
  weakTopics: [{ subject: 'economics', subjectLabel: 'Economics', topic: 'Macroeconomic management', reason: 'Diagnostic result' }],
  tasks: [{
    id: 'task-1',
    dueDate: '2026-07-10',
    subject: 'economics',
    subjectLabel: 'Economics',
    topic: 'Macroeconomic management',
    title: 'Learn: Macroeconomic management',
    resourceLabel: 'Economics resource library',
    resourcePath: '/library/economics',
    estimatedMinutes: 45,
    priority: 'high',
    completed: false,
  }],
};

vi.mock('../services/api', () => ({
  default: {
    getStudyPlan: vi.fn(),
    generateStudyPlan: vi.fn(),
    regenerateStudyPlan: vi.fn(),
    updateStudyTask: vi.fn(),
    getNextRecommendation: vi.fn(),
  },
}));

import api from '../services/api';
import StudyPlan from '../pages/StudyPlan';

const renderPage = () => render(<MemoryRouter><StudyPlan /></MemoryRouter>);

describe('StudyPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getStudyPlan.mockResolvedValue({ studyPlan: null, options: OPTIONS });
    api.getNextRecommendation.mockResolvedValue({ recommendation: null });
    api.generateStudyPlan.mockResolvedValue({ studyPlan: PLAN, options: OPTIONS });
    api.regenerateStudyPlan.mockResolvedValue({ studyPlan: PLAN, options: OPTIONS });
    api.updateStudyTask.mockResolvedValue({ studyPlan: { ...PLAN, tasks: [{ ...PLAN.tasks[0], completed: true }] } });
  });

  it('completes the short onboarding diagnostic and generates a plan', async () => {
    renderPage();
    expect(await screen.findByText(/ready in under five minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/concrete seven-day plan/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Economics' }));
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    fireEvent.change(screen.getByLabelText(/Economics exam date/i), { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Consumer Price Index' }));
    fireEvent.click(screen.getByRole('button', { name: /Build my plan/i }));

    expect(await screen.findByRole('heading', { name: /My study plan/i })).toBeInTheDocument();
    expect(api.generateStudyPlan).toHaveBeenCalledWith(expect.objectContaining({
      subjects: ['economics'],
      examDates: { economics: '2026-09-01' },
      diagnosticAnswers: { economics: 0 },
    }));
  });

  it('surfaces the next real resource and persists task completion', async () => {
    api.getStudyPlan.mockResolvedValue({ studyPlan: PLAN, options: OPTIONS });
    renderPage();
    expect((await screen.findAllByText(/Learn: Macroeconomic management/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Economics resource library/i })[0]).toHaveAttribute('href', '/library/economics');
    fireEvent.click(screen.getByRole('button', { name: /Mark complete/i }));
    await waitFor(() => expect(api.updateStudyTask).toHaveBeenCalledWith('task-1', true));
    expect(await screen.findByRole('status')).toHaveTextContent('Nice work');
  });
});
