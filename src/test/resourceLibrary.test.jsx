import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import LibrarySubject from '../pages/LibrarySubject';
import ResourceLibrary from '../pages/ResourceLibrary';

function renderEconomics(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/library/economics/:section/:focusId" element={<ResourceLibrary />} />
        <Route path="/library/economics/:section" element={<ResourceLibrary />} />
        <Route path="/library/:subject" element={<LibrarySubject />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ResourceLibrary page', () => {
  it('gives students focused destinations from the Economics overview', () => {
    renderEconomics('/library/economics');

    expect(screen.getByRole('heading', { name: 'Economics' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Year 11 Foundations/i })).toHaveAttribute('href', '/library/economics/year-11');
    expect(screen.getByRole('link', { name: /Year 12 HSC course/i })).toHaveAttribute('href', '/library/economics/year-12');
    expect(screen.getByRole('link', { name: /Timed practice Exam packs/i })).toHaveAttribute('href', '/library/economics/exam-practice');
  });

  it('turns a year page into a simple topic picker', () => {
    renderEconomics('/library/economics/year-11');

    expect(screen.getByRole('heading', { name: /Build the economic toolkit/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Introduction to economics/i })).toHaveAttribute('href', '/library/economics/focus/year-11-introduction-to-economics');
    expect(screen.queryByRole('navigation', { name: 'Economics library' })).not.toBeInTheDocument();
  });

  it('routes a topic into the persisted practice and mastery loop', () => {
    renderEconomics('/library/economics/focus/year-11-introduction-to-economics');

    expect(screen.getByRole('heading', { name: 'Introduction to economics' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Take the quick Economics diagnostic/i })).toHaveAttribute('href', expect.stringContaining('focusId=year-11-introduction-to-economics'));
    expect(screen.getByText(/Answers now run through the same saved practice session/i)).toBeInTheDocument();
  });

  it('keeps the overview free of duplicate navigation and count blocks', () => {
    renderEconomics('/library/economics');
    expect(screen.queryByRole('navigation', { name: 'Economics library' })).not.toBeInTheDocument();
    expect(screen.queryByText('Focus areas')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Learn' })).toHaveAttribute('href', '/library');
    expect(screen.getAllByRole('link')).toHaveLength(6);
  });
});
