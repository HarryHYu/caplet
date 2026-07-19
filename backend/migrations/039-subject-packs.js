'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subject_packs', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      key: { type: Sequelize.STRING(160), allowNull: false, unique: true },
      slug: { type: Sequelize.STRING(160), allowNull: false },
      version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      jurisdiction: { type: Sequelize.STRING(50), allowNull: false },
      subject: { type: Sequelize.STRING(100), allowNull: false },
      syllabusVersion: { type: Sequelize.STRING(80), allowNull: false },
      curriculumEditionId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'curriculum_editions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      createdBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      lifecycleStatus: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'draft' },
      sourceDocuments: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      readiness: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      reviewedAt: { type: Sequelize.DATE, allowNull: true },
      publishedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('subject_packs', ['slug', 'version'], {
      unique: true,
      name: 'subject_packs_slug_version_unique',
    });
    await queryInterface.addIndex('subject_packs', ['createdBy', 'lifecycleStatus'], {
      name: 'subject_packs_owner_status_idx',
    });
    await queryInterface.addIndex('subject_packs', ['subject', 'syllabusVersion'], {
      name: 'subject_packs_subject_version_idx',
    });

    await queryInterface.createTable('subject_pack_review_items', {
      id: { type: Sequelize.UUID, allowNull: false, primaryKey: true },
      subjectPackId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'subject_packs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reviewKey: { type: Sequelize.STRING(180), allowNull: false },
      itemType: { type: Sequelize.STRING(50), allowNull: false },
      entityType: { type: Sequelize.STRING(50), allowNull: true },
      entityId: { type: Sequelize.STRING(255), allowNull: true },
      title: { type: Sequelize.STRING(255), allowNull: false },
      summary: { type: Sequelize.TEXT, allowNull: true },
      severity: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'decision' },
      status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'open' },
      sourceCitation: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      decisionOptions: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      selectedOption: { type: Sequelize.STRING(120), allowNull: true },
      resolution: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      resolvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      resolvedAt: { type: Sequelize.DATE, allowNull: true },
      sortOrder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('subject_pack_review_items', ['subjectPackId', 'reviewKey'], {
      unique: true,
      name: 'subject_pack_review_items_key_unique',
    });
    await queryInterface.addIndex('subject_pack_review_items', ['subjectPackId', 'status', 'sortOrder'], {
      name: 'subject_pack_review_items_queue_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('subject_pack_review_items');
    await queryInterface.dropTable('subject_packs');
  },
};
