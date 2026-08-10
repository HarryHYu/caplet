'use strict';

// Forum feature pass: tags/flairs, study reactions, saves, contribution
// stats, megathreads, polls, subject follows, in-app notifications.
//
// SAFETY: strictly additive, same rule as 049-forum.js. Only ADD COLUMN on
// existing forum_* tables and CREATE TABLE for new ones — never ALTER an
// existing column's type/constraint, never DROP anything. down() is a
// no-op. Every FK here points at another forum_* table or at users
// (identity only) — still no relationship into Course/Lesson/Module/
// Classroom/CurriculumOutcome.

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    if (typeof table === 'string') return table === tableName;
    return table?.tableName === tableName || table?.name === tableName;
  });
}

async function ensureColumn(queryInterface, tableName, columnName, definition) {
  const columns = await queryInterface.describeTable(tableName);
  if (columns[columnName]) return;
  await queryInterface.addColumn(tableName, columnName, definition);
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

    // --- Additive columns on existing forum tables ---------------------
    await ensureColumn(queryInterface, 'forum_threads', 'tags', {
      type: Sequelize.TEXT, allowNull: false, defaultValue: '[]',
    });
    await ensureColumn(queryInterface, 'forum_threads', 'isMegathread', {
      type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false,
    });
    await ensureColumn(queryInterface, 'forum_threads', 'reactionCounts', {
      type: Sequelize.TEXT, allowNull: false, defaultValue: '{}',
    });
    await ensureColumn(queryInterface, 'forum_posts', 'reactionCounts', {
      type: Sequelize.TEXT, allowNull: false, defaultValue: '{}',
    });

    // --- Reactions -------------------------------------------------------
    if (!(await tableExists(queryInterface, 'forum_reactions'))) {
      await queryInterface.createTable('forum_reactions', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        userId: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        reactableType: { type: Sequelize.STRING(16), allowNull: false },
        reactableId: { type: Sequelize.UUID, allowNull: false },
        reactionType: { type: Sequelize.STRING(24), allowNull: false },
        ...timestamps(),
      });
    }
    await ensureIndex(queryInterface, 'forum_reactions', ['userId', 'reactableType', 'reactableId', 'reactionType'], { name: 'forum_reactions_user_target_type_unique', unique: true });
    await ensureIndex(queryInterface, 'forum_reactions', ['reactableType', 'reactableId'], { name: 'forum_reactions_target_idx' });

    // --- Saves (revision list) -------------------------------------------
    if (!(await tableExists(queryInterface, 'forum_saves'))) {
      await queryInterface.createTable('forum_saves', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        userId: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        threadId: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'forum_threads', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        ...timestamps(),
      });
    }
    await ensureIndex(queryInterface, 'forum_saves', ['userId', 'threadId'], { name: 'forum_saves_user_thread_unique', unique: true });
    await ensureIndex(queryInterface, 'forum_saves', ['userId', 'createdAt'], { name: 'forum_saves_user_idx' });

    // --- Contribution / reputation ---------------------------------------
    if (!(await tableExists(queryInterface, 'forum_user_stats'))) {
      await queryInterface.createTable('forum_user_stats', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        userId: {
          type: Sequelize.UUID, allowNull: false, unique: true,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        contributionScore: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        bestAnswerCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        helpfulReactionsReceived: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        approvedThreadCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        approvedPostCount: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        badges: { type: Sequelize.TEXT, allowNull: false, defaultValue: '[]' },
        ...timestamps(),
      });
    }

    // --- Polls -------------------------------------------------------------
    if (!(await tableExists(queryInterface, 'forum_polls'))) {
      await queryInterface.createTable('forum_polls', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        threadId: {
          type: Sequelize.UUID, allowNull: false, unique: true,
          references: { model: 'forum_threads', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        question: { type: Sequelize.STRING(300), allowNull: false },
        allowMultiple: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        closesAt: { type: Sequelize.DATE, allowNull: true },
        ...timestamps(),
      });
    }

    if (!(await tableExists(queryInterface, 'forum_poll_options'))) {
      await queryInterface.createTable('forum_poll_options', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        pollId: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'forum_polls', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        text: { type: Sequelize.STRING(200), allowNull: false },
        sortOrder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        ...timestamps(),
      });
    }
    await ensureIndex(queryInterface, 'forum_poll_options', ['pollId', 'sortOrder'], { name: 'forum_poll_options_poll_idx' });

    if (!(await tableExists(queryInterface, 'forum_poll_votes'))) {
      await queryInterface.createTable('forum_poll_votes', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        pollId: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'forum_polls', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        optionId: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'forum_poll_options', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        userId: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        ...timestamps(),
      });
    }
    await ensureIndex(queryInterface, 'forum_poll_votes', ['pollId', 'optionId', 'userId'], { name: 'forum_poll_votes_unique', unique: true });
    await ensureIndex(queryInterface, 'forum_poll_votes', ['pollId', 'userId'], { name: 'forum_poll_votes_poll_user_idx' });

    // --- Subject follows + notifications -----------------------------------
    if (!(await tableExists(queryInterface, 'forum_subscriptions'))) {
      await queryInterface.createTable('forum_subscriptions', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        userId: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        categoryId: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'forum_categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        ...timestamps(),
      });
    }
    await ensureIndex(queryInterface, 'forum_subscriptions', ['userId', 'categoryId'], { name: 'forum_subscriptions_user_category_unique', unique: true });
    await ensureIndex(queryInterface, 'forum_subscriptions', ['categoryId'], { name: 'forum_subscriptions_category_idx' });

    if (!(await tableExists(queryInterface, 'forum_notifications'))) {
      await queryInterface.createTable('forum_notifications', {
        id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
        userId: {
          type: Sequelize.UUID, allowNull: false,
          references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        type: { type: Sequelize.STRING(32), allowNull: false },
        threadId: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'forum_threads', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        categoryId: {
          type: Sequelize.UUID, allowNull: true,
          references: { model: 'forum_categories', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE',
        },
        message: { type: Sequelize.STRING(300), allowNull: false },
        isRead: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        ...timestamps(),
      });
    }
    await ensureIndex(queryInterface, 'forum_notifications', ['userId', 'isRead', 'createdAt'], { name: 'forum_notifications_user_read_idx' });
  },

  async down() {
    // Intentionally a no-op — see the additive-only migration policy above.
  },
};
