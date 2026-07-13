const crypto = require('crypto');
const SequelizePackage = require('sequelize');
const { Sequelize, DataTypes } = SequelizePackage;

const learningMigration = require('../migrations/021-learning-platform');
const questionOwnershipMigration = require('../migrations/029-question-workspace-ownership');
const models = require('../models');

describe('canonical learning-platform persistence', () => {
  test('migration creates the complete portable schema and critical unique indexes', async () => {
    const database = new Sequelize('sqlite::memory:', { logging: false });
    const queryInterface = database.getQueryInterface();

    await queryInterface.createTable('users', {
      id: { type: DataTypes.UUID, primaryKey: true },
    });
    await queryInterface.createTable('classrooms', {
      id: { type: DataTypes.UUID, primaryKey: true },
    });
    await queryInterface.createTable('assignments', {
      id: { type: DataTypes.UUID, primaryKey: true },
    });
    await queryInterface.createTable('editor_workspaces', {
      id: { type: DataTypes.UUID, primaryKey: true },
    });

    try {
      await learningMigration.up(queryInterface, SequelizePackage);
      await questionOwnershipMigration.up(queryInterface, SequelizePackage);

      const tables = await queryInterface.showAllTables();
      expect(tables).toEqual(expect.arrayContaining([
        'curriculum_outcomes',
        'content_outcomes',
        'questions',
        'question_outcomes',
        'practice_sessions',
        'learning_evidence',
        'mastery_states',
        'product_events',
      ]));

      const schemaModels = [
        ['curriculum_outcomes', models.CurriculumOutcome],
        ['content_outcomes', models.ContentOutcome],
        ['questions', models.Question],
        ['question_outcomes', models.QuestionOutcome],
        ['practice_sessions', models.PracticeSession],
        ['learning_evidence', models.LearningEvidence],
        ['mastery_states', models.MasteryState],
        ['product_events', models.ProductEvent],
      ];
      for (const [tableName, Model] of schemaModels) {
        const columns = await queryInterface.describeTable(tableName);
        // curriculumEditionId is introduced by the later curriculum-editions
        // migration (037); this historical portability rehearsal intentionally
        // exercises the earlier learning-platform migration (021) in isolation.
        const persistedAttributes = Object.values(Model.rawAttributes)
          .filter((attribute) => attribute.type?.key !== 'VIRTUAL')
          .filter((attribute) => attribute.field !== 'curriculumEditionId')
          .map((attribute) => attribute.field)
          .sort();
        expect(Object.keys(columns).sort()).toEqual(persistedAttributes);
      }

      const evidenceColumns = await queryInterface.describeTable('learning_evidence');
      expect(evidenceColumns).toEqual(expect.objectContaining({
        idempotencyKey: expect.any(Object),
        outcomeId: expect.any(Object),
        revisionOfId: expect.any(Object),
        normalizedScore: expect.any(Object),
        occurredAt: expect.any(Object),
      }));

      const questionColumns = await queryInterface.describeTable('questions');
      expect(questionColumns).toEqual(expect.objectContaining({
        questionKey: expect.any(Object),
        sourceKey: expect.any(Object),
        version: expect.any(Object),
        previousVersionId: expect.any(Object),
        lifecycleStatus: expect.any(Object),
      }));

      const uniqueIndexNames = async (table) => (await queryInterface.showIndex(table))
        .filter((index) => index.unique)
        .map((index) => index.name);

      await expect(uniqueIndexNames('questions')).resolves.toEqual(expect.arrayContaining([
        'questions_key_version_unique',
        'questions_source_key_unique',
        'questions_previous_version_unique',
      ]));
      await expect(uniqueIndexNames('learning_evidence')).resolves.toEqual(expect.arrayContaining([
        'learning_evidence_idempotency_unique',
        'learning_evidence_revision_of_unique',
      ]));
      await expect(uniqueIndexNames('mastery_states')).resolves.toContain(
        'mastery_states_user_outcome_unique',
      );
      await expect(uniqueIndexNames('product_events')).resolves.toContain(
        'product_events_idempotency_unique',
      );

      // Prove the outcome natural key is enforced, not merely declared in the model.
      const outcome = {
        id: crypto.randomUUID(),
        jurisdiction: 'NSW',
        subject: 'economics',
        syllabusCode: 'economics-stage-6',
        syllabusVersion: '2025',
        code: 'E12-1',
        title: 'Applies economic terms and concepts',
        sortOrder: 1,
        isAssessable: true,
        metadata: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await queryInterface.bulkInsert('curriculum_outcomes', [outcome]);
      await expect(queryInterface.bulkInsert('curriculum_outcomes', [{
        ...outcome,
        id: crypto.randomUUID(),
      }])).rejects.toThrow();

      const userId = crypto.randomUUID();
      await queryInterface.bulkInsert('users', [{ id: userId }]);
      const originalEvidence = {
        id: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        userId,
        outcomeId: outcome.id,
        sourceType: 'practice_answer',
        attemptNumber: 1,
        assessmentType: 'practice',
        markingMethod: 'deterministic',
        misconceptionCodes: JSON.stringify([]),
        feedback: JSON.stringify({}),
        occurredAt: new Date(),
        metadata: JSON.stringify({}),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await queryInterface.bulkInsert('learning_evidence', [originalEvidence]);
      await expect(queryInterface.bulkInsert('learning_evidence', [{
        ...originalEvidence,
        id: crypto.randomUUID(),
      }])).rejects.toThrow();

      const revision = {
        ...originalEvidence,
        id: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        revisionOfId: originalEvidence.id,
        markingMethod: 'human',
      };
      await queryInterface.bulkInsert('learning_evidence', [revision]);
      await expect(queryInterface.bulkInsert('learning_evidence', [{
        ...revision,
        id: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
      }])).rejects.toThrow();

      // User privacy deletion can still remove an entire immutable revision chain.
      await queryInterface.bulkDelete('users', { id: userId });
      const [remainingEvidence] = await database.query('SELECT COUNT(*) AS count FROM learning_evidence');
      expect(Number(remainingEvidence[0].count)).toBe(0);

      await questionOwnershipMigration.down(queryInterface);
      await learningMigration.down(queryInterface);
      const tablesAfterDown = await queryInterface.showAllTables();
      expect(tablesAfterDown).not.toEqual(expect.arrayContaining([
        'curriculum_outcomes',
        'learning_evidence',
        'product_events',
      ]));
    } finally {
      await database.close();
    }
  });

  test('models expose the canonical fields and navigable associations', () => {
    expect(Object.keys(models.CurriculumOutcome.rawAttributes)).toEqual(expect.arrayContaining([
      'jurisdiction',
      'subject',
      'syllabusVersion',
      'code',
      'parentId',
      'isAssessable',
    ]));
    expect(Object.keys(models.Question.rawAttributes)).toEqual(expect.arrayContaining([
      'questionKey',
      'sourceKey',
      'version',
      'options',
      'answerKey',
      'rubric',
      'lifecycleStatus',
    ]));
    expect(Object.keys(models.LearningEvidence.rawAttributes)).toEqual(expect.arrayContaining([
      'idempotencyKey',
      'userId',
      'outcomeId',
      'questionId',
      'practiceSessionId',
      'normalizedScore',
      'revisionOfId',
    ]));
    expect(Object.keys(models.MasteryState.rawAttributes)).toEqual(expect.arrayContaining([
      'userId',
      'outcomeId',
      'probability',
      'evidenceCount',
      'retentionStrength',
      'confidence',
      'nextReviewAt',
      'version',
    ]));

    expect(models.CurriculumOutcome.associations).toEqual(expect.objectContaining({
      parent: expect.any(Object),
      children: expect.any(Object),
      questions: expect.any(Object),
      masteryStates: expect.any(Object),
    }));
    expect(models.Question.associations).toEqual(expect.objectContaining({
      previousVersion: expect.any(Object),
      nextVersion: expect.any(Object),
      outcomes: expect.any(Object),
      learningEvidence: expect.any(Object),
    }));
    expect(models.LearningEvidence.associations).toEqual(expect.objectContaining({
      user: expect.any(Object),
      outcome: expect.any(Object),
      question: expect.any(Object),
      practiceSession: expect.any(Object),
      revisionOf: expect.any(Object),
      revision: expect.any(Object),
    }));
  });

  test('evidence validates score coherence and rejects in-place updates', async () => {
    const evidence = models.LearningEvidence.build({
      id: crypto.randomUUID(),
      idempotencyKey: crypto.randomUUID(),
      userId: crypto.randomUUID(),
      outcomeId: crypto.randomUUID(),
      sourceType: 'practice_answer',
      score: 3,
      maxScore: 2,
    });

    await expect(evidence.validate()).rejects.toThrow('score cannot exceed maxScore');

    evidence.score = 2;
    await expect(evidence.validate()).resolves.toBe(evidence);
    await expect(Promise.resolve().then(() => models.LearningEvidence.runHooks(
      'beforeUpdate',
      evidence,
      {},
    ))).rejects.toThrow('LearningEvidence is append-only');
  });

  test('question and practice lifecycles reject unknown states', async () => {
    const question = models.Question.build({
      subject: 'economics',
      prompt: 'Explain opportunity cost.',
      responseType: 'short_answer',
      lifecycleStatus: 'silently_live',
    });
    await expect(question.validate()).rejects.toThrow();

    const session = models.PracticeSession.build({
      userId: crypto.randomUUID(),
      subject: 'economics',
      mode: 'daily',
      status: 'unknown',
    });
    await expect(session.validate()).rejects.toThrow();
  });
});
