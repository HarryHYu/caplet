/**
 * Games registry. Add a new game by writing a module (like clicker.js) and
 * listing it here — routes/catalog/save all work off this map, so the Games
 * section scales to many games without touching the route code.
 */
const clicker = require('./clicker');

const GAMES = [clicker];

const BY_KEY = Object.fromEntries(GAMES.map((g) => [g.key, g]));

function listGames() {
  return GAMES.map((g) => ({ key: g.key, ...g.meta }));
}

function getGame(key) {
  return BY_KEY[key] || null;
}

module.exports = { listGames, getGame };
