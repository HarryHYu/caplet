'use strict';

const PARENT_CODES = ['ECON-11-2009', 'ECON-12-2009'];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate('curriculum_outcomes', {
      isAssessable: false,
      updatedAt: Sequelize.literal('CURRENT_TIMESTAMP'),
    }, {
      jurisdiction: 'NSW',
      subject: 'economics',
      syllabusVersion: 'NSW-2009',
      code: { [Sequelize.Op.in]: PARENT_CODES },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkUpdate('curriculum_outcomes', {
      isAssessable: true,
      updatedAt: Sequelize.literal('CURRENT_TIMESTAMP'),
    }, {
      jurisdiction: 'NSW',
      subject: 'economics',
      syllabusVersion: 'NSW-2009',
      code: { [Sequelize.Op.in]: PARENT_CODES },
    });
  },
};
