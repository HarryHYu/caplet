'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('lessons');
    const add = async (name, definition) => {
      if (!table[name]) await queryInterface.addColumn('lessons', name, definition);
    };
    await add('lifecycleStatus', { type: Sequelize.STRING, allowNull: false, defaultValue: 'draft' });
    await add('syllabusVersion', { type: Sequelize.STRING, allowNull: true });
    await add('difficulty', { type: Sequelize.STRING, allowNull: true });
    await add('estimatedMinutes', { type: Sequelize.INTEGER, allowNull: true });
    await add('assessmentPurpose', { type: Sequelize.STRING, allowNull: true });
    await add('sourceInfo', { type: Sequelize.JSON, allowNull: false, defaultValue: {} });
    await add('contentVersion', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 });
    await add('reviewedBy', { type: Sequelize.UUID, allowNull: true });
    await add('reviewedAt', { type: Sequelize.DATE, allowNull: true });
    await add('reviewNotes', { type: Sequelize.TEXT, allowNull: true });
    await add('supersededBy', { type: Sequelize.UUID, allowNull: true });
    await queryInterface.sequelize.query(`UPDATE lessons SET "lifecycleStatus" = CASE WHEN "isPublished" = ${queryInterface.sequelize.getDialect() === 'postgres' ? 'TRUE' : '1'} THEN 'published' ELSE 'draft' END`);

    await queryInterface.createTable('content_revisions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      entityType: { type: Sequelize.STRING, allowNull: false },
      entityId: { type: Sequelize.STRING, allowNull: false },
      version: { type: Sequelize.INTEGER, allowNull: false },
      snapshot: { type: Sequelize.JSON, allowNull: false, defaultValue: {} },
      workspaceId: { type: Sequelize.UUID, allowNull: true },
      changeSummary: { type: Sequelize.STRING, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('content_revisions', ['entityType', 'entityId', 'version'], { unique: true, name: 'content_revisions_entity_version_unique' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('content_revisions');
    const table = await queryInterface.describeTable('lessons');
    for (const column of ['lifecycleStatus', 'syllabusVersion', 'difficulty', 'estimatedMinutes', 'assessmentPurpose', 'sourceInfo', 'contentVersion', 'reviewedBy', 'reviewedAt', 'reviewNotes', 'supersededBy']) {
      if (table[column]) await queryInterface.removeColumn('lessons', column);
    }
  },
};
