'use strict';

/**
 * Migration 039 — Study Coach recommendation engine + HSC syllabus tracking.
 *
 * Additive only: creates the six tables the ported lesson-recommendation
 * algorithm reads from. No existing table is altered or dropped.
 *
 *   syllabus_points          — global catalogue of every NSW HSC dot point
 *   user_syllabus_progress   — per-user mastery bar for each syllabus point
 *   study_sessions           — logged focus sessions (habit signal)
 *   school_assessments       — upcoming assessments (exam-runway signal)
 *   knowledge_atoms          — AI-tracked concepts (weakness signal)
 *   recommendation_events    — shown/clicked/done feedback for the engine
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    const ts = {
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    };

    // ── syllabus_points ──────────────────────────────────────────────────────
    await queryInterface.createTable('syllabus_points', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      subject: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'Economics' },
      year: { type: DataTypes.INTEGER, allowNull: false },
      module: { type: DataTypes.INTEGER, allowNull: false },
      moduleName: { type: DataTypes.STRING(100), allowNull: false },
      topic: { type: DataTypes.STRING(150), allowNull: false },
      inquiryQuestion: { type: DataTypes.TEXT, allowNull: true },
      dotPoint: { type: DataTypes.TEXT, allowNull: false },
      weight: { type: DataTypes.INTEGER, defaultValue: 1 },
      orderIndex: { type: DataTypes.INTEGER, defaultValue: 0 },
      ...ts,
    });
    await queryInterface.addIndex('syllabus_points', ['subject', 'module'], { name: 'idx_sp_subject_module' });

    // ── user_syllabus_progress ───────────────────────────────────────────────
    await queryInterface.createTable('user_syllabus_progress', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      syllabusPointId: { type: DataTypes.UUID, allowNull: false },
      masteryLevel: { type: DataTypes.INTEGER, defaultValue: 0 },
      practiceCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      correctCount: { type: DataTypes.INTEGER, defaultValue: 0 },
      consecutiveWrong: { type: DataTypes.INTEGER, defaultValue: 0 },
      lessonSeen: { type: DataTypes.BOOLEAN, defaultValue: false },
      lastPracticed: { type: DataTypes.DATE, allowNull: true },
      typeStats: { type: DataTypes.JSON, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('user_syllabus_progress', ['userId', 'syllabusPointId'], { name: 'idx_usp_user_point', unique: true });
    await queryInterface.addIndex('user_syllabus_progress', ['userId'], { name: 'idx_usp_user' });

    // ── study_sessions ───────────────────────────────────────────────────────
    await queryInterface.createTable('study_sessions', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      courseId: { type: DataTypes.UUID, allowNull: true },
      label: { type: DataTypes.STRING, allowNull: true },
      durationMins: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      source: { type: DataTypes.STRING, allowNull: false, defaultValue: 'timer' },
      ...ts,
    });
    await queryInterface.addIndex('study_sessions', ['userId', 'createdAt'], { name: 'idx_ss_user_created' });

    // ── school_assessments ───────────────────────────────────────────────────
    await queryInterface.createTable('school_assessments', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      subject: { type: DataTypes.STRING, allowNull: false },
      title: { type: DataTypes.STRING, allowNull: false },
      taskType: { type: DataTypes.STRING, allowNull: true },
      dueDate: { type: DataTypes.DATEONLY, allowNull: true },
      weight: { type: DataTypes.FLOAT, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'upcoming' },
      ...ts,
    });
    await queryInterface.addIndex('school_assessments', ['userId', 'dueDate'], { name: 'idx_sa_user_due' });

    // ── knowledge_atoms ──────────────────────────────────────────────────────
    await queryInterface.createTable('knowledge_atoms', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      subject: { type: DataTypes.STRING(200), allowNull: false },
      concept: { type: DataTypes.STRING(300), allowNull: false },
      masteryLevel: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 30 },
      lastReviewed: { type: DataTypes.DATEONLY, allowNull: true },
      reviewCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      aiNotes: { type: DataTypes.TEXT, allowNull: true },
      source: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'debrief' },
      ...ts,
    });
    await queryInterface.addIndex('knowledge_atoms', ['userId', 'masteryLevel'], { name: 'idx_ka_user_mastery' });

    // ── recommendation_events ────────────────────────────────────────────────
    await queryInterface.createTable('recommendation_events', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false },
      recId: { type: DataTypes.STRING(120), allowNull: false },
      recType: { type: DataTypes.STRING(40), allowNull: false },
      action: { type: DataTypes.STRING(20), allowNull: false },
      topic: { type: DataTypes.STRING(200), allowNull: true },
      subject: { type: DataTypes.STRING(100), allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('recommendation_events', ['userId', 'createdAt'], { name: 'idx_re_user_created' });
  },

  async down(queryInterface) {
    // Reverse order; additive migration so a clean drop of exactly what we made.
    await queryInterface.dropTable('recommendation_events').catch(() => {});
    await queryInterface.dropTable('knowledge_atoms').catch(() => {});
    await queryInterface.dropTable('school_assessments').catch(() => {});
    await queryInterface.dropTable('study_sessions').catch(() => {});
    await queryInterface.dropTable('user_syllabus_progress').catch(() => {});
    await queryInterface.dropTable('syllabus_points').catch(() => {});
  },
};
