/**
 * Caplet Real Estate — a shared-world property investment game.
 *
 * Unlike state-based games (e.g. clicker, which save to game_states), this game
 * has its own persistent shared map in the `properties` table and its own route
 * (/api/realestate). This module exists only so the game appears in the Games
 * hub listing; it has no per-user saved state.
 */
module.exports = {
  key: 'realestate',
  meta: {
    title: 'Caplet Estates',
    description: 'A live property-investment world. Earn Caplet Coins from lessons, buy plots, customize your houses, and see who owns what.',
    icon: '🏘️',
    path: '/games/realestate',
  },
};
