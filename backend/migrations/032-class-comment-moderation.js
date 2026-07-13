'use strict';

// Child-safety reporting, independent review queues, and append-only actions.

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    if (typeof table === 'string') return table === tableName;
    return table?.tableName === tableName || table?.name === tableName;
  });
}

async function ensureIndex(queryInterface, tableName, fields, options) {
  const indexes = await queryInterface.showIndex(tableName);
  if (indexes.some((index) => index.name === options.name)) return;
  await queryInterface.addIndex(tableName, fields, options);
}

async function ensureColumn(queryInterface, tableName, columnName, definition) {
  const columns = await queryInterface.describeTable(tableName);
  if (columns[columnName]) return;
  await queryInterface.addColumn(tableName, columnName, definition);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'comment_moderation_records'))) {
      await queryInterface.createTable('comment_moderation_records', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        classroomId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'classrooms', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        commentId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'comments', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        reportedById: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        commentAuthorId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        reason: { type: Sequelize.STRING(32), allowNull: false },
        details: { type: Sequelize.TEXT, allowNull: true },
        contentSnapshot: { type: Sequelize.TEXT, allowNull: false },
        status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'pending' },
        reviewQueue: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'class_owner' },
        priority: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'standard' },
        reviewedById: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        reviewedAt: { type: Sequelize.DATE, allowNull: true },
        metadata: { type: Sequelize.JSON, allowNull: false, defaultValue: {} },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    // Older local databases may have the original moderation table from before
    // queue routing and priority were introduced. Bring those schemas forward
    // before creating indexes that depend on them.
    await ensureColumn(queryInterface, 'comment_moderation_records', 'reviewQueue', {
      type: Sequelize.STRING(32),
      allowNull: false,
      defaultValue: 'class_owner',
    });
    await ensureColumn(queryInterface, 'comment_moderation_records', 'priority', {
      type: Sequelize.STRING(16),
      allowNull: false,
      defaultValue: 'standard',
    });

    await ensureIndex(queryInterface, 'comment_moderation_records', ['commentId', 'reportedById'], {
      name: 'comment_moderation_reporter_comment_unique',
      unique: true,
    });
    await ensureIndex(queryInterface, 'comment_moderation_records', ['classroomId', 'reviewQueue', 'status', 'createdAt'], {
      name: 'comment_moderation_class_status_created_idx',
    });
    await ensureIndex(queryInterface, 'comment_moderation_records', ['reportedById', 'createdAt'], {
      name: 'comment_moderation_reporter_created_idx',
    });
    await ensureIndex(queryInterface, 'comment_moderation_records', ['reviewQueue', 'status', 'createdAt'], {
      name: 'comment_moderation_queue_status_created_idx',
    });

    if (!(await tableExists(queryInterface, 'comment_moderation_actions'))) {
      await queryInterface.createTable('comment_moderation_actions', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        reportId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: 'comment_moderation_records', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        actorId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        fromStatus: { type: Sequelize.STRING(32), allowNull: false },
        toStatus: { type: Sequelize.STRING(32), allowNull: false },
        note: { type: Sequelize.TEXT, allowNull: true },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }
    await ensureIndex(queryInterface, 'comment_moderation_actions', ['reportId', 'createdAt'], {
      name: 'comment_moderation_actions_report_created_idx',
    });
    await ensureIndex(queryInterface, 'comment_moderation_actions', ['actorId', 'createdAt'], {
      name: 'comment_moderation_actions_actor_created_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('comment_moderation_actions');
    await queryInterface.dropTable('comment_moderation_records');
  },
};
