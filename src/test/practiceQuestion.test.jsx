import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PracticeQuestion from '../components/learning/PracticeQuestion';

describe('PracticeQuestion', () => {
  it('separates supplied material from the task and gives written work room to breathe', () => {
    render(
      <PracticeQuestion
        question={{
          id: 'question-with-material',
          prompt: 'A rise in interest rates changes household spending.\n\nExplain one way this can reduce inflation.',
          responseType: 'extended_response',
          expectedMinutes: 12,
          marks: 6,
          outcomes: [{ code: 'E12.4', title: 'Monetary policy' }],
        }}
        submitting={false}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('Read the material')).toBeInTheDocument();
    expect(screen.getByText('A rise in interest rates changes household spending.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Explain one way this can reduce inflation.' })).toBeInTheDocument();
    expect(screen.getByLabelText('Write your response')).toHaveAttribute('rows', '14');
    expect(screen.getByText('12 min')).toBeInTheDocument();
  });
});
