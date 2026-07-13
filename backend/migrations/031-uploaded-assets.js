/**
 * Durable ownership for S3-compatible uploads so privacy export and erasure
 * can enumerate the exact object keys belonging to an account.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.createTable('uploaded_assets', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      key: { type: DataTypes.STRING(1024), allowNull: false },
      finalKey: { type: DataTypes.STRING(1024), allowNull: false },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      workspaceId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'editor_workspaces', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      purpose: { type: DataTypes.STRING(32), allowNull: false },
      mimeType: { type: DataTypes.STRING(100), allowNull: false },
      classroomId: { type: DataTypes.UUID, allowNull: true },
      lessonId: { type: DataTypes.UUID, allowNull: true },
      courseId: { type: DataTypes.UUID, allowNull: true },
      status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'presigned' },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('uploaded_assets', ['key'], {
      name: 'uploaded_assets_key_unique',
      unique: true,
    });
    await queryInterface.addIndex('uploaded_assets', ['userId', 'createdAt'], {
      name: 'uploaded_assets_user_created_idx',
    });
    await queryInterface.addIndex('uploaded_assets', ['workspaceId', 'createdAt'], {
      name: 'uploaded_assets_workspace_created_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('uploaded_assets');
  },
};
