# Caplet theme

## Compact token summary

- Light Paper: body `#F8F5EF`, soft `#ECE5D6`, raised `#FCFAF4`, primary text `#1C1A16`, muted `#756F63`, accent `#1351AA`.
- Dark Paper: body `#141413`, soft `#232220`, raised `#1c1b19`, primary text `#F2EEE4`, muted `#B4AD9E`, accent `#5B9BF0`.
- Warm blocks: cream, blue, amber, green are tokenized as `--block-*`; dark mode supplies restrained translucent equivalents.
- Type: Bricolage Grotesque for display, Hanken Grotesk for body, Shantell Sans for handwritten kickers, Lora for editorial accents, JetBrains Mono for data/code.
- Common radii: 12px, 16px, and 24px (`rounded-xl`, `rounded-2xl`, `rounded-3xl`).
- Layout: `.container-custom` is max-width 1400px with 24/48/80px responsive horizontal padding.
- Tailwind breakpoints are defaults; dark mode is class-based.

## Source tokens

```css
:root {
  --surface-body: #F8F5EF; --surface-soft: #ECE5D6; --surface-raised: #FCFAF4;
  --text-primary: #1C1A16; --text-muted: #756F63; --text-dim: #6F685C;
  --line-soft: #DCD4C2; --accent: #1351AA; --accent-strong: #0E3D82; --accent-soft: rgba(19,81,170,.1);
  --mark-blue: #1351AA; --block-cream: #FBF7EF; --block-blue: rgba(19,81,170,.07); --block-amber: rgba(235,166,60,.15); --block-green: rgba(63,157,107,.09);
}
.dark {
  --surface-body: #141413; --surface-soft: #232220; --surface-raised: #1c1b19;
  --text-primary: #F2EEE4; --text-muted: #B4AD9E; --text-dim: #AAA294;
  --line-soft: #322F2A; --accent: #5B9BF0; --accent-strong: #498ff5; --accent-soft: rgba(43,118,226,.15);
  --mark-blue: #5B9BF0; --block-cream: #1d1d1b; --block-blue: rgba(91,155,240,.12); --block-amber: rgba(240,187,92,.12); --block-green: rgba(95,192,140,.11);
}
.container-custom { max-width: 1400px; margin-inline: auto; padding-inline: 1.5rem; }
.btn-primary { background: var(--accent); color: white; border-radius: 1rem; font-weight: 700; }
```

Tailwind maps `accent`, `surface-*`, `text-*`, and `line-*` utilities directly to these CSS custom properties; see `tailwind.config.js` and `src/index.css` for complete source.
