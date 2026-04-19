const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
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

/**
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
  publicObjectUrl,
  getBucket
};
