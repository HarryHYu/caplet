/**
 * Adds verified teacher identities and outcome-aware configuration for the
 * existing classroom assignment records.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable('teacher_profiles', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: DataTypes.STRING(24),
        allowNull: false,
        defaultValue: 'pending',
      },
      schoolName: { type: DataTypes.STRING(200), allowNull: false },
      schoolDomain: { type: DataTypes.STRING(253), allowNull: true },
      staffEmail: { type: DataTypes.STRING(254), allowNull: false },
      positionTitle: { type: DataTypes.STRING(120), allowNull: true },
      jurisdiction: { type: DataTypes.STRING(20), allowNull: true },
      verificationNote: { type: DataTypes.TEXT, allowNull: true },
      requestedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      verifiedAt: { type: DataTypes.DATE, allowNull: true },
      verifiedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('teacher_profiles', ['status', 'requestedAt'], {
      name: 'teacher_profiles_status_requested_idx',
    });
    await queryInterface.addIndex('teacher_profiles', ['schoolDomain'], {
      name: 'teacher_profiles_school_domain_idx',
    });

    await queryInterface.createTable('outcome_assignment_configs', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      assignmentId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'assignments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      mode: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'practice',
      },
      outcomeIds: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]',
      },
      questionIds: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]',
      },
      questionSelection: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '{}',
      },
      targetStudentIds: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: '[]',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('outcome_assignment_configs', ['createdBy', 'createdAt'], {
      name: 'outcome_assignment_configs_creator_idx',
    });
    await queryInterface.addIndex('outcome_assignment_configs', ['mode'], {
      name: 'outcome_assignment_configs_mode_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('outcome_assignment_configs');
    await queryInterface.dropTable('teacher_profiles');
  },
};
