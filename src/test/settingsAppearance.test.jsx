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

    expect(screen.getByRole('radio', { name: /System/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Vertical bar/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('offers global palettes and keeps a chosen palette in dark mode', () => {
    localStorage.setItem('theme', 'dark');
    render(<ThemeProvider><LayoutProvider><SettingsAppearance /></LayoutProvider></ThemeProvider>);

    expect(screen.getByRole('radio', { name: /Pure white/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Sky/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Rose/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Vertical bar/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Dark/ })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: /Sage/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Top bar/ }));

    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('palette')).toBe('sage');
    expect(localStorage.getItem('caplet:nav-mode')).toBe('horizontal');
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement).toHaveAttribute('data-palette', 'sage');
    expect(screen.getByText('Previewing dark colours')).toBeInTheDocument();
  });
});
