/**
 * Migration: live hosted quiz sessions (Kahoot-style).
 *
 * Three tables:
 *   - live_sessions:     one row per hosted session (a lesson played in
 *                        lockstep across devices, joined via a short code)
 *   - live_participants: one row per player in a session — `userId` is
 *                        nullable because real Kahoot-style joining needs no
 *                        account, just a nickname
 *   - live_responses:    one row per (participant, slideIndex) answer,
 *                        graded and timestamped server-side so scoring can't
 *                        be spoofed by the client
 *
 * `code` reuses the same 6-char alphabet/collision-retry approach as
 * Classroom.code (backend/routes/classes.js generateClassCode) but lives in
 * its own table since a live session is a standalone, ephemeral entity, not
 * a Classroom.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable('live_sessions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      code: {
        type: DataTypes.STRING(16),
        allowNull: false,
        unique: true
      },
      hostUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      lessonId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'lessons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      classroomId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'classrooms', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      // 'lobby' | 'active' | 'question_open' | 'reveal' | 'finished'
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'lobby'
      },
      currentSlideIndex: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: -1
      },
      // { questionSeconds: number } for now — extensible without a migration.
      settings: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      endedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    await queryInterface.addIndex('live_sessions', ['hostUserId'], {
      name: 'live_sessions_host_idx'
    });

    await queryInterface.createTable('live_participants', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      sessionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'live_sessions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      // Nullable on purpose — anonymous nickname-only joining is the point.
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      nickname: {
        type: DataTypes.STRING(40),
        allowNull: false
      },
      totalScore: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      connected: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    await queryInterface.addIndex('live_participants', ['sessionId'], {
      name: 'live_participants_session_idx'
    });

    await queryInterface.createTable('live_responses', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      sessionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'live_sessions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      participantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'live_participants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      slideIndex: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      responseData: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      correct: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      pointsAwarded: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      answeredAtMs: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // One response per participant per slide (re-answering just updates it).
    await queryInterface.addConstraint('live_responses', {
      fields: ['participantId', 'slideIndex'],
      type: 'unique',
      name: 'live_responses_participant_slide_unique'
    });

    await queryInterface.addIndex('live_responses', ['sessionId', 'slideIndex'], {
      name: 'live_responses_session_slide_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('live_responses');
    await queryInterface.dropTable('live_participants');
    await queryInterface.dropTable('live_sessions');
  }
};
