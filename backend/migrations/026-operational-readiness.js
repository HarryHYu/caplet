/**
 * Persistent operational controls and evidence.
 *
 * Feature flags deliberately keep public values separate from internal rollout
 * configuration. Audit rows and backup verifications are append-only records.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable('feature_flags', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      key: { type: DataTypes.STRING(100), allowNull: false },
      description: { type: DataTypes.STRING(500), allowNull: true },
      enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      isPublic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      rolloutPercentage: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
      publicValue: { type: DataTypes.JSONB, allowNull: true },
      internalConfig: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      archivedAt: { type: DataTypes.DATE, allowNull: true },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      updatedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('feature_flags', ['key'], {
      name: 'feature_flags_key_unique',
      unique: true,
    });
    await queryInterface.addIndex('feature_flags', ['isPublic', 'archivedAt', 'key'], {
      name: 'feature_flags_public_active_idx',
    });

    await queryInterface.createTable('feature_flag_audits', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      flagId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'feature_flags', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      flagKey: { type: DataTypes.STRING(100), allowNull: false },
      action: { type: DataTypes.STRING(30), allowNull: false },
      actorUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      previousValue: { type: DataTypes.JSONB, allowNull: true },
      nextValue: { type: DataTypes.JSONB, allowNull: true },
      requestId: { type: DataTypes.STRING(128), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('feature_flag_audits', ['flagId', 'createdAt'], {
      name: 'feature_flag_audits_flag_created_idx',
    });
    await queryInterface.addIndex('feature_flag_audits', ['actorUserId', 'createdAt'], {
      name: 'feature_flag_audits_actor_created_idx',
    });

    await queryInterface.createTable('backup_verifications', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      verificationKey: { type: DataTypes.STRING(200), allowNull: false },
      backupId: { type: DataTypes.STRING(255), allowNull: false },
      provider: { type: DataTypes.STRING(100), allowNull: false },
      environment: { type: DataTypes.STRING(50), allowNull: false },
      status: { type: DataTypes.STRING(30), allowNull: false },
      backupCreatedAt: { type: DataTypes.DATE, allowNull: false },
      verifiedAt: { type: DataTypes.DATE, allowNull: false },
      restoreTestedAt: { type: DataTypes.DATE, allowNull: true },
      checksumVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      sizeBytes: { type: DataTypes.BIGINT, allowNull: true },
      recoveryPointAt: { type: DataTypes.DATE, allowNull: true },
      recoveryTimeSeconds: { type: DataTypes.INTEGER, allowNull: true },
      evidence: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      evidenceDigest: { type: DataTypes.STRING(64), allowNull: false },
      notes: { type: DataTypes.TEXT, allowNull: true },
      recordedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      requestId: { type: DataTypes.STRING(128), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('backup_verifications', ['verificationKey'], {
      name: 'backup_verifications_key_unique',
      unique: true,
    });
    await queryInterface.addIndex(
      'backup_verifications',
      ['environment', 'status', 'verifiedAt'],
      { name: 'backup_verifications_environment_status_verified_idx' },
    );
    await queryInterface.addIndex('backup_verifications', ['backupCreatedAt'], {
      name: 'backup_verifications_backup_created_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('backup_verifications');
    await queryInterface.dropTable('feature_flag_audits');
    await queryInterface.dropTable('feature_flags');
  },
};
