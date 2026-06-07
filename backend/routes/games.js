const express = require('express');
const GameState = require('../models/GameState');
const { requireAuth } = require('../middleware/auth');
const { listGames, getGame } = require('../games/registry');

const router = express.Router();
router.use(requireAuth);

// GET /api/games — list available games.
router.get('/', (req, res) => {
  res.json({ games: listGames() });
});

// GET /api/games/:key — load the user's saved state + server meta + catalog.
router.get('/:key', async (req, res) => {
  try {
    const game = getGame(req.params.key);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    // Some games (e.g. realestate) have their own route + shared world and no
    // generic saved state.
    if (typeof game.defaultState !== 'function') {
      return res.status(400).json({ message: 'This game uses its own endpoints.' });
    }

    const row = await GameState.findOne({ where: { userId: req.user.id, gameKey: game.key } });
    const state = row?.state || game.defaultState();
    const meta = await game.getServerMeta(req.user.id);

    res.json({ game: { key: game.key, ...game.meta }, state, meta });
  } catch (e) {
    console.error('Load game error:', e.message || e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/games/:key — save sanitized state.
router.put('/:key', async (req, res) => {
  try {
    const game = getGame(req.params.key);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    if (typeof game.sanitizeState !== 'function') {
      return res.status(400).json({ message: 'This game uses its own endpoints.' });
    }

    const clean = game.sanitizeState(req.body?.state);
    const [row, created] = await GameState.findOrCreate({
      where: { userId: req.user.id, gameKey: game.key },
      defaults: { state: clean },
    });
    if (!created) {
      row.state = clean;
      await row.save();
    }
    res.json({ state: row.state });
  } catch (e) {
    console.error('Save game error:', e.message || e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
