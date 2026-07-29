'use strict';

const OUTCOME_CODE_MAP = {
  'ECO-11-01': 'P1',
  'ECO-11-02': 'P2',
  'ECO-11-03': 'P3',
  'ECO-11-04': 'P7',
  'ECO-11-05': 'P5',
  'ECO-11-06': 'P6',
  'ECO-11-07': 'P8',
  'ECO-11-08': 'P9',
  'ECO-11-09': 'P11',
  'ECO-11-10': 'P10',
  'ECO-12-01': 'H1',
  'ECO-12-02': 'H2',
  'ECO-12-03': 'H3',
  'ECO-12-04': 'H7',
  'ECO-12-05': 'H8',
  'ECO-12-06': 'H6',
  'ECO-12-07': 'H5',
  'ECO-12-08': 'H9',
  'ECO-12-09': 'H11',
  'ECO-12-10': 'H10',
};

async function editionId(queryInterface, key) {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT "id" FROM "curriculum_editions" WHERE "key" = :key LIMIT 1',
    { replacements: { key } },
  );
  return rows[0]?.id || null;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const currentEditionId = await editionId(queryInterface, 'NSW-ECO-2009');
    const now = Sequelize.literal('CURRENT_TIMESTAMP');
    await queryInterface.bulkUpdate('curriculum_editions', {
      metadata: JSON.stringify({ status: 'taught_current', transition: true }),
      updatedAt: now,
    }, { key: 'NSW-ECO-2009' });
    await queryInterface.bulkUpdate('curriculum_editions', {
      metadata: JSON.stringify({ status: 'future_planning', firstHscYear: 2028 }),
      updatedAt: now,
    }, { key: 'NSW-ECO-2025' });
    for (const [from, to] of Object.entries(OUTCOME_CODE_MAP)) {
      await queryInterface.bulkUpdate('curriculum_outcomes', {
        code: to,
        syllabusVersion: 'NSW-2009',
        curriculumEditionId: currentEditionId,
        updatedAt: now,
      }, {
        jurisdiction: 'NSW',
        subject: 'economics',
        syllabusVersion: 'NSW-2025',
        code: from,
      });
    }
    for (const [from, to] of [['ECO-11', 'ECON-11-2009'], ['ECO-12', 'ECON-12-2009']]) {
      await queryInterface.bulkUpdate('curriculum_outcomes', {
        code: to,
        syllabusVersion: 'NSW-2009',
        curriculumEditionId: currentEditionId,
        updatedAt: now,
      }, {
        jurisdiction: 'NSW',
        subject: 'economics',
        syllabusVersion: 'NSW-2025',
        code: from,
      });
    }
    await queryInterface.bulkUpdate('questions', {
      syllabusVersion: 'NSW-2009',
      curriculumEditionId: currentEditionId,
      updatedAt: now,
    }, {
      subject: 'economics',
      [Sequelize.Op.and]: [
        { sourceKey: { [Sequelize.Op.like]: 'economics:%' } },
        { sourceKey: { [Sequelize.Op.notLike]: 'economics:eco-hsc-2025-syllabus-readiness-pack%' } },
      ],
    });
  },

  async down(queryInterface, Sequelize) {
    const futureEditionId = await editionId(queryInterface, 'NSW-ECO-2025');
    const now = Sequelize.literal('CURRENT_TIMESTAMP');
    await queryInterface.bulkUpdate('curriculum_editions', {
      metadata: JSON.stringify({ status: 'transition', legacy: true }),
      updatedAt: now,
    }, { key: 'NSW-ECO-2009' });
    await queryInterface.bulkUpdate('curriculum_editions', {
      metadata: JSON.stringify({ status: 'current' }),
      updatedAt: now,
    }, { key: 'NSW-ECO-2025' });
    const reverseMap = Object.fromEntries(Object.entries(OUTCOME_CODE_MAP).map(([from, to]) => [to, from]));
    for (const [from, to] of Object.entries(reverseMap)) {
      await queryInterface.bulkUpdate('curriculum_outcomes', {
        code: to,
        syllabusVersion: 'NSW-2025',
        curriculumEditionId: futureEditionId,
        updatedAt: now,
      }, {
        jurisdiction: 'NSW',
        subject: 'economics',
        syllabusVersion: 'NSW-2009',
        code: from,
      });
    }
    for (const [from, to] of [['ECON-11-2009', 'ECO-11'], ['ECON-12-2009', 'ECO-12']]) {
      await queryInterface.bulkUpdate('curriculum_outcomes', {
        code: to,
        syllabusVersion: 'NSW-2025',
        curriculumEditionId: futureEditionId,
        updatedAt: now,
      }, {
        jurisdiction: 'NSW',
        subject: 'economics',
        syllabusVersion: 'NSW-2009',
        code: from,
      });
    }
    await queryInterface.bulkUpdate('questions', {
      syllabusVersion: 'NSW-2025',
      curriculumEditionId: futureEditionId,
      updatedAt: now,
    }, {
      subject: 'economics',
      syllabusVersion: 'NSW-2009',
      sourceKey: { [Sequelize.Op.like]: 'economics:%' },
    });
  },
};
