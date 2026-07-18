import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LearningNextAction from '../components/learning/LearningNextAction';
import { actionDetails } from '../components/learning/learningNextActionUtils';

vi.mock('../services/api', () => ({ default: { logEvent: vi.fn() } }));

describe('LearningNextAction', () => {
  it('prioritises resume, then a study task, then a recommendation', () => {
    const action = actionDetails({
      resume: { href: '/practice?session=one', title: 'Resume' },
      studyTask: { href: '/study-plan', title: 'Plan task' },
      recommendation: { resourcePath: '/practice?mode=daily' },
      source: 'dashboard',
    });
    expect(action.type).toBe('resume');
    expect(action.href).toBe('/practice?session=one');
  });

  it('provides a diagnostic action when a learner has no evidence yet', () => {
    render(<MemoryRouter><LearningNextAction source="library" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Take the quick Economics diagnostic/i })).toHaveAttribute('href', expect.stringContaining('mode=diagnostic'));
  });
});
