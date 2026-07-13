'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('marked_attempts');
    const add = async (name, definition) => {
      if (!table[name]) await queryInterface.addColumn('marked_attempts', name, definition);
    };
    await add('promptVersion', { type: Sequelize.STRING, allowNull: true });
    await add('modelVersion', { type: Sequelize.STRING, allowNull: true });
    await add('markingConfidence', { type: Sequelize.STRING, allowNull: false, defaultValue: 'low' });
    await add('confidenceReasons', { type: Sequelize.JSON, allowNull: false, defaultValue: [] });
    await add('rawResult', { type: Sequelize.JSON, allowNull: false, defaultValue: {} });
    await add('evaluationMetadata', { type: Sequelize.JSON, allowNull: false, defaultValue: {} });
    await add('humanOverrideMark', { type: Sequelize.INTEGER, allowNull: true });
    await add('humanOverrideFeedback', { type: Sequelize.TEXT, allowNull: true });
    await add('humanOverrideReason', { type: Sequelize.TEXT, allowNull: true });
    await add('humanOverrideBy', { type: Sequelize.UUID, allowNull: true });
    await add('overriddenAt', { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    const columns = ['promptVersion', 'modelVersion', 'markingConfidence', 'confidenceReasons', 'rawResult', 'evaluationMetadata', 'humanOverrideMark', 'humanOverrideFeedback', 'humanOverrideReason', 'humanOverrideBy', 'overriddenAt'];
    const table = await queryInterface.describeTable('marked_attempts');
    for (const column of columns) if (table[column]) await queryInterface.removeColumn('marked_attempts', column);
  },
};
