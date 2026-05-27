/**
 * Migration: convert lessons.slides from TEXT to JSONB.
 *
 * Existing rows are preserved — the column stores valid JSON today, so
 * `USING slides::jsonb` re-parses each row into native JSONB without
 * touching the data. After this runs, Sequelize returns slides as a
 * real array/object instead of a string, which lets us drop the manual
 * JSON.parse/stringify getter/setter in the Lesson model and (later)
 * query inside slide content with PG operators.
 *
 * sqlite dev fallback has no JSONB type — Sequelize stores JSONB as TEXT
 * there anyway, so we skip the ALTER on non-postgres dialects.
 */

module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') {
      // sqlite (local dev) already stores slides as TEXT; nothing to change.
      return;
    }
    await queryInterface.sequelize.query(
      'ALTER TABLE lessons ALTER COLUMN slides TYPE jsonb USING slides::jsonb;'
    );
  },

  async down(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') return;
    await queryInterface.sequelize.query(
      'ALTER TABLE lessons ALTER COLUMN slides TYPE text USING slides::text;'
    );
  },
};
