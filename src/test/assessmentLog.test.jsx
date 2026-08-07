import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssessmentLog from '../pages/AssessmentLog';
import { saveAssessmentAttachment } from '../lib/assessmentAttachmentStore';

vi.mock('../lib/assessmentAttachmentStore', () => ({
  saveAssessmentAttachment: vi.fn().mockResolvedValue(undefined),
  getAssessmentAttachment: vi.fn(),
  deleteAssessmentAttachment: vi.fn().mockResolvedValue(undefined),
}));

describe('AssessmentLog', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('caplet:my-subjects', JSON.stringify(['Economics', 'English Advanced']));
    vi.clearAllMocks();
  });

  it('logs marks, weighting, reflection and a scan', async () => {
    const user = userEvent.setup();
    render(<AssessmentLog />);

    await user.click(screen.getByRole('button', { name: 'Log result' }));
    await user.selectOptions(screen.getByLabelText('Result term'), 'Term 2');
    await user.type(screen.getByLabelText('Task name'), 'Economic policies essay');
    await user.type(screen.getByLabelText('Date'), '2026-06-12');
    await user.type(screen.getByLabelText('Weighting (%)'), '25');
    await user.type(screen.getByLabelText('Marks achieved'), '42');
    await user.type(screen.getByLabelText('Total marks'), '50');
    await user.type(screen.getByLabelText('Reflection'), 'Use evidence more precisely.');
    const scan = new File(['scan'], 'marked-task.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText(/Scanned task/), scan);
    await user.click(screen.getByRole('button', { name: 'Save result' }));

    expect(screen.getByText('Economic policies essay')).toBeInTheDocument();
    expect(screen.getAllByText('84%')).toHaveLength(2);
    expect(screen.getByText('Use evidence more precisely.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open scan/ })).toBeInTheDocument();
    expect(saveAssessmentAttachment).toHaveBeenCalledWith(expect.any(String), scan);
  });

  it('rejects impossible marks and filters by term', async () => {
    const user = userEvent.setup();
    localStorage.setItem('caplet:assessment-log', JSON.stringify([{ id: 'one', term: 'Term 1', subject: 'Economics', taskName: 'Topic test', date: '2026-02-10', score: '18', maxMarks: '20', weighting: '10', reflection: '' }]));
    render(<AssessmentLog />);

    expect(screen.getByRole('heading', { name: 'Results', level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by term')).toHaveClass('appearance-none', 'rounded-xl');

    await user.selectOptions(screen.getByLabelText('Filter by term'), 'Term 2');
    expect(screen.queryByText('Topic test')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Filter by term'), 'Term 1');
    expect(screen.getByText('Topic test')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Log result' }));
    await user.type(screen.getByLabelText('Task name'), 'Invalid result');
    await user.type(screen.getByLabelText('Date'), '2026-08-01');
    await user.type(screen.getByLabelText('Weighting (%)'), '20');
    await user.type(screen.getByLabelText('Marks achieved'), '51');
    await user.type(screen.getByLabelText('Total marks'), '50');
    await user.click(screen.getByRole('button', { name: 'Save result' }));
    expect(screen.getByRole('alert')).toHaveTextContent('cannot be higher');
  });
});
