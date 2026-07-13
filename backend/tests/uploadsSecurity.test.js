const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');

const mockModels = {
  Classroom: {},
  ClassMembership: { findOne: jest.fn(), findAll: jest.fn() },
  Lesson: { findByPk: jest.fn() },
  Course: { findByPk: jest.fn() },
  Module: {},
  UploadedAsset: { create: jest.fn(), findByPk: jest.fn() },
  Assignment: { findOne: jest.fn() },
  TeacherProfile: { findOne: jest.fn() },
};
const mockUserModel = { findByPk: jest.fn() };
const mockS3 = {
  presignPost: jest.fn(),
  publicObjectUrl: jest.fn(),
  completeQuarantinedUpload: jest.fn(),
  deleteOwnedObject: jest.fn(),
  SIZE_LIMITS: {
    avatar: 3 * 1024 * 1024,
    classLogo: 3 * 1024 * 1024,
    classBanner: 5 * 1024 * 1024,
    lessonImage: 10 * 1024 * 1024,
    courseCover: 5 * 1024 * 1024,
  },
};

jest.mock('../models', () => mockModels);
jest.mock('../models/User', () => mockUserModel);
jest.mock('../services/s3Presign', () => mockS3);
jest.mock('../middleware/auth', () => ({ JWT_SECRET: 'upload-test-secret' }));
jest.mock('../middleware/editorAuth', () => ({ resolveEditorWorkspaceId: jest.fn() }));

const uploadsRouter = require('../routes/uploads');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const LESSON_ID = '33333333-3333-4333-8333-333333333333';
const COURSE_ID = '44444444-4444-4444-8444-444444444444';
const CLASSROOM_ID = '55555555-5555-4555-8555-555555555555';
const ASSET_ID = '66666666-6666-4666-8666-666666666666';

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/api/uploads', uploadsRouter);
  return instance;
}

function auth(userId = USER_ID) {
  return `Bearer ${jwt.sign({ userId }, 'upload-test-secret')}`;
}

function lessonRecord(workspaceId = 'workspace-1') {
  return {
    id: LESSON_ID,
    module: {
      course: { id: COURSE_ID, workspaceId },
    },
  };
}

describe('upload ownership and quarantine lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_S3_BUCKET = 'test-bucket';
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    mockUserModel.findByPk.mockResolvedValue({ id: USER_ID, role: 'instructor' });
    mockModels.Lesson.findByPk.mockResolvedValue(lessonRecord());
    mockModels.TeacherProfile.findOne.mockResolvedValue({ id: 'profile-1', status: 'verified' });
    mockModels.ClassMembership.findAll.mockResolvedValue([{ classroomId: CLASSROOM_ID }]);
    mockModels.Assignment.findOne.mockResolvedValue({ id: 'assignment-1' });
    mockModels.UploadedAsset.create.mockImplementation(async (values) => ({ id: ASSET_ID, ...values }));
    mockS3.presignPost.mockResolvedValue({
      uploadUrl: 'https://s3.example.test/form',
      fields: { key: 'quarantine/key' },
      expiresIn: 300,
      maxBytes: 10 * 1024 * 1024,
    });
    mockS3.deleteOwnedObject.mockResolvedValue(undefined);
  });

  afterAll(() => {
    delete process.env.AWS_S3_BUCKET;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  test('rejects a role-only instructor without a verified profile', async () => {
    mockModels.TeacherProfile.findOne.mockResolvedValue(null);
    const response = await request(app())
      .post('/api/uploads/presign')
      .set('Authorization', auth())
      .send({ purpose: 'lessonImage', mimeType: 'image/png', lessonId: LESSON_ID });

    expect(response.status).toBe(403);
    expect(mockS3.presignPost).not.toHaveBeenCalled();
    expect(mockModels.UploadedAsset.create).not.toHaveBeenCalled();
  });

  test('rejects a verified instructor with no class assignment for the content', async () => {
    mockModels.Assignment.findOne.mockResolvedValue(null);
    const response = await request(app())
      .post('/api/uploads/presign')
      .set('Authorization', auth())
      .send({ purpose: 'lessonImage', mimeType: 'image/png', lessonId: LESSON_ID });

    expect(response.status).toBe(403);
    expect(mockS3.presignPost).not.toHaveBeenCalled();
  });

  test('issues an owned quarantine upload without exposing a public URL', async () => {
    const response = await request(app())
      .post('/api/uploads/presign')
      .set('Authorization', auth())
      .send({ purpose: 'lessonImage', mimeType: 'image/png', lessonId: LESSON_ID });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      assetId: ASSET_ID,
      publicUrl: null,
      status: 'presigned',
      visibility: 'quarantined',
    });
    expect(response.body.key).toMatch(/^quarantine\/uploads\/lessons\//);
    expect(mockS3.publicObjectUrl).not.toHaveBeenCalled();
    expect(mockModels.UploadedAsset.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: USER_ID,
      lessonId: LESSON_ID,
      key: expect.stringMatching(/^quarantine\//),
      finalKey: expect.stringMatching(/^uploads\/lessons\//),
      status: 'presigned',
    }));
  });

  test('only the owning user can complete and publish an upload', async () => {
    const asset = {
      id: ASSET_ID,
      userId: OTHER_USER_ID,
      workspaceId: null,
      status: 'presigned',
      key: 'quarantine/uploads/users/other/avatar.png',
      finalKey: 'uploads/users/other/avatar.png',
      mimeType: 'image/png',
      purpose: 'avatar',
      update: jest.fn(),
    };
    mockModels.UploadedAsset.findByPk.mockResolvedValue(asset);

    const denied = await request(app())
      .post(`/api/uploads/${ASSET_ID}/complete`)
      .set('Authorization', auth());
    expect(denied.status).toBe(404);
    expect(mockS3.completeQuarantinedUpload).not.toHaveBeenCalled();

    asset.userId = USER_ID;
    mockS3.completeQuarantinedUpload.mockResolvedValue({
      key: asset.finalKey,
      sizeBytes: 1024,
    });
    mockS3.publicObjectUrl.mockReturnValue('https://cdn.example.test/uploads/users/avatar.png');
    const completed = await request(app())
      .post(`/api/uploads/${ASSET_ID}/complete`)
      .set('Authorization', auth());

    expect(completed.status).toBe(200);
    expect(mockS3.completeQuarantinedUpload).toHaveBeenCalledWith(expect.objectContaining({
      quarantineKey: asset.key,
      finalKey: asset.finalKey,
      mimeType: 'image/png',
    }));
    expect(asset.update).toHaveBeenCalledWith({ key: asset.finalKey, status: 'ready' });
    expect(mockS3.deleteOwnedObject).toHaveBeenCalledWith(asset.key);
    expect(completed.body).toMatchObject({
      status: 'ready',
      publicUrl: 'https://cdn.example.test/uploads/users/avatar.png',
    });
  });
});
