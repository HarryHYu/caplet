const path = require('path');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');

jest.setTimeout(15000);

describe('Curriculum Studio generic subject workflow', () => {
  let database;
  let models;
  let subjectPacks;
  let practice;
  let teacher;
  let student;

  beforeAll(async () => {
    database = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
    const runner = new Umzug({
      migrations: {
        glob: path.join(__dirname, '../migrations/*.js').split(path.sep).join('/'),
        resolve: ({ name, path: migrationPath, context }) => {
          const migration = require(migrationPath);
          return {
            name,
            up: () => migration.up(context, require('sequelize')),
            down: () => migration.down(context, require('sequelize')),
          };
        },
      },
      context: database.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize: database }),
      logger: undefined,
    });
    await runner.up();

    jest.doMock('../config/database', () => ({ sequelize: database }));
    models = require('../models');
    subjectPacks = require('../services/subjectPackService');
    practice = require('../services/practiceEngine');
    teacher = await models.User.create({
      email: 'legal-teacher@example.test', password: 'password123', firstName: 'Legal', lastName: 'Teacher', role: 'instructor',
    });
    student = await models.User.create({
      email: 'legal-student@example.test', password: 'password123', firstName: 'Legal', lastName: 'Student', role: 'student',
    });
  });

  afterAll(async () => {
    await database.close();
    jest.dontMock('../config/database');
    jest.resetModules();
  });

  test('creates the Business Studies template cleanly on a fresh database', async () => {
    const pack = await subjectPacks.createBusinessStudiesPack(teacher.id);
    expect(pack).toMatchObject({ subject: 'business-studies', version: 1, lifecycleStatus: 'in_review' });
    expect(pack.outcomes.filter((outcome) => outcome.isAssessable !== false)).toHaveLength(20);
    expect(pack.questions).toHaveLength(23);
    expect(pack.readiness.coverage).toMatchObject({ ready: 20, total: 20, gaps: [] });
  });

  test('imports, authors, reviews, publishes, practises, versions, and archives Legal Studies without subject-specific code', async () => {
    let pack = await subjectPacks.importSubjectPack(teacher.id, {
      title: 'HSC Legal Studies',
      subject: 'legal-studies',
      syllabusVersion: 'NSW-2025',
      jurisdiction: 'NSW',
      sourceUrl: 'https://curriculum.nsw.edu.au/learning-areas/hsie/legal-studies-11-12-2025',
      sourceName: 'Legal Studies 11–12 Syllabus',
      sourceType: 'text/plain',
      extractedText: [
        'LS11-1 examines the role of the legal system in regulating society',
        'LS11-2 explains the relationship between law, justice and society',
        'LS11-3 investigates the operation of legal institutions and processes',
        'LS11-4 evaluates the effectiveness of legal and non-legal responses',
        'LS11-5 communicates legal information using appropriate forms',
      ].join('\n'),
      sourceDocuments: [{
        id: 'legal-syllabus', name: 'Legal Studies 11–12 Syllabus', type: 'text/plain',
        url: 'https://curriculum.nsw.edu.au/learning-areas/hsie/legal-studies-11-12-2025', verified: false,
      }],
    });
    expect(pack.outcomes).toHaveLength(5);
    expect(pack.readiness.canPublish).toBe(false);

    const sourceReview = pack.reviewItems.find((item) => item.itemType === 'source_verification');
    pack = await subjectPacks.resolveReviewItem(pack.id, sourceReview.id, teacher, { optionId: 'verified' });
    expect(pack.readiness.sources.percent).toBe(100);

    for (const [index, outcome] of pack.outcomes.entries()) {
      const created = await subjectPacks.createPackQuestion(pack.id, teacher, {
        prompt: `Which legal principle best explains scenario ${index + 1}?`,
        responseType: 'multiple_choice',
        options: ['Principle A', 'Principle B'],
        answerKey: { index: 0, value: 'Principle A' },
        explanation: 'The facts engage Principle A.',
        difficulty: 'standard',
        marks: 1,
        expectedMinutes: 2,
        commandVerb: 'identify',
        rubric: ['Identifies the applicable legal principle'],
        modelAnswer: 'Principle A applies because it matches the facts.',
        misconceptions: ['confuses-legal-principles'],
        source: { title: 'Legal Studies syllabus', url: 'https://curriculum.nsw.edu.au/legal-studies' },
        outcomeIds: [outcome.id],
      });
      await subjectPacks.transitionPackQuestion(pack.id, created.question.id, teacher, { status: 'in_review' });
      const approved = await subjectPacks.transitionPackQuestion(pack.id, created.question.id, teacher, { status: 'approved', humanReviewed: true });
      pack = approved.subjectPack;
    }

    expect(pack.readiness).toMatchObject({
      canPublish: true,
      coverage: { ready: 5, total: 5, gaps: [] },
      diagnostic: { ready: 5, total: 5 },
    });
    pack = await subjectPacks.publishSubjectPack(pack.id, teacher);
    expect(pack.lifecycleStatus).toBe('published');
    expect(pack.questions.every((question) => question.lifecycleStatus === 'published')).toBe(true);

    const session = await practice.createPracticeSession(student.id, { subject: 'legal-studies', mode: 'diagnostic', source: 'practice' });
    expect(session.questions).toHaveLength(5);
    expect(new Set(session.questions.flatMap((question) => question.outcomes.map((outcome) => outcome.code))).size).toBe(5);

    const nextVersion = await subjectPacks.createSubjectPackVersion(pack.id, teacher);
    expect(nextVersion).toMatchObject({ version: 2, lifecycleStatus: 'in_review' });
    expect(nextVersion.outcomes).toHaveLength(5);
    expect(nextVersion.questions).toHaveLength(5);
    expect(nextVersion.readiness.canPublish).toBe(false);
    expect(nextVersion.readiness.blockers).toEqual(expect.arrayContaining([expect.stringMatching(/Verify every syllabus source/) ]));

    const archivedQuestion = await subjectPacks.transitionPackQuestion(
      nextVersion.id,
      nextVersion.questions[0].id,
      teacher,
      { status: 'archived' },
    );
    expect(archivedQuestion.question.lifecycleStatus).toBe('archived');
    expect(archivedQuestion.subjectPack.readiness.coverage.ready).toBe(4);
    expect(archivedQuestion.subjectPack.readiness.coverage.gaps).toHaveLength(1);

    const archived = await subjectPacks.archiveSubjectPack(pack.id, teacher);
    expect(archived.lifecycleStatus).toBe('archived');
    expect(archived.questions.every((question) => question.lifecycleStatus === 'archived')).toBe(true);
  });
});
