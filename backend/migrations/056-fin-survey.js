'use strict';

// Financial-literacy survey (temporary, hidden pages): one row per response.
// Name/email/school are their own columns for the results table; everything
// else lives in an answers JSONB blob so questions can change without
// another migration. Signup happens alongside (users table), not here.
//
// SAFETY: up() is strictly additive in production — it only creates the
// table. down() exists for explicit rollback and CI rehearsal only.

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    if (typeof table === 'string') return table === tableName;
    return table?.tableName === tableName || table?.name === tableName;
  });
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await tableExists(queryInterface, 'fin_survey_responses')) return;
    await queryInterface.createTable('fin_survey_responses', {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      name: { type: Sequelize.STRING(120), allowNull: false },
      email: { type: Sequelize.STRING(255), allowNull: false },
      school: { type: Sequelize.STRING(160), allowNull: true },
      answers: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
      accountCreated: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('fin_survey_responses', ['email'], { unique: true });
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, 'fin_survey_responses')) {
      await queryInterface.dropTable('fin_survey_responses');
    }
  },
};
