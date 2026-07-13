'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('economic_sources', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      code: { type: Sequelize.STRING(24), allowNull: false },
      name: { type: Sequelize.STRING(160), allowNull: false },
      baseUrl: { type: Sequelize.STRING(500), allowNull: false },
      termsUrl: { type: Sequelize.STRING(500), allowNull: true },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      lastReviewedAt: { type: Sequelize.DATE, allowNull: true },
      metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('economic_sources', ['code'], { name: 'economic_sources_code_unique', unique: true });

    await queryInterface.createTable('economic_series', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      key: { type: Sequelize.STRING(100), allowNull: false },
      sourceId: { type: Sequelize.UUID, allowNull: false, references: { model: 'economic_sources', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' },
      providerSeriesId: { type: Sequelize.STRING(255), allowNull: false },
      title: { type: Sequelize.STRING(255), allowNull: false },
      displayTitle: { type: Sequelize.STRING(255), allowNull: false },
      sourceUrl: { type: Sequelize.STRING(500), allowNull: false },
      unit: { type: Sequelize.STRING(80), allowNull: false },
      nativeFrequency: { type: Sequelize.STRING(24), allowNull: false },
      adjustment: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'not_applicable' },
      transformation: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'none' },
      definitionVersion: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      expectedReleaseRule: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      nextExpectedReleaseAt: { type: Sequelize.DATE, allowNull: true },
      freshnessGraceHours: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 72 },
      active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('economic_series', ['key'], { name: 'economic_series_key_unique', unique: true });
    await queryInterface.addIndex('economic_series', ['sourceId', 'active'], { name: 'economic_series_source_active_idx' });

    await queryInterface.createTable('economic_observations', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      seriesId: { type: Sequelize.UUID, allowNull: false, references: { model: 'economic_series', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      observationDate: { type: Sequelize.DATEONLY, allowNull: false },
      periodStart: { type: Sequelize.DATEONLY, allowNull: false },
      periodEnd: { type: Sequelize.DATEONLY, allowNull: false },
      periodLabel: { type: Sequelize.STRING(100), allowNull: false },
      value: { type: Sequelize.DECIMAL(20, 8), allowNull: false },
      previousValue: { type: Sequelize.DECIMAL(20, 8), allowNull: true },
      releasedAt: { type: Sequelize.DATE, allowNull: true },
      retrievedAt: { type: Sequelize.DATE, allowNull: false },
      revisionState: { type: Sequelize.STRING(24), allowNull: false, defaultValue: 'initial' },
      revisionDetectedAt: { type: Sequelize.DATE, allowNull: true },
      isProvisional: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      sourceHash: { type: Sequelize.STRING(128), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('economic_observations', ['seriesId', 'observationDate'], { name: 'economic_observations_series_date_unique', unique: true });
    await queryInterface.addIndex('economic_observations', ['seriesId', 'observationDate'], { name: 'economic_observations_series_period_idx' });

    await queryInterface.createTable('economic_ingestion_runs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      sourceId: { type: Sequelize.UUID, allowNull: false, references: { model: 'economic_sources', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
      seriesId: { type: Sequelize.UUID, allowNull: true, references: { model: 'economic_series', key: 'id' }, onDelete: 'SET NULL', onUpdate: 'CASCADE' },
      adapterVersion: { type: Sequelize.STRING(80), allowNull: false },
      startedAt: { type: Sequelize.DATE, allowNull: false },
      completedAt: { type: Sequelize.DATE, allowNull: true },
      retrievedAt: { type: Sequelize.DATE, allowNull: false },
      status: { type: Sequelize.STRING(24), allowNull: false, defaultValue: 'running' },
      httpStatus: { type: Sequelize.INTEGER, allowNull: true },
      observationsAccepted: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      observationsRejected: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      latestObservationDate: { type: Sequelize.DATEONLY, allowNull: true },
      errorCode: { type: Sequelize.STRING(80), allowNull: true },
      errorSummary: { type: Sequelize.STRING(500), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('economic_ingestion_runs', ['sourceId', 'startedAt'], { name: 'economic_ingestion_runs_source_started_idx' });
    await queryInterface.addIndex('economic_ingestion_runs', ['status', 'startedAt'], { name: 'economic_ingestion_runs_status_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('economic_ingestion_runs');
    await queryInterface.dropTable('economic_observations');
    await queryInterface.dropTable('economic_series');
    await queryInterface.dropTable('economic_sources');
  },
};
