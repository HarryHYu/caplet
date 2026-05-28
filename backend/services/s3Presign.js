const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { createPresignedPost } = require('@aws-sdk/s3-presigned-post');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const DEFAULT_REGION = 'ap-southeast-2';
const PRESIGN_EXPIRES_SEC = 300;

let client;

function getClient() {
  if (!client) {
    const region = process.env.AWS_REGION || DEFAULT_REGION;
    client = new S3Client({
      region,
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          }
        : undefined
    });
  }
  return client;
}

function getBucket() {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET is not configured');
  }
  return bucket;
}

/**
 * HTTPS URL for reading an object (browser <img src>). Requires bucket policy allowing
 * s3:GetObject on this prefix — see docs/aws-s3-setup.md
 */
function publicObjectUrl(key) {
  const bucket = getBucket();
  const region = process.env.AWS_REGION || DEFAULT_REGION;
  const base = process.env.S3_PUBLIC_BASE_URL;
  if (base) {
    return `${base.replace(/\/$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key.split('/').map(encodeURIComponent).join('/')}`;
}

// Per-purpose upload limits (bytes). S3 enforces ContentLengthRange server-side
// so even a malicious client cannot bypass these after receiving a presigned URL.
const SIZE_LIMITS = {
  avatar: 3 * 1024 * 1024,      // 3 MB
  classLogo: 3 * 1024 * 1024,   // 3 MB
  classBanner: 5 * 1024 * 1024, // 5 MB
  lessonImage: 10 * 1024 * 1024, // 10 MB
  courseCover: 5 * 1024 * 1024, // 5 MB
};
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MB fallback

/**
 * Presigned POST — enforces ContentLengthRange so S3 rejects oversized uploads
 * regardless of what the client sends.
 *
 * Returns { uploadUrl, fields, publicUrl, expiresIn, maxBytes }.
 * The frontend must POST a multipart/form-data body with all `fields` included
 * BEFORE the file field.
 *
 * @param {string} key
 * @param {string} contentType
 * @param {string} purpose  - used to look up the size limit
 */
async function presignPost(key, contentType, purpose) {
  const s3 = getClient();
  const bucket = getBucket();
  const maxBytes = SIZE_LIMITS[purpose] ?? DEFAULT_MAX_BYTES;

  const { url, fields } = await createPresignedPost(s3, {
    Bucket: bucket,
    Key: key,
    Conditions: [
      ['content-length-range', 1, maxBytes],
      ['eq', '$Content-Type', contentType],
    ],
    Fields: { 'Content-Type': contentType },
    Expires: PRESIGN_EXPIRES_SEC,
  });

  return { uploadUrl: url, fields, expiresIn: PRESIGN_EXPIRES_SEC, maxBytes };
}

/**
 * Legacy PUT presign (no size enforcement) — kept for any existing callers.
 * New code should use presignPost.
 *
 * @param {string} key - S3 object key
 * @param {string} contentType - e.g. image/jpeg
 * @returns {Promise<{ uploadUrl: string, expiresIn: number }>}
 */
async function presignPut(key, contentType) {
  const s3 = getClient();
  const bucket = getBucket();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: PRESIGN_EXPIRES_SEC });
  return { uploadUrl, expiresIn: PRESIGN_EXPIRES_SEC };
}

module.exports = {
  presignPut,
  presignPost,
  publicObjectUrl,
  getBucket,
  SIZE_LIMITS,
};
