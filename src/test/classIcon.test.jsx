import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import ClassIcon from '../components/ClassIcon';
import { getClassIcon } from '../lib/classIcons';

afterEach(() => cleanup());

describe('ClassIcon', () => {
  it('chooses a subject-aware local fallback icon', () => {
    expect(getClassIcon('Year 12 Economics').key).toBe('economics');
    expect(getClassIcon('Advanced Mathematics').key).toBe('mathematics');
    expect(getClassIcon('Homeroom').key).toBe('default');
  });

  it('renders without a remote placeholder image', () => {
    const { container } = render(<ClassIcon name="Science Club" />);

    expect(screen.getByTestId('class-icon')).toHaveAttribute('data-class-icon', 'science');
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });
});
