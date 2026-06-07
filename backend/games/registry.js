/**
 * Games registry. Add a new game by writing a module (like clicker.js) and
 * listing it here — routes/catalog/save all work off this map, so the Games
 * section scales to many games without touching the route code.
 */
const clicker = require('./clicker');
const realestate = require('./realestate');

// Some games are state-based (clicker → /api/games/:key with game_states).
// Others (realestate) have their own route + shared world; they appear in the
// hub listing but don't use the generic state endpoints.
const GAMES = [clicker, realestate];

const BY_KEY = Object.fromEntries(GAMES.map((g) => [g.key, g]));

function listGames() {
  return GAMES.map((g) => ({ key: g.key, ...g.meta }));
}

function getGame(key) {
  return BY_KEY[key] || null;
}

module.exports = { listGames, getGame };
