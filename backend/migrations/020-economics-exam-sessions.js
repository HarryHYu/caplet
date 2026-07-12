module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.createTable('economics_exam_sessions', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      packId: { type: DataTypes.STRING, allowNull: false }, packTitle: { type: DataTypes.STRING, allowNull: false },
      durationMinutes: { type: DataTypes.INTEGER, allowNull: false }, status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'in_progress' },
      startedAt: { type: DataTypes.DATE, allowNull: false }, expiresAt: { type: DataTypes.DATE, allowNull: false }, submittedAt: { type: DataTypes.DATE, allowNull: true },
      questions: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' }, answers: { type: DataTypes.TEXT, allowNull: false, defaultValue: '{}' }, results: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }, updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('economics_exam_sessions', ['userId', 'status', 'createdAt'], { name: 'economics_exam_sessions_user_status_idx' });
  },
  async down(queryInterface) { await queryInterface.dropTable('economics_exam_sessions'); },
};
