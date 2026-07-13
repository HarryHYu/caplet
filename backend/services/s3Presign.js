const {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectVersionsCommand,
} = require('@aws-sdk/client-s3');
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

function safeOwnedKey(key) {
  const value = String(key || '');
  if (!(value.startsWith('uploads/') || value.startsWith('quarantine/'))
      || value.includes('..') || value.length > 1024) {
    throw new Error('Refusing to delete an invalid upload key');
  }
  return value;
}

function imageSignatureMatches(bytes, mimeType) {
  const buffer = Buffer.from(bytes || []);
  const mime = String(mimeType || '').toLowerCase();
  if (mime === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mime === 'image/png') {
    return buffer.length >= 8
      && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mime === 'image/webp') {
    return buffer.length >= 12
      && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  if (mime === 'image/gif') {
    const signature = buffer.subarray(0, 6).toString('ascii');
    return signature === 'GIF87a' || signature === 'GIF89a';
  }
  return false;
}

async function responseBodyBuffer(body) {
  if (body?.transformToByteArray) return Buffer.from(await body.transformToByteArray());
  const chunks = [];
  for await (const chunk of body || []) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function completeQuarantinedUpload({ quarantineKey, finalKey, mimeType, maxBytes }) {
  const sourceKey = safeOwnedKey(quarantineKey);
  const destinationKey = safeOwnedKey(finalKey);
  if (!sourceKey.startsWith('quarantine/') || !destinationKey.startsWith('uploads/')) {
    throw new Error('Upload promotion must move from quarantine to the public upload prefix');
  }
  const s3 = getClient();
  const bucket = getBucket();
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: sourceKey }));
  const size = Number(head.ContentLength);
  if (!Number.isFinite(size) || size < 1 || size > Number(maxBytes)) {
    const error = new Error('Uploaded file size did not pass validation');
    error.status = 422;
    throw error;
  }
  if (String(head.ContentType || '').toLowerCase() !== String(mimeType || '').toLowerCase()) {
    const error = new Error('Uploaded file type did not match the requested type');
    error.status = 422;
    throw error;
  }
  const sample = await s3.send(new GetObjectCommand({
    Bucket: bucket,
    Key: sourceKey,
    Range: 'bytes=0-15',
  }));
  if (!imageSignatureMatches(await responseBodyBuffer(sample.Body), mimeType)) {
    const error = new Error('Uploaded file contents did not match a supported image type');
    error.status = 422;
    throw error;
  }
  const copySource = `${bucket}/${sourceKey.split('/').map(encodeURIComponent).join('/')}`;
  await s3.send(new CopyObjectCommand({
    Bucket: bucket,
    CopySource: copySource,
    Key: destinationKey,
    ContentType: mimeType,
    MetadataDirective: 'REPLACE',
    Metadata: { uploadStatus: 'validated' },
  }));
  return { key: destinationKey, sizeBytes: size };
}

async function deleteOwnedObject(key) {
  const safeKey = safeOwnedKey(key);
  await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: safeKey }));
}

/**
 * Delete every registered key for an account, plus the legacy user prefix used
 * before the ownership registry existed. S3 DeleteObjects is idempotent, so a
 * presigned-but-never-uploaded key is safe to include.
 */
async function deleteUserObjects({ userId, keys = [] }) {
  const normalizedUserId = String(userId || '');
  if (!/^[0-9a-f-]{36}$/i.test(normalizedUserId)) {
    throw new Error('A valid user id is required to delete uploaded assets');
  }
  const s3 = getClient();
  const bucket = getBucket();
  const owned = new Set(keys.map(safeOwnedKey));
  const prefix = `uploads/users/${normalizedUserId}/`;
  let continuationToken;
  do {
    const page = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));
    for (const object of page.Contents || []) {
      if (object.Key) owned.add(safeOwnedKey(object.Key));
    }
    if (page.IsTruncated && !page.NextContinuationToken) {
      throw new Error('S3 returned an incomplete upload listing without a continuation token');
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);

  const allKeys = [...owned];
  const versionedTargets = new Map();

  async function collectVersions(prefixToList, exactKey = null) {
    let keyMarker;
    let versionIdMarker;
    const seenMarkers = new Set();
    do {
      const page = await s3.send(new ListObjectVersionsCommand({
        Bucket: bucket,
        Prefix: prefixToList,
        KeyMarker: keyMarker,
        VersionIdMarker: versionIdMarker,
      }));
      for (const item of [...(page.Versions || []), ...(page.DeleteMarkers || [])]) {
        if (!item.Key || !item.VersionId || (exactKey && item.Key !== exactKey)) continue;
        const Key = safeOwnedKey(item.Key);
        versionedTargets.set(`${Key}:${item.VersionId}`, { Key, VersionId: item.VersionId });
      }
      if (page.IsTruncated && !page.NextKeyMarker && !page.NextVersionIdMarker) {
        throw new Error('S3 returned an incomplete version listing without pagination markers');
      }
      keyMarker = page.IsTruncated ? page.NextKeyMarker : undefined;
      versionIdMarker = page.IsTruncated ? page.NextVersionIdMarker : undefined;
      if (page.IsTruncated) {
        const marker = `${keyMarker || ''}:${versionIdMarker || ''}`;
        if (seenMarkers.has(marker)) throw new Error('S3 repeated a version-list pagination marker');
        seenMarkers.add(marker);
      }
    } while (keyMarker || versionIdMarker);
  }

  // Registered assets can live under class/course/lesson prefixes, so inspect
  // each exact key. The legacy user prefix is scanned once for pre-registry
  // avatars. Deleting all VersionIds prevents bucket versioning from retaining
  // recoverable personal files behind a delete marker.
  for (const key of allKeys) await collectVersions(key, key);
  await collectVersions(prefix);

  const targets = [...versionedTargets.values()];
  const keysWithVersions = new Set(targets.map(({ Key }) => Key));
  for (const Key of allKeys) {
    if (!keysWithVersions.has(Key)) targets.push({ Key });
  }

  for (let index = 0; index < targets.length; index += 1000) {
    const chunk = targets.slice(index, index + 1000);
    if (!chunk.length) continue;
    const result = await s3.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: chunk,
        Quiet: true,
      },
    }));
    if (result.Errors?.length) {
      const error = new Error(`Could not delete ${result.Errors.length} uploaded object(s)`);
      error.details = result.Errors.map(({ Key, VersionId, Code }) => ({ Key, VersionId, Code }));
      throw error;
    }
  }
  return { deletedKeys: [...new Set(targets.map(({ Key }) => Key))] };
}

module.exports = {
  presignPut,
  presignPost,
  publicObjectUrl,
  getBucket,
  SIZE_LIMITS,
  deleteUserObjects,
  completeQuarantinedUpload,
  imageSignatureMatches,
  deleteOwnedObject,
};
