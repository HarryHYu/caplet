import { SLIDE_PALETTE } from './slideSchema';

export const SLASH_COMMANDS = SLIDE_PALETTE.map((p) => ({
  slug: p.type === 'choice-tf' ? 'tf' : p.type,
  label: p.label,
  desc: p.desc,
  paletteType: p.type,
}));
