import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import CourseIcon from '../components/CourseIcon';
import { getCourseIcon } from '../lib/courseIcons';

afterEach(() => cleanup());

describe('CourseIcon', () => {
  it('chooses a local icon from the course category or title', () => {
    expect(getCourseIcon({ title: 'Economics foundations' }).key).toBe('investment');
    expect(getCourseIcon({ category: 'tax', title: 'Tax basics' }).key).toBe('tax');
    expect(getCourseIcon({ title: 'New course' }).key).toBe('default');
  });

  it('renders an SVG fallback instead of a placeholder image', () => {
    const { container } = render(<CourseIcon course={{ title: 'Budgeting 101' }} />);

    expect(screen.getByTestId('course-icon')).toHaveAttribute('data-course-icon', 'budgeting');
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });
});
