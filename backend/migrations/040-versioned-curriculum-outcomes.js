'use strict';

module.exports = {
  async up(queryInterface) {
    const indexes = await queryInterface.showIndex('curriculum_outcomes');
    const legacy = indexes.find((index) => index.name === 'curriculum_outcomes_syllabus_code_unique');
    if (legacy) await queryInterface.removeIndex('curriculum_outcomes', legacy.name);
    if (!indexes.some((index) => index.name === 'curriculum_outcomes_edition_code_unique')) {
      await queryInterface.addIndex('curriculum_outcomes', ['curriculumEditionId', 'code'], {
        unique: true,
        name: 'curriculum_outcomes_edition_code_unique',
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('curriculum_outcomes');
    const current = indexes.find((index) => index.name === 'curriculum_outcomes_edition_code_unique');
    if (current) await queryInterface.removeIndex('curriculum_outcomes', current.name);
    if (!indexes.some((index) => index.name === 'curriculum_outcomes_syllabus_code_unique')) {
      await queryInterface.addIndex('curriculum_outcomes', ['jurisdiction', 'subject', 'syllabusVersion', 'code'], {
        unique: true,
        name: 'curriculum_outcomes_syllabus_code_unique',
      });
    }
  },
};
