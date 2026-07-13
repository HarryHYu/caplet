const crypto = require('crypto');
const express = require('express');
const request = require('supertest');
const SequelizePackage = require('sequelize');
const { Sequelize, DataTypes } = SequelizePackage;

const privacyMigration = require('../migrations/025-privacy-controls');
const guardianMigration = require('../migrations/027-guardian-consent');

const userId = crypto.randomUUID();
let database;
let queryInterface;
let GuardianConsentRequest;
let UserPrivacyPreference;
let ConsentRecord;
let privacyRouter;

const currentUser = {
  id: userId,
  email: 'learner@example.test',
  firstName: 'Learner',
  lastName: 'Student',
  dateOfBirth: '2012-04-10',
  toJSON() { return { ...this }; },
};

beforeAll(async () => {
  database = new Sequelize('sqlite::memory:', { logging: false });
  queryInterface = database.getQueryInterface();
  await queryInterface.createTable('users', {
    id: { type: DataTypes.UUID, primaryKey: true },
  });
  await queryInterface.createTable('editor_workspaces', {
    id: { type: DataTypes.UUID, primaryKey: true },
  });
  await queryInterface.bulkInsert('users', [{ id: userId }]);
  await privacyMigration.up(queryInterface, SequelizePackage);
  await guardianMigration.up(queryInterface, SequelizePackage);

  jest.doMock('../config/database', () => ({ sequelize: database }));
  GuardianConsentRequest = require('../models/GuardianConsentRequest');
  UserPrivacyPreference = require('../models/UserPrivacyPreference');
  ConsentRecord = require('../models/ConsentRecord');
  const AIInteraction = database.define('AIInteractionForPrivacyTest', {
    id: { type: DataTypes.UUID, primaryKey: true },
  }, { tableName: 'ai_interactions', timestamps: true });

  jest.doMock('../models', () => ({
    sequelize: database,
    GuardianConsentRequest,
    UserPrivacyPreference,
    ConsentRecord,
    AIInteraction,
  }));
  jest.doMock('../middleware/auth', () => ({
    requireAuth(req, _res, next) {
      req.user = currentUser;
      next();
    },
  }));
  privacyRouter = require('../routes/privacy');
});

beforeEach(async () => {
  await ConsentRecord.destroy({ where: {} });
  await GuardianConsentRequest.destroy({ where: {} });
  await UserPrivacyPreference.destroy({ where: {} });
});

afterAll(async () => {
  await guardianMigration.down(queryInterface);
  await privacyMigration.down(queryInterface);
  await queryInterface.dropTable('editor_workspaces');
  await queryInterface.dropTable('users');
  await database.close();
  jest.dontMock('../config/database');
  jest.dontMock('../models');
  jest.dontMock('../middleware/auth');
});

function appForPrivacy() {
  const app = express();
  app.use(express.json());
  app.use('/api/privacy', privacyRouter);
  return app;
}

describe('guardian privacy controls', () => {
  test('migration matches the guardian request model and indexes lookup paths', async () => {
    const columns = await queryInterface.describeTable('guardian_consent_requests');
    const modelColumns = Object.values(GuardianConsentRequest.rawAttributes).map((attribute) => attribute.field).sort();
    expect(Object.keys(columns).sort()).toEqual(modelColumns);
    const indexes = await queryInterface.showIndex('guardian_consent_requests');
    expect(indexes.map((index) => index.name)).toEqual(expect.arrayContaining([
      'guardian_consent_requests_user_created',
      'guardian_consent_requests_status_expiry',
    ]));
  });

  test('a minor cannot self-grant guardian approval', async () => {
    const app = appForPrivacy();
    const loaded = await request(app).get('/api/privacy/preferences');
    expect(loaded.status).toBe(200);
    expect(loaded.body.preference.parentConsentStatus).toBe('pending');

    const attempted = await request(app)
      .put('/api/privacy/preferences')
      .send({ parentConsentStatus: 'granted' });
    expect(attempted.status).toBe(200);
    expect(attempted.body.preference.parentConsentStatus).toBe('pending');
  });

  test('requires an age confirmation before optional AI consent', async () => {
    const app = appForPrivacy();
    const originalDate = currentUser.dateOfBirth;
    currentUser.dateOfBirth = null;
    try {
      const response = await request(app)
        .post('/api/privacy/consents')
        .send({ type: 'ai_processing', policyVersion: 'privacy-controls-v1' });
      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/date of birth/i);
    } finally {
      currentUser.dateOfBirth = originalDate;
    }
  });

  test('uses a single-use guardian link and records an auditable decision', async () => {
    process.env.FRONTEND_URL = 'https://caplet.example';
    const app = appForPrivacy();
    const created = await request(app)
      .post('/api/privacy/guardian-consent-requests')
      .send({ guardianEmail: 'guardian@example.test', policyVersion: 'privacy-controls-v1' });
    expect(created.status).toBe(201);
    expect(created.body.shareUrl).toMatch(/^https:\/\/caplet\.example\/guardian-consent\//);
    expect(created.body.shareUrl).not.toContain('learner@example.test');
    const token = created.body.shareUrl.split('/').at(-1);

    const publicRequest = await request(app).get(`/api/privacy/guardian-consent/${token}`);
    expect(publicRequest.status).toBe(200);
    expect(publicRequest.body.request).toMatchObject({ status: 'pending', policyVersion: 'privacy-controls-v1' });
    expect(publicRequest.body.request).not.toHaveProperty('guardianEmail');

    const approved = await request(app)
      .post(`/api/privacy/guardian-consent/${token}`)
      .send({ decision: 'granted', guardianName: 'Parent Guardian', guardianAffirmation: true });
    expect(approved.status).toBe(200);
    expect(approved.body.status).toBe('granted');
    expect(await UserPrivacyPreference.findOne({ where: { userId } })).toMatchObject({ parentConsentStatus: 'granted' });
    expect(await ConsentRecord.findOne({ where: { userId, type: 'parental' } })).toMatchObject({
      status: 'granted',
      policyVersion: 'privacy-controls-v1',
    });

    const replay = await request(app)
      .post(`/api/privacy/guardian-consent/${token}`)
      .send({ decision: 'declined', guardianName: 'Parent Guardian', guardianAffirmation: true });
    expect(replay.status).toBe(409);
  });
});
