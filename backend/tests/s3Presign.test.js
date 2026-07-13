const { imageSignatureMatches } = require('../services/s3Presign');

describe('upload image signature validation', () => {
  test.each([
    ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0])],
    ['image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ['image/gif', Buffer.from('GIF89a', 'ascii')],
    ['image/webp', Buffer.from('RIFF0000WEBP', 'ascii')],
  ])('accepts a real %s signature', (mimeType, bytes) => {
    expect(imageSignatureMatches(bytes, mimeType)).toBe(true);
  });

  test('rejects an HTML payload labelled as an image', () => {
    expect(imageSignatureMatches(Buffer.from('<script>alert(1)</script>'), 'image/png')).toBe(false);
  });

  test('does not accept one image format under another MIME type', () => {
    expect(imageSignatureMatches(Buffer.from('GIF89a', 'ascii'), 'image/jpeg')).toBe(false);
  });
});
