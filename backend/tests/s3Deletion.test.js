const mockSend = jest.fn();

class MockCommand {
  constructor(input) {
    this.input = input;
  }
}
class MockListObjectsV2Command extends MockCommand {}
class MockListObjectVersionsCommand extends MockCommand {}
class MockDeleteObjectsCommand extends MockCommand {}

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: class { send(command) { return mockSend(command); } },
  PutObjectCommand: class extends MockCommand {},
  DeleteObjectsCommand: MockDeleteObjectsCommand,
  ListObjectsV2Command: MockListObjectsV2Command,
  HeadObjectCommand: class extends MockCommand {},
  CopyObjectCommand: class extends MockCommand {},
  DeleteObjectCommand: class extends MockCommand {},
  GetObjectCommand: class extends MockCommand {},
  ListObjectVersionsCommand: MockListObjectVersionsCommand,
}));
jest.mock('@aws-sdk/s3-presigned-post', () => ({ createPresignedPost: jest.fn() }));
jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: jest.fn() }));

const { deleteUserObjects } = require('../services/s3Presign');

describe('version-aware uploaded-object erasure', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const registeredKey = 'uploads/classes/class-1/banner.png';
  const legacyKey = `uploads/users/${userId}/avatar.png`;
  const oldOnlyLegacyKey = `uploads/users/${userId}/old-avatar.png`;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_S3_BUCKET = 'privacy-test-bucket';
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
    mockSend.mockImplementation(async (command) => {
      if (command instanceof MockListObjectsV2Command) {
        return { Contents: [{ Key: legacyKey }], IsTruncated: false };
      }
      if (command instanceof MockListObjectVersionsCommand) {
        if (command.input.Prefix === registeredKey) {
          return {
            Versions: [
              { Key: registeredKey, VersionId: 'registered-v2' },
              { Key: registeredKey, VersionId: 'registered-v1' },
            ],
            DeleteMarkers: [{ Key: registeredKey, VersionId: 'registered-marker' }],
            IsTruncated: false,
          };
        }
        if (command.input.Prefix === legacyKey) {
          return {
            Versions: [{ Key: legacyKey, VersionId: 'legacy-v1' }],
            IsTruncated: false,
          };
        }
        return {
          Versions: [
            { Key: legacyKey, VersionId: 'legacy-v1' },
            { Key: oldOnlyLegacyKey, VersionId: 'legacy-old-v1' },
          ],
          IsTruncated: false,
        };
      }
      if (command instanceof MockDeleteObjectsCommand) return { Errors: [] };
      throw new Error(`Unexpected command: ${command.constructor.name}`);
    });
  });

  afterAll(() => {
    delete process.env.AWS_S3_BUCKET;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  test('permanently deletes registered, legacy, non-current, and delete-marker versions', async () => {
    const result = await deleteUserObjects({ userId, keys: [registeredKey] });
    const deletion = mockSend.mock.calls
      .map(([command]) => command)
      .find((command) => command instanceof MockDeleteObjectsCommand);

    expect(deletion.input.Delete.Objects).toEqual(expect.arrayContaining([
      { Key: registeredKey, VersionId: 'registered-v2' },
      { Key: registeredKey, VersionId: 'registered-v1' },
      { Key: registeredKey, VersionId: 'registered-marker' },
      { Key: legacyKey, VersionId: 'legacy-v1' },
      { Key: oldOnlyLegacyKey, VersionId: 'legacy-old-v1' },
    ]));
    expect(deletion.input.Delete.Objects).not.toContainEqual({ Key: registeredKey });
    expect(result.deletedKeys).toEqual(expect.arrayContaining([
      registeredKey,
      legacyKey,
      oldOnlyLegacyKey,
    ]));
  });
});
