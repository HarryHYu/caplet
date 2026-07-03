/**
 * Migration: persist each live participant's best answer streak.
 *
 * Best streak used to live only in the ephemeral `room.streaks` in-memory Map
 * (backend/realtime/liveSocket.js) — fine while the game is running, but that
 * Map is deleted the moment the session ends (or wiped entirely on a server
 * restart), so a participant reconnecting after the game finished, or the
 * host console reloading after a restart, would see everyone's best streak
 * silently reset to 0. Storing it durably fixes that.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('live_participants', 'bestStreak', {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('live_participants', 'bestStreak');
  }
};
