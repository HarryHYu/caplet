/**
 * Migration 021: canonical learning-platform persistence.
 *
 * These tables form the subject-independent learning loop shared by
 * diagnostics, practice, assessment, recommendations, and teacher analytics.
 * JSONB is intentionally used for structured payloads: Sequelize maps it to a
 * portable JSON representation in the local SQLite fallback and native JSONB
 * in PostgreSQL.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    await queryInterface.createTable('curriculum_outcomes', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      jurisdiction: { type: DataTypes.STRING(50), allowNull: false },
      subject: { type: DataTypes.STRING(100), allowNull: false },
      syllabusCode: { type: DataTypes.STRING(100), allowNull: true },
      syllabusVersion: { type: DataTypes.STRING(50), allowNull: false },
      code: { type: DataTypes.STRING(100), allowNull: false },
      title: { type: DataTypes.STRING(255), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      parentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'curriculum_outcomes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      yearLevel: { type: DataTypes.STRING(50), allowNull: true },
      prerequisites: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      isAssessable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex(
      'curriculum_outcomes',
      ['jurisdiction', 'subject', 'syllabusVersion', 'code'],
      { name: 'curriculum_outcomes_syllabus_code_unique', unique: true },
    );
    await queryInterface.addIndex(
      'curriculum_outcomes',
      ['jurisdiction', 'subject', 'syllabusVersion', 'parentId', 'sortOrder'],
      { name: 'curriculum_outcomes_hierarchy_idx' },
    );
    await queryInterface.addIndex(
      'curriculum_outcomes',
      ['subject', 'syllabusVersion', 'isAssessable'],
      { name: 'curriculum_outcomes_subject_assessable_idx' },
    );

    await queryInterface.createTable('questions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      questionKey: { type: DataTypes.STRING(150), allowNull: false },
      sourceKey: { type: DataTypes.STRING(255), allowNull: true },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      previousVersionId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'questions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      subject: { type: DataTypes.STRING(100), allowNull: false },
      syllabusVersion: { type: DataTypes.STRING(50), allowNull: true },
      prompt: { type: DataTypes.TEXT, allowNull: false },
      responseType: { type: DataTypes.STRING(50), allowNull: false },
      options: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      answerKey: { type: DataTypes.JSONB, allowNull: true },
      explanation: { type: DataTypes.TEXT, allowNull: true },
      difficulty: { type: DataTypes.STRING(50), allowNull: true },
      marks: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      expectedMinutes: { type: DataTypes.INTEGER, allowNull: true },
      commandVerb: { type: DataTypes.STRING(100), allowNull: true },
      rubric: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      modelAnswer: { type: DataTypes.TEXT, allowNull: true },
      misconceptions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      source: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      lifecycleStatus: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'draft' },
      publishedAt: { type: DataTypes.DATE, allowNull: true },
      reviewedAt: { type: DataTypes.DATE, allowNull: true },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reviewedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex('questions', ['questionKey', 'version'], {
      name: 'questions_key_version_unique',
      unique: true,
    });
    await queryInterface.addIndex('questions', ['sourceKey'], {
      name: 'questions_source_key_unique',
      unique: true,
    });
    await queryInterface.addIndex('questions', ['previousVersionId'], {
      name: 'questions_previous_version_unique',
      unique: true,
    });
    await queryInterface.addIndex('questions', ['subject', 'lifecycleStatus', 'difficulty'], {
      name: 'questions_subject_status_difficulty_idx',
    });

    await queryInterface.createTable('question_outcomes', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      questionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'questions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      outcomeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'curriculum_outcomes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      weight: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex('question_outcomes', ['questionId', 'outcomeId'], {
      name: 'question_outcomes_question_outcome_unique',
      unique: true,
    });
    await queryInterface.addIndex('question_outcomes', ['outcomeId', 'isPrimary'], {
      name: 'question_outcomes_outcome_primary_idx',
    });

    await queryInterface.createTable('content_outcomes', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      contentType: { type: DataTypes.STRING(50), allowNull: false },
      contentId: { type: DataTypes.STRING(255), allowNull: false },
      contentVersion: { type: DataTypes.STRING(50), allowNull: false, defaultValue: '1' },
      outcomeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'curriculum_outcomes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      isPrimary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      weight: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1 },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex(
      'content_outcomes',
      ['contentType', 'contentId', 'contentVersion', 'outcomeId'],
      { name: 'content_outcomes_content_version_outcome_unique', unique: true },
    );
    await queryInterface.addIndex('content_outcomes', ['outcomeId', 'contentType'], {
      name: 'content_outcomes_outcome_type_idx',
    });

    await queryInterface.createTable('practice_sessions', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      subject: { type: DataTypes.STRING(100), allowNull: false },
      mode: { type: DataTypes.STRING(50), allowNull: false },
      status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'in_progress' },
      clientSessionKey: { type: DataTypes.STRING(255), allowNull: true },
      primaryOutcomeId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'curriculum_outcomes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      classroomId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'classrooms', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      assignmentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'assignments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      questionIds: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      currentIndex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      score: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
      maxScore: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
      config: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      summary: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      startedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      lastActivityAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      completedAt: { type: DataTypes.DATE, allowNull: true },
      expiresAt: { type: DataTypes.DATE, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex('practice_sessions', ['userId', 'clientSessionKey'], {
      name: 'practice_sessions_user_client_key_unique',
      unique: true,
    });
    await queryInterface.addIndex('practice_sessions', ['userId', 'status', 'lastActivityAt'], {
      name: 'practice_sessions_user_status_activity_idx',
    });
    await queryInterface.addIndex('practice_sessions', ['primaryOutcomeId', 'status'], {
      name: 'practice_sessions_outcome_status_idx',
    });
    await queryInterface.addIndex('practice_sessions', ['classroomId', 'assignmentId', 'status'], {
      name: 'practice_sessions_class_assignment_status_idx',
    });

    await queryInterface.createTable('learning_evidence', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      idempotencyKey: { type: DataTypes.STRING(255), allowNull: false },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      outcomeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'curriculum_outcomes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      questionId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'questions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      practiceSessionId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'practice_sessions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      sourceType: { type: DataTypes.STRING(50), allowNull: false },
      sourceId: { type: DataTypes.STRING(255), allowNull: true },
      attemptNumber: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      score: { type: DataTypes.FLOAT, allowNull: true },
      maxScore: { type: DataTypes.FLOAT, allowNull: true },
      normalizedScore: { type: DataTypes.FLOAT, allowNull: true },
      assessmentType: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'practice' },
      difficulty: { type: DataTypes.STRING(50), allowNull: true },
      timeTakenSeconds: { type: DataTypes.INTEGER, allowNull: true },
      markingMethod: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'deterministic' },
      misconceptionCodes: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      feedback: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      contentVersion: { type: DataTypes.STRING(100), allowNull: true },
      occurredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      revisionOfId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'learning_evidence', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex('learning_evidence', ['idempotencyKey'], {
      name: 'learning_evidence_idempotency_unique',
      unique: true,
    });
    await queryInterface.addIndex('learning_evidence', ['revisionOfId'], {
      name: 'learning_evidence_revision_of_unique',
      unique: true,
    });
    await queryInterface.addIndex('learning_evidence', ['userId', 'outcomeId', 'occurredAt'], {
      name: 'learning_evidence_user_outcome_occurred_idx',
    });
    await queryInterface.addIndex('learning_evidence', ['questionId', 'occurredAt'], {
      name: 'learning_evidence_question_occurred_idx',
    });
    await queryInterface.addIndex('learning_evidence', ['practiceSessionId', 'occurredAt'], {
      name: 'learning_evidence_session_occurred_idx',
    });
    await queryInterface.addIndex('learning_evidence', ['sourceType', 'sourceId'], {
      name: 'learning_evidence_source_idx',
    });

    await queryInterface.createTable('mastery_states', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      outcomeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'curriculum_outcomes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      probability: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
      evidenceCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      lastDemonstratedAt: { type: DataTypes.DATE, allowNull: true },
      retentionStrength: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
      confidence: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'low' },
      misconceptions: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      nextReviewAt: { type: DataTypes.DATE, allowNull: true },
      version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      calculatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex('mastery_states', ['userId', 'outcomeId'], {
      name: 'mastery_states_user_outcome_unique',
      unique: true,
    });
    await queryInterface.addIndex('mastery_states', ['userId', 'nextReviewAt'], {
      name: 'mastery_states_user_review_idx',
    });
    await queryInterface.addIndex('mastery_states', ['outcomeId', 'probability'], {
      name: 'mastery_states_outcome_probability_idx',
    });

    await queryInterface.createTable('product_events', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      idempotencyKey: { type: DataTypes.STRING(255), allowNull: false },
      type: { type: DataTypes.STRING(100), allowNull: false },
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      anonymousId: { type: DataTypes.STRING(255), allowNull: true },
      sessionId: { type: DataTypes.STRING(255), allowNull: true },
      practiceSessionId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'practice_sessions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      classroomId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'classrooms', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      outcomeId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'curriculum_outcomes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      feature: { type: DataTypes.STRING(100), allowNull: true },
      entityType: { type: DataTypes.STRING(100), allowNull: true },
      entityId: { type: DataTypes.STRING(255), allowNull: true },
      schemaVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      occurredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      receivedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });

    await queryInterface.addIndex('product_events', ['idempotencyKey'], {
      name: 'product_events_idempotency_unique',
      unique: true,
    });
    await queryInterface.addIndex('product_events', ['userId', 'occurredAt'], {
      name: 'product_events_user_occurred_idx',
    });
    await queryInterface.addIndex('product_events', ['sessionId', 'occurredAt'], {
      name: 'product_events_session_occurred_idx',
    });
    await queryInterface.addIndex('product_events', ['practiceSessionId', 'occurredAt'], {
      name: 'product_events_practice_session_occurred_idx',
    });
    await queryInterface.addIndex('product_events', ['classroomId', 'occurredAt'], {
      name: 'product_events_classroom_occurred_idx',
    });
    await queryInterface.addIndex('product_events', ['outcomeId', 'occurredAt'], {
      name: 'product_events_outcome_occurred_idx',
    });
    await queryInterface.addIndex('product_events', ['feature', 'type', 'occurredAt'], {
      name: 'product_events_feature_type_occurred_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('product_events');
    await queryInterface.dropTable('mastery_states');
    await queryInterface.dropTable('learning_evidence');
    await queryInterface.dropTable('practice_sessions');
    await queryInterface.dropTable('content_outcomes');
    await queryInterface.dropTable('question_outcomes');
    await queryInterface.dropTable('questions');
    await queryInterface.dropTable('curriculum_outcomes');
  },
};
