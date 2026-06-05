/**
 * Migration: fix user_progress FK constraints to use ON DELETE CASCADE.
 *
 * The original migration (001) created the user_progress table with FK
 * references to users, courses, and lessons but omitted ON DELETE behaviour,
 * leaving all three with the Postgres default of NO ACTION (effectively
 * RESTRICT). This caused silent failures whenever the editor tried to delete
 * a course that had any progress rows, or when a user account was deleted.
 *
 * Fix: drop the auto-generated FK constraints and recreate them with
 * ON DELETE CASCADE so that progress rows are cleaned up automatically when
 * the parent row is removed.
 *
 * SQLite (local dev) does not enforce FK constraints in the same way and
 * does not support ALTER TABLE DROP/ADD CONSTRAINT — skip on non-Postgres.
 */

module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') return;

    // Drop every FK constraint on user_progress (safely handles any auto-generated names).
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = 'user_progress'::regclass
            AND contype = 'f'
        LOOP
          EXECUTE 'ALTER TABLE user_progress DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
      END $$;
    `);

    // Recreate with proper CASCADE behaviour.
    await queryInterface.sequelize.query(`
      ALTER TABLE user_progress
        ADD CONSTRAINT "user_progress_userId_fkey"
          FOREIGN KEY ("userId")   REFERENCES users(id)   ON DELETE CASCADE,
        ADD CONSTRAINT "user_progress_courseId_fkey"
          FOREIGN KEY ("courseId") REFERENCES courses(id) ON DELETE CASCADE,
        ADD CONSTRAINT "user_progress_lessonId_fkey"
          FOREIGN KEY ("lessonId") REFERENCES lessons(id) ON DELETE CASCADE;
    `);
  },

  async down(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'postgres') return;

    // Revert to constraints without ON DELETE behaviour.
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT conname
          FROM pg_constraint
          WHERE conrelid = 'user_progress'::regclass
            AND contype = 'f'
        LOOP
          EXECUTE 'ALTER TABLE user_progress DROP CONSTRAINT ' || quote_ident(r.conname);
        END LOOP;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE user_progress
        ADD CONSTRAINT "user_progress_userId_fkey"
          FOREIGN KEY ("userId")   REFERENCES users(id),
        ADD CONSTRAINT "user_progress_courseId_fkey"
          FOREIGN KEY ("courseId") REFERENCES courses(id),
        ADD CONSTRAINT "user_progress_lessonId_fkey"
          FOREIGN KEY ("lessonId") REFERENCES lessons(id);
    `);
  },
};
