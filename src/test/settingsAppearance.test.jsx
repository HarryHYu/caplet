import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ThemeProvider } from '../contexts/ThemeContext';
import { LayoutProvider } from '../contexts/LayoutContext';
import SettingsAppearance from '../pages/SettingsAppearance';

describe('SettingsAppearance', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    delete document.documentElement.dataset.palette;
  });

  it('starts new devices with system appearance and the vertical navigation rail', () => {
    render(<ThemeProvider><LayoutProvider><SettingsAppearance /></LayoutProvider></ThemeProvider>);

    expect(screen.getByRole('button', { name: /System/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Vertical bar/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('offers global palettes and keeps a chosen palette in dark mode', () => {
    localStorage.setItem('theme', 'dark');
    render(<ThemeProvider><LayoutProvider><SettingsAppearance /></LayoutProvider></ThemeProvider>);

    const pureWhite = screen.getByRole('button', { name: /Pure white/ });
    const pureWhiteSwatches = pureWhite.querySelectorAll('span[style]');
    expect(pureWhite).toBeInTheDocument();
    expect(pureWhiteSwatches[0]).toHaveStyle({ backgroundColor: '#141413' });
    expect(pureWhiteSwatches[1]).toHaveStyle({ backgroundColor: '#232220' });
    expect(pureWhiteSwatches[2]).toHaveStyle({ backgroundColor: '#5B9BF0' });
    expect(screen.getByRole('button', { name: /Sky/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rose/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vertical bar/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Dark/ })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /Sage/ }));
    fireEvent.click(screen.getByRole('button', { name: /Top bar/ }));

    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('palette')).toBe('sage');
    expect(localStorage.getItem('caplet:nav-mode')).toBe('horizontal');
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement).toHaveAttribute('data-palette', 'sage');
    expect(screen.getByText('Previewing dark colours')).toBeInTheDocument();
  });
});
