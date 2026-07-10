/**
 * Migration 018: persisted personal study plans.
 *
 * The plan is intentionally one row per user. Structured configuration and
 * generated tasks are stored as JSON-in-TEXT so the schema behaves identically
 * in local SQLite and production PostgreSQL.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable('study_plans', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      yearLevel: { type: DataTypes.STRING, allowNull: false },
      subjects: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
      goal: { type: DataTypes.STRING(200), allowNull: false },
      examDates: { type: DataTypes.TEXT, allowNull: false, defaultValue: '{}' },
      availableDays: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
      minutesPerDay: { type: DataTypes.INTEGER, allowNull: false },
      diagnosticAnswers: { type: DataTypes.TEXT, allowNull: false, defaultValue: '{}' },
      weakTopics: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
      tasks: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
      sourceFingerprint: { type: DataTypes.STRING, allowNull: true },
      signalSummary: { type: DataTypes.STRING(255), allowNull: true },
      generatedAt: { type: DataTypes.DATE, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
    });

    await queryInterface.addIndex('study_plans', ['userId'], {
      name: 'study_plans_user_id_unique',
      unique: true
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('study_plans');
  }
};
