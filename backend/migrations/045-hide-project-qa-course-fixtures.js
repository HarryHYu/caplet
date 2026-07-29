'use strict';

const PROJECT_QA_TITLES = [
  'QA Economics Review',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate('courses', {
      isPublished: false,
      updatedAt: Sequelize.literal('CURRENT_TIMESTAMP'),
    }, {
      title: { [Sequelize.Op.in]: PROJECT_QA_TITLES },
      workspaceId: null,
      isPublished: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate('courses', {
      isPublished: true,
      updatedAt: Sequelize.literal('CURRENT_TIMESTAMP'),
    }, {
      title: { [Sequelize.Op.in]: PROJECT_QA_TITLES },
      workspaceId: null,
      isPublished: false,
    });
  },
};
