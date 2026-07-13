'use strict';

const crypto = require('crypto');

module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;
    await queryInterface.createTable('curriculum_editions', {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      key: { type: DataTypes.STRING(80), allowNull: false },
      jurisdiction: { type: DataTypes.STRING(50), allowNull: false },
      subject: { type: DataTypes.STRING(100), allowNull: false },
      label: { type: DataTypes.STRING(255), allowNull: false },
      officialSyllabusCode: { type: DataTypes.STRING(120), allowNull: true },
      sourceUrl: { type: DataTypes.STRING(500), allowNull: false },
      firstHscCohortYear: { type: DataTypes.INTEGER, allowNull: true },
      lastHscCohortYear: { type: DataTypes.INTEGER, allowNull: true },
      reviewedAt: { type: DataTypes.DATE, allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('curriculum_editions', ['key'], { name: 'curriculum_editions_key_unique', unique: true });
    await queryInterface.addIndex('curriculum_editions', ['jurisdiction', 'subject', 'active'], { name: 'curriculum_editions_subject_active_idx' });

    const editions = [
      {
        id: crypto.randomUUID(),
        key: 'NSW-ECO-2009',
        jurisdiction: 'NSW',
        subject: 'economics',
        label: 'Economics Stage 6 Syllabus (2009)',
        officialSyllabusCode: 'economics_stage_6_2009',
        sourceUrl: 'https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsie/economics-stage-6-2009',
        firstHscCohortYear: null,
        lastHscCohortYear: 2027,
        reviewedAt: null,
        active: true,
        metadata: JSON.stringify({ status: 'transition', legacy: true }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: crypto.randomUUID(),
        key: 'NSW-ECO-2025',
        jurisdiction: 'NSW',
        subject: 'economics',
        label: 'Economics 11–12 Syllabus (2025)',
        officialSyllabusCode: 'economics_11_12_2025',
        sourceUrl: 'https://curriculum.nsw.edu.au/learning-areas/hsie/economics-11-12-2025/overview',
        firstHscCohortYear: 2028,
        lastHscCohortYear: null,
        reviewedAt: null,
        active: true,
        metadata: JSON.stringify({ status: 'current' }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await queryInterface.bulkInsert('curriculum_editions', editions);

    for (const table of ['curriculum_outcomes', 'lessons', 'questions']) {
      const description = await queryInterface.describeTable(table);
      if (!description.curriculumEditionId) {
        await queryInterface.addColumn(table, 'curriculumEditionId', {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'curriculum_editions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
        await queryInterface.addIndex(table, ['curriculumEditionId'], { name: `${table}_curriculum_edition_idx` });
      }
    }

    const [editionRows] = await queryInterface.sequelize.query('SELECT id, key FROM curriculum_editions');
    const ids = Object.fromEntries(editionRows.map((row) => [row.key, row.id]));
    for (const table of ['curriculum_outcomes', 'lessons', 'questions']) {
      await queryInterface.sequelize.query(
        `UPDATE ${table} SET "curriculumEditionId" = :editionId WHERE "syllabusVersion" IN ('NSW-2025', 'NESA 2025', 'NSW-ECO-2025')`,
        { replacements: { editionId: ids['NSW-ECO-2025'] } },
      );
      await queryInterface.sequelize.query(
        `UPDATE ${table} SET "curriculumEditionId" = :editionId WHERE "syllabusVersion" IN ('NSW-2009', 'NESA 2009', 'NSW-ECO-2009')`,
        { replacements: { editionId: ids['NSW-ECO-2009'] } },
      );
    }
  },

  async down(queryInterface) {
    for (const table of ['questions', 'lessons', 'curriculum_outcomes']) {
      const description = await queryInterface.describeTable(table);
      if (description.curriculumEditionId) {
        const indexes = await queryInterface.showIndex(table);
        const index = indexes.find((item) => item.name === `${table}_curriculum_edition_idx`);
        if (index) await queryInterface.removeIndex(table, index.name);
        await queryInterface.removeColumn(table, 'curriculumEditionId');
      }
    }
    await queryInterface.dropTable('curriculum_editions');
  },
};
