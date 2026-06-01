/**
 * Avatar helpers — DiceBear "adventurer" style.
 *
 * Phase 1 (makeshift): we render avatars via DiceBear's free HTTP API (no npm
 * dependency). Each customization option is a "catalog item"; right now they're
 * all free. Later, items can carry a cost / unlockLevel and an ownership check
 * without changing how avatars are rendered or stored.
 */

const BASE_URL = 'https://api.dicebear.com/9.x/adventurer/svg';

export const DEFAULT_AVATAR_CONFIG = {
  seed: 'Caplet',
  backgroundColor: 'b6e3f4',
  skinColor: 'f2d3b1',
  hair: 'short01',
  hairColor: '0e0e0e',
  eyes: 'variant01',
  eyebrows: 'variant01',
  mouth: 'variant01',
  glasses: '', // '' = none
};

/**
 * Build a DiceBear SVG URL from an avatar config.
 * @param {object} config
 * @param {{size?: number}} opts
 */
export function buildAvatarUrl(config = {}, { size = 160 } = {}) {
  const c = { ...DEFAULT_AVATAR_CONFIG, ...(config || {}) };
  const params = new URLSearchParams();
  params.set('seed', c.seed || 'Caplet');
  params.set('size', String(size));
  if (c.backgroundColor) params.set('backgroundColor', c.backgroundColor);
  if (c.skinColor) params.set('skinColor', c.skinColor);
  if (c.hair) params.set('hair', c.hair);
  if (c.hairColor) params.set('hairColor', c.hairColor);
  if (c.eyes) params.set('eyes', c.eyes);
  if (c.eyebrows) params.set('eyebrows', c.eyebrows);
  if (c.mouth) params.set('mouth', c.mouth);
  if (c.glasses) {
    params.set('glasses', c.glasses);
    params.set('glassesProbability', '100');
  } else {
    params.set('glassesProbability', '0');
  }
  return `${BASE_URL}?${params.toString()}`;
}

/**
 * The customization catalog. `type: 'color'` renders as swatches, `type: 'style'`
 * as labelled buttons. Every option here is free in Phase 1 (cost: 0); the
 * `cost`/`unlockLevel` fields are reserved for the future currency system.
 */
export const AVATAR_CATALOG = [
  {
    key: 'hair',
    label: 'Hair',
    type: 'style',
    options: [
      { value: 'short01', label: 'Short 1' },
      { value: 'short02', label: 'Short 2' },
      { value: 'short04', label: 'Short 3' },
      { value: 'short07', label: 'Short 4' },
      { value: 'long01', label: 'Long 1' },
      { value: 'long03', label: 'Long 2' },
      { value: 'long10', label: 'Long 3' },
      { value: 'long20', label: 'Long 4' },
    ],
  },
  {
    key: 'hairColor',
    label: 'Hair colour',
    type: 'color',
    options: [
      { value: '0e0e0e', label: 'Black' },
      { value: '562306', label: 'Dark brown' },
      { value: '6a4e35', label: 'Brown' },
      { value: 'ab2a18', label: 'Auburn' },
      { value: 'cb6820', label: 'Ginger' },
      { value: 'e5d7a3', label: 'Blonde' },
      { value: 'afafaf', label: 'Grey' },
      { value: 'dba3be', label: 'Pink' },
    ],
  },
  {
    key: 'skinColor',
    label: 'Skin tone',
    type: 'color',
    options: [
      { value: 'f2d3b1', label: 'Light' },
      { value: 'ecad80', label: 'Medium' },
      { value: '9e5622', label: 'Tan' },
      { value: '763900', label: 'Deep' },
    ],
  },
  {
    key: 'eyes',
    label: 'Eyes',
    type: 'style',
    options: [
      { value: 'variant01', label: 'Eyes 1' },
      { value: 'variant04', label: 'Eyes 2' },
      { value: 'variant09', label: 'Eyes 3' },
      { value: 'variant12', label: 'Eyes 4' },
      { value: 'variant22', label: 'Eyes 5' },
      { value: 'variant26', label: 'Eyes 6' },
    ],
  },
  {
    key: 'eyebrows',
    label: 'Eyebrows',
    type: 'style',
    options: [
      { value: 'variant01', label: 'Brows 1' },
      { value: 'variant05', label: 'Brows 2' },
      { value: 'variant10', label: 'Brows 3' },
      { value: 'variant15', label: 'Brows 4' },
    ],
  },
  {
    key: 'mouth',
    label: 'Mouth',
    type: 'style',
    options: [
      { value: 'variant01', label: 'Mouth 1' },
      { value: 'variant05', label: 'Mouth 2' },
      { value: 'variant10', label: 'Mouth 3' },
      { value: 'variant19', label: 'Mouth 4' },
      { value: 'variant26', label: 'Mouth 5' },
      { value: 'variant30', label: 'Mouth 6' },
    ],
  },
  {
    key: 'glasses',
    label: 'Glasses',
    type: 'style',
    options: [
      { value: '', label: 'None' },
      { value: 'variant01', label: 'Glasses 1' },
      { value: 'variant02', label: 'Glasses 2' },
      { value: 'variant03', label: 'Glasses 3' },
      { value: 'variant05', label: 'Glasses 4' },
    ],
  },
  {
    key: 'backgroundColor',
    label: 'Background',
    type: 'color',
    options: [
      { value: 'b6e3f4', label: 'Blue' },
      { value: 'c0aede', label: 'Purple' },
      { value: 'd1d4f9', label: 'Lavender' },
      { value: 'ffd5dc', label: 'Pink' },
      { value: 'ffdfbf', label: 'Peach' },
      { value: 'd9f5d6', label: 'Mint' },
    ],
  },
];
