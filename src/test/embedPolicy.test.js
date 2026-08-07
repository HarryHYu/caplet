import { describe, expect, it } from 'vitest';
import { isAllowedEmbedUrl } from '../lib/embedPolicy';

describe('embed URL policy', () => {
  it('allows the curated interactive providers', () => {
    expect(isAllowedEmbedUrl('https://phet.colorado.edu/sims/html/projectile-motion/latest/projectile-motion_en.html')).toBe(true);
    expect(isAllowedEmbedUrl('https://www.geogebra.org/classic')).toBe(true);
    expect(isAllowedEmbedUrl('https://www.google.com/maps/embed/v1/place?key=demo&q=Sydney')).toBe(true);
  });

  it('rejects active content and arbitrary hosts', () => {
    expect(isAllowedEmbedUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedEmbedUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isAllowedEmbedUrl('https://attacker.example/embed')).toBe(false);
    expect(isAllowedEmbedUrl('http://www.geogebra.org/classic')).toBe(false);
    expect(isAllowedEmbedUrl('https://www.google.com/')).toBe(false);
  });
});
