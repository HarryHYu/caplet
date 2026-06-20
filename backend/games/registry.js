/**
 * Games registry. Add a new game by writing a module (like clicker.js) and
 * listing it here — routes/catalog/save all work off this map, so the Games
 * section scales to many games without touching the route code.
 */
const clicker = require('./clicker');

// State-based games (clicker → /api/games/:key with game_states) live here.
// The property game ("Estates") moved into the Academy (per-classroom world);
// it has its own route under /api/academies/:classroomId/estate and is no
// longer part of the Games hub.
const GAMES = [clicker];

const BY_KEY = Object.fromEntries(GAMES.map((g) => [g.key, g]));

function listGames() {
  return GAMES.map((g) => ({ key: g.key, ...g.meta }));
}

function getGame(key) {
  return BY_KEY[key] || null;
}

module.exports = { listGames, getGame };
