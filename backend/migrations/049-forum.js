'use strict';

// Study forum: Category -> Thread -> Post, pre-moderation, reports, sanctions.
// Self-contained — every foreign key here points either at another forum_*
// table or at users (identity only). No FKs into courses/lessons/modules/
// classrooms/curriculum data: the forum is its own product sharing just the
// account/auth layer, not a feature bolted onto the course catalog.
//
// SAFETY: this migration is strictly additive. It only ever creates tables
// and indexes — it must never ALTER an existing table or DROP anything.
// down() is intentionally a no-op: forum tables are never dropped, even on
// rollback (see project rule: migrations are additive-only, no destructive
// operations, ever).

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

module.exports = {
  async up(queryInterface, Sequelize) {
    const timestamps = () => ({
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    if (!(await tableExists(queryInterface, 'forum_categories'))) {
      await queryInterface.createTable('forum_categories', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        name: { type: Sequelize.STRING(80), allowNull: false },
        slug: { type: Sequelize.STRING(80), allowNull: false, unique: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        color: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'coral' },
        sortOrder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        isLocked: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        isArchived: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        threadCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        postCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        lastActivityAt: { type: Sequelize.DATE, allowNull: true },
        createdById: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        ...timestamps(),
      });
    }

    if (!(await tableExists(queryInterface, 'forum_threads'))) {
      await queryInterface.createTable('forum_threads', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        categoryId: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'forum_categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
        },
        authorId: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        title: { type: Sequelize.STRING(200), allowNull: false },
        slug: { type: Sequelize.STRING(220), allowNull: false },
        body: { type: Sequelize.TEXT, allowNull: false },
        isQuestion: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'pending' },
        moderationNote: { type: Sequelize.TEXT, allowNull: true },
        reviewedById: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        reviewedAt: { type: Sequelize.DATE, allowNull: true },
        isPinned: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        isLocked: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        isDeleted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        deletedById: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
        viewCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        replyCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        likeCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        bestAnswerPostId: { type: Sequelize.UUID, allowNull: true },
        flagCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        autoFlagged: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        autoFlagReasons: { type: Sequelize.JSON, allowNull: false, defaultValue: [] },
        lastActivityAt: { type: Sequelize.DATE, allowNull: true },
        ...timestamps(),
      });
    }
    await ensureIndex(queryInterface, 'forum_threads', ['categoryId', 'status', 'isDeleted'], { name: 'forum_threads_category_status_idx' });
    await ensureIndex(queryInterface, 'forum_threads', ['authorId'], { name: 'forum_threads_author_idx' });
    await ensureIndex(queryInterface, 'forum_threads', ['status', 'createdAt'], { name: 'forum_threads_status_created_idx' });

    if (!(await tableExists(queryInterface, 'forum_posts'))) {
      await queryInterface.createTable('forum_posts', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        threadId: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'forum_threads', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT',
        },
        authorId: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        parentPostId: { type: Sequelize.UUID, allowNull: true },
        content: { type: Sequelize.TEXT, allowNull: false },
        status: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'pending' },
        moderationNote: { type: Sequelize.TEXT, allowNull: true },
        reviewedById: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        reviewedAt: { type: Sequelize.DATE, allowNull: true },
        isDeleted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        deletedById: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
        likeCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        flagCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        autoFlagged: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        autoFlagReasons: { type: Sequelize.JSON, allowNull: false, defaultValue: [] },
        editedAt: { type: Sequelize.DATE, allowNull: true },
        ...timestamps(),
      });
    }
    await ensureIndex(queryInterface, 'forum_posts', ['threadId', 'status', 'isDeleted'], { name: 'forum_posts_thread_status_idx' });
    await ensureIndex(queryInterface, 'forum_posts', ['authorId'], { name: 'forum_posts_author_idx' });
    await ensureIndex(queryInterface, 'forum_posts', ['status', 'createdAt'], { name: 'forum_posts_status_created_idx' });

    if (!(await tableExists(queryInterface, 'forum_likes'))) {
      await queryInterface.createTable('forum_likes', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        userId: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        likeableType: { type: Sequelize.STRING(16), allowNull: false },
        likeableId: { type: Sequelize.UUID, allowNull: false },
        ...timestamps(),
      });
    }
    await ensureIndex(queryInterface, 'forum_likes', ['userId', 'likeableType', 'likeableId'], { name: 'forum_likes_user_target_unique', unique: true });
    await ensureIndex(queryInterface, 'forum_likes', ['likeableType', 'likeableId'], { name: 'forum_likes_target_idx' });

    if (!(await tableExists(queryInterface, 'forum_reports'))) {
      await queryInterface.createTable('forum_reports', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        reportableType: { type: Sequelize.STRING(16), allowNull: false },
        reportableId: { type: Sequelize.UUID, allowNull: false },
        reportedById: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        contentAuthorId: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        reason: { type: Sequelize.STRING(32), allowNull: false },
        details: { type: Sequelize.TEXT, allowNull: true },
        contentSnapshot: { type: Sequelize.TEXT, allowNull: false },
        status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'pending' },
        reviewQueue: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'moderator' },
        priority: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'standard' },
        reviewedById: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        reviewedAt: { type: Sequelize.DATE, allowNull: true },
        metadata: { type: Sequelize.JSON, allowNull: false, defaultValue: {} },
        ...timestamps(),
      });
    }
    await ensureIndex(queryInterface, 'forum_reports', ['reportableType', 'reportableId', 'reportedById'], { name: 'forum_reports_reporter_target_unique', unique: true });
    await ensureIndex(queryInterface, 'forum_reports', ['reviewQueue', 'status', 'createdAt'], { name: 'forum_reports_queue_status_idx' });
    await ensureIndex(queryInterface, 'forum_reports', ['reportableType', 'reportableId'], { name: 'forum_reports_target_idx' });

    if (!(await tableExists(queryInterface, 'forum_moderation_actions'))) {
      await queryInterface.createTable('forum_moderation_actions', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        actorId: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        action: { type: Sequelize.STRING(32), allowNull: false },
        targetType: { type: Sequelize.STRING(16), allowNull: false },
        targetId: { type: Sequelize.UUID, allowNull: false },
        reportId: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'forum_reports', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        note: { type: Sequelize.TEXT, allowNull: true },
        ...timestamps(),
      });
    }
    await ensureIndex(queryInterface, 'forum_moderation_actions', ['targetType', 'targetId', 'createdAt'], { name: 'forum_mod_actions_target_idx' });
    await ensureIndex(queryInterface, 'forum_moderation_actions', ['actorId', 'createdAt'], { name: 'forum_mod_actions_actor_idx' });

    if (!(await tableExists(queryInterface, 'forum_moderators'))) {
      await queryInterface.createTable('forum_moderators', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        userId: {
          type: Sequelize.UUID, allowNull: false, unique: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        grantedById: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        notes: { type: Sequelize.TEXT, allowNull: true },
        ...timestamps(),
      });
    }

    if (!(await tableExists(queryInterface, 'forum_sanctions'))) {
      await queryInterface.createTable('forum_sanctions', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        userId: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        type: { type: Sequelize.STRING(16), allowNull: false },
        reason: { type: Sequelize.TEXT, allowNull: true },
        issuedById: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        expiresAt: { type: Sequelize.DATE, allowNull: true },
        liftedAt: { type: Sequelize.DATE, allowNull: true },
        liftedById: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL',
        },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestamps(),
      });
    }
    await ensureIndex(queryInterface, 'forum_sanctions', ['userId', 'active'], { name: 'forum_sanctions_user_active_idx' });
  },

  async down() {
    // Intentionally a no-op. Forum tables are never dropped — see the
    // additive-only migration policy at the top of this file.
  },
};
