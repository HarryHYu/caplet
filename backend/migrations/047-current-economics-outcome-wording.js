'use strict';

const { ECONOMICS_OUTCOMES } = require('../data/economicsCurriculum');

const LEGACY_OUTCOME_TITLES = {
  P1: 'Uses economic terms, concepts and principles in a range of contexts',
  P2: 'Explains the economic role of individuals, businesses, institutions and government',
  P3: 'Explains the role and operation of markets in the Australian and global economy',
  P7: 'Explains the causes of economic issues and their consequences',
  P5: 'Discusses perspectives on a range of economic issues',
  P6: 'Explains how policies are used to manage the economy',
  P8: 'Discusses policy measures to address economic issues',
  P9: 'Analyses data for patterns and relationships to support economic arguments',
  P11: 'Applies mathematical concepts, formulas and techniques in economic contexts',
  P10: 'Communicates economic ideas and information for purpose and audience',
  H1: 'Applies economic terms, concepts and principles in a range of contexts',
  H2: 'Analyses the economic role of individuals, businesses, institutions and government',
  H3: 'Explains the role and effects of markets in the Australian and global economy',
  H7: 'Analyses the causes of economic issues and their consequences',
  H8: 'Assesses perspectives on a range of economic issues',
  H6: 'Evaluates the effectiveness of economic policies',
  H5: 'Proposes and justifies policy measures to address economic issues',
  H9: 'Analyses data to make predictions and support economic arguments',
  H11: 'Applies mathematical concepts, formulas and techniques in economic contexts',
  H10: 'Communicates economic ideas, perspectives and information for purpose and audience',
};

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const [code, title] of Object.entries(ECONOMICS_OUTCOMES)) {
      await queryInterface.bulkUpdate('curriculum_outcomes', {
        title,
        description: title,
        isAssessable: true,
        updatedAt: Sequelize.literal('CURRENT_TIMESTAMP'),
      }, {
        jurisdiction: 'NSW',
        subject: 'economics',
        syllabusVersion: 'NSW-2009',
        code,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    for (const [code, title] of Object.entries(LEGACY_OUTCOME_TITLES)) {
      await queryInterface.bulkUpdate('curriculum_outcomes', {
        title,
        description: title,
        updatedAt: Sequelize.literal('CURRENT_TIMESTAMP'),
      }, {
        jurisdiction: 'NSW',
        subject: 'economics',
        syllabusVersion: 'NSW-2009',
        code,
      });
    }
  },
};
