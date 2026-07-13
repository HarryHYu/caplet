'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('teacher_verification_audits', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      teacherProfileId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'teacher_profiles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      teacherUserId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      actorUserId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      fromStatus: { type: Sequelize.STRING(24), allowNull: false },
      toStatus: { type: Sequelize.STRING(24), allowNull: false },
      note: { type: Sequelize.TEXT, allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: false, defaultValue: {} },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('teacher_verification_audits', ['teacherProfileId', 'createdAt'], {
      name: 'teacher_verification_audits_profile_created_idx',
    });
    await queryInterface.addIndex('teacher_verification_audits', ['teacherUserId', 'createdAt'], {
      name: 'teacher_verification_audits_teacher_created_idx',
    });
    await queryInterface.addIndex('teacher_verification_audits', ['actorUserId', 'createdAt'], {
      name: 'teacher_verification_audits_actor_created_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('teacher_verification_audits');
  },
};
