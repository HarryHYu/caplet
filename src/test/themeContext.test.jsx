import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

function ThemeControls() {
  const { theme, setTheme, palette, setPalette, isDark } = useTheme();
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <span data-testid="appearance">{isDark ? 'dark' : 'light'}</span>
      <span data-testid="palette">{palette}</span>
      <button type="button" onClick={() => setTheme('light')}>Light</button>
      <button type="button" onClick={() => setTheme('dark')}>Dark</button>
      <button type="button" onClick={() => setTheme('system')}>System</button>
      <button type="button" onClick={() => setPalette('sage')}>Sage</button>
    </>
  );
}

describe('ThemeProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    delete document.documentElement.dataset.palette;
  });

  it('defaults to the device setting and follows changes in system mode', () => {
    let listener;
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      addEventListener: (_event, callback) => { listener = callback; },
      removeEventListener: () => {},
    })));

    render(<ThemeProvider><ThemeControls /></ThemeProvider>);

    expect(screen.getByTestId('theme')).toHaveTextContent('system');
    expect(screen.getByTestId('appearance')).toHaveTextContent('dark');

    act(() => listener({ matches: false }));
    expect(screen.getByTestId('appearance')).toHaveTextContent('light');
  });

  it('persists explicit light and dark choices', () => {
    render(<ThemeProvider><ThemeControls /></ThemeProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(document.documentElement).toHaveClass('dark');

    fireEvent.click(screen.getByRole('button', { name: 'Light' }));
    expect(localStorage.getItem('theme')).toBe('light');
    expect(document.documentElement).not.toHaveClass('dark');
  });

  it('persists a site-wide background palette on the document root', () => {
    render(<ThemeProvider><ThemeControls /></ThemeProvider>);

    expect(screen.getByTestId('palette')).toHaveTextContent('paper');
    expect(document.documentElement).toHaveAttribute('data-palette', 'paper');

    fireEvent.click(screen.getByRole('button', { name: 'Sage' }));

    expect(localStorage.getItem('palette')).toBe('sage');
    expect(document.documentElement).toHaveAttribute('data-palette', 'sage');
  });
});
