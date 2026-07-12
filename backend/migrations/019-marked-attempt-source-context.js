/**
 * Keep the library activity that originated a CapletMark attempt. This lets
 * feedback and study plans return a learner to an exact, relevant retry.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.addColumn('marked_attempts', 'sourceResourceId', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('marked_attempts', 'sourcePromptId', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('marked_attempts', 'sourceFocusId', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.addIndex('marked_attempts', ['userId', 'sourceResourceId', 'createdAt'], {
      name: 'marked_attempts_user_resource_created_idx',
    });
  },
  async down(queryInterface) {
    await queryInterface.removeIndex('marked_attempts', 'marked_attempts_user_resource_created_idx');
    await queryInterface.removeColumn('marked_attempts', 'sourceFocusId');
    await queryInterface.removeColumn('marked_attempts', 'sourcePromptId');
    await queryInterface.removeColumn('marked_attempts', 'sourceResourceId');
  },
};
