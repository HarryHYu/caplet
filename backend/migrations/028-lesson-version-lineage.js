'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('lessons');
    if (!table.previousVersionId) {
      await queryInterface.addColumn('lessons', 'previousVersionId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'lessons', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }
    const indexes = await queryInterface.showIndex('lessons');
    if (!indexes.some((index) => index.name === 'lessons_previous_version_unique')) {
      await queryInterface.addIndex('lessons', ['previousVersionId'], {
        name: 'lessons_previous_version_unique',
        unique: true,
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('lessons');
    if (indexes.some((index) => index.name === 'lessons_previous_version_unique')) {
      await queryInterface.removeIndex('lessons', 'lessons_previous_version_unique');
    }
    const table = await queryInterface.describeTable('lessons');
    if (table.previousVersionId) await queryInterface.removeColumn('lessons', 'previousVersionId');
  },
};
