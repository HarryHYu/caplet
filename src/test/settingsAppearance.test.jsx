import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ThemeProvider } from '../contexts/ThemeContext';
import SettingsAppearance from '../pages/SettingsAppearance';

describe('SettingsAppearance', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    delete document.documentElement.dataset.palette;
  });

  it('offers global palettes and keeps a chosen palette in dark mode', () => {
    localStorage.setItem('theme', 'dark');
    render(<ThemeProvider><SettingsAppearance /></ThemeProvider>);

    expect(screen.getByRole('radio', { name: /Pure white/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Sky/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Rose/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: /Sage/ }));

    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('palette')).toBe('sage');
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement).toHaveAttribute('data-palette', 'sage');
    expect(screen.getByText('Previewing dark colours')).toBeInTheDocument();
  });
});
