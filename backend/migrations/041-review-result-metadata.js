'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('review_items', 'lastResultMetadata', {
      type: Sequelize.JSON,
      allowNull: false,
      defaultValue: {},
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('review_items', 'lastResultMetadata');
  },
};
