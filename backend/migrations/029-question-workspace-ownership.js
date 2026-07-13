'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('questions', 'editorWorkspaceId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'editor_workspaces', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addIndex('questions', ['editorWorkspaceId', 'updatedAt'], {
      name: 'questions_workspace_updated_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('questions', 'questions_workspace_updated_idx');
    await queryInterface.removeColumn('questions', 'editorWorkspaceId');
  },
};
