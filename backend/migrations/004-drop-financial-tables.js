/**
 * Migration: drop the legacy financial-feature tables
 *
 * The financial advisor feature was removed from the codebase but its
 * four tables remained in production. This migration drops them so the
 * schema matches the code. Order matters: child tables first.
 *
 * down() is intentionally a no-op — these tables are gone for good and
 * recreating them with the original schema is not a goal of this app
 * anymore. If they ever come back, write a forward-only migration to
 * recreate them with whatever shape the new feature needs.
 */

module.exports = {
  async up(queryInterface) {
    await queryInterface.dropTable('summaries', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('financial_plans', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('check_ins', { cascade: true }).catch(() => {});
    await queryInterface.dropTable('financial_states', { cascade: true }).catch(() => {});
  },

  async down() {
    // No-op. See file header.
  }
};
