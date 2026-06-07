/**
 * Avatar cosmetics catalog — the single source of truth for what exists and
 * what it costs. Served to the client (shop + customizer) and used server-side
 * to validate purchases and equipping (never trust the client for price).
 *
 * Item id = `${category}:${value}`. Free items (cost 0) are owned by everyone
 * implicitly; paid items must be purchased into `user_items`.
 *
 * `type`: 'color' renders as swatches, 'style' as labelled buttons.
 * Designed generically so non-cosmetic item types can be added later.
 */

const CATALOG = [
  {
    key: 'hair', label: 'Hair', type: 'style',
    options: [
      { value: 'short01', label: 'Short 1', cost: 0 },
      { value: 'short02', label: 'Short 2', cost: 0 },
      { value: 'short04', label: 'Short 3', cost: 0 },
      { value: 'long01', label: 'Long 1', cost: 0 },
      { value: 'short07', label: 'Short 4', cost: 50, rarity: 'common' },
      { value: 'long03', label: 'Long 2', cost: 50, rarity: 'common' },
      { value: 'long10', label: 'Long 3', cost: 80, rarity: 'rare' },
      { value: 'long20', label: 'Long 4', cost: 120, rarity: 'epic' },
    ],
  },
  {
    key: 'hairColor', label: 'Hair colour', type: 'color',
    options: [
      { value: '0e0e0e', label: 'Black', cost: 0 },
      { value: '6a4e35', label: 'Brown', cost: 0 },
      { value: 'e5d7a3', label: 'Blonde', cost: 0 },
      { value: '562306', label: 'Dark brown', cost: 30, rarity: 'common' },
      { value: 'ab2a18', label: 'Auburn', cost: 40, rarity: 'common' },
      { value: 'cb6820', label: 'Ginger', cost: 40, rarity: 'common' },
      { value: 'afafaf', label: 'Grey', cost: 60, rarity: 'rare' },
      { value: 'dba3be', label: 'Pink', cost: 80, rarity: 'rare' },
    ],
  },
  {
    key: 'skinColor', label: 'Skin tone', type: 'color',
    options: [
      { value: 'f2d3b1', label: 'Light', cost: 0 },
      { value: 'ecad80', label: 'Medium', cost: 0 },
      { value: '9e5622', label: 'Tan', cost: 0 },
      { value: '763900', label: 'Deep', cost: 0 },
    ],
  },
  {
    key: 'eyes', label: 'Eyes', type: 'style',
    options: [
      { value: 'variant01', label: 'Eyes 1', cost: 0 },
      { value: 'variant04', label: 'Eyes 2', cost: 0 },
      { value: 'variant09', label: 'Eyes 3', cost: 30, rarity: 'common' },
      { value: 'variant12', label: 'Eyes 4', cost: 30, rarity: 'common' },
      { value: 'variant22', label: 'Eyes 5', cost: 50, rarity: 'rare' },
      { value: 'variant26', label: 'Eyes 6', cost: 50, rarity: 'rare' },
    ],
  },
  {
    key: 'eyebrows', label: 'Eyebrows', type: 'style',
    options: [
      { value: 'variant01', label: 'Brows 1', cost: 0 },
      { value: 'variant05', label: 'Brows 2', cost: 0 },
      { value: 'variant10', label: 'Brows 3', cost: 20, rarity: 'common' },
      { value: 'variant15', label: 'Brows 4', cost: 20, rarity: 'common' },
    ],
  },
  {
    key: 'mouth', label: 'Mouth', type: 'style',
    options: [
      { value: 'variant01', label: 'Mouth 1', cost: 0 },
      { value: 'variant05', label: 'Mouth 2', cost: 0 },
      { value: 'variant10', label: 'Mouth 3', cost: 20, rarity: 'common' },
      { value: 'variant19', label: 'Mouth 4', cost: 30, rarity: 'common' },
      { value: 'variant26', label: 'Mouth 5', cost: 40, rarity: 'rare' },
      { value: 'variant30', label: 'Mouth 6', cost: 40, rarity: 'rare' },
    ],
  },
  {
    key: 'glasses', label: 'Glasses', type: 'style',
    options: [
      { value: '', label: 'None', cost: 0 },
      { value: 'variant01', label: 'Glasses 1', cost: 0 },
      { value: 'variant02', label: 'Glasses 2', cost: 40, rarity: 'common' },
      { value: 'variant03', label: 'Glasses 3', cost: 40, rarity: 'common' },
      { value: 'variant05', label: 'Glasses 4', cost: 60, rarity: 'rare' },
    ],
  },
  {
    key: 'backgroundColor', label: 'Background', type: 'color',
    options: [
      { value: 'b6e3f4', label: 'Blue', cost: 0 },
      { value: 'c0aede', label: 'Purple', cost: 0 },
      { value: 'd1d4f9', label: 'Lavender', cost: 20, rarity: 'common' },
      { value: 'ffd5dc', label: 'Pink', cost: 20, rarity: 'common' },
      { value: 'ffdfbf', label: 'Peach', cost: 20, rarity: 'common' },
      { value: 'd9f5d6', label: 'Mint', cost: 40, rarity: 'rare' },
    ],
  },
];

function itemId(category, value) {
  return `${category}:${value}`;
}

// Flat lookup: itemId -> { id, category, value, label, cost, rarity }
const INDEX = {};
for (const cat of CATALOG) {
  for (const opt of cat.options) {
    const id = itemId(cat.key, opt.value);
    INDEX[id] = { id, category: cat.key, value: opt.value, label: opt.label, cost: opt.cost || 0, rarity: opt.rarity || null };
  }
}

function getItem(id) {
  return INDEX[id] || null;
}

/** Is this category/value free (cost 0)? Free items don't need to be owned. */
function isFreeValue(category, value) {
  const item = INDEX[itemId(category, value)];
  return !!item && item.cost === 0;
}

/** All purchasable (cost > 0) item ids — useful for validation/seeding. */
function paidItemIds() {
  return Object.values(INDEX).filter((i) => i.cost > 0).map((i) => i.id);
}

module.exports = { CATALOG, INDEX, itemId, getItem, isFreeValue, paidItemIds };
