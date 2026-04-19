/**
 * Migration: Editor workspaces + workspace-scoped draft courses
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable('editor_workspaces', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      label: {
        type: DataTypes.STRING,
        allowNull: true
      },
      codeDigest: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    await queryInterface.addColumn('courses', 'workspaceId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'editor_workspaces',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addIndex('courses', ['workspaceId'], {
      name: 'courses_workspace_id_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('courses', 'courses_workspace_id_idx');
    await queryInterface.removeColumn('courses', 'workspaceId');
    await queryInterface.dropTable('editor_workspaces');
  }
};
