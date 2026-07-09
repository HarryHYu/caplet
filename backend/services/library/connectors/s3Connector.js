/**
 * S3Connector — read resource files from an S3-compatible bucket.
 *
 * Works with AWS S3, Cloudflare R2, Backblaze B2, DigitalOcean Spaces, etc.
 * A better production store than Google Drive: real IAM access control, scales
 * to huge volumes, handles large files/images, data residency (pin the region),
 * and uses the AWS SDK caplet already depends on. Point it at R2/others by
 * setting an endpoint.
 *
 * Env:
 *   LIBRARY_S3_BUCKET     bucket name (required)
 *   LIBRARY_S3_PREFIX     optional key prefix / "folder" to read from
 *   LIBRARY_S3_REGION     region (default: AWS_REGION or 'ap-southeast-2')
 *   LIBRARY_S3_ENDPOINT   optional; set for R2/other S3-compatible stores
 *                         (e.g. https://<accountid>.r2.cloudflarestorage.com)
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY   credentials (already used by caplet)
 */

const path = require('path');
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { BaseConnector } = require('./baseConnector');
const { MIME_BY_EXT, TEXT_EXTS } = require('./localFolderConnector');

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

class S3Connector extends BaseConnector {
  /** @param {{bucket?, prefix?, region?, endpoint?}} opts */
  constructor({ bucket, prefix, region, endpoint } = {}) {
    super();
    this.bucket = bucket || process.env.LIBRARY_S3_BUCKET;
    if (!this.bucket) throw new Error('S3Connector requires a bucket (set LIBRARY_S3_BUCKET).');
    this.prefix = prefix || process.env.LIBRARY_S3_PREFIX || '';
    this.region = region || process.env.LIBRARY_S3_REGION || process.env.AWS_REGION || 'ap-southeast-2';
    const endpointUrl = endpoint || process.env.LIBRARY_S3_ENDPOINT || undefined;
    this.client = new S3Client({
      region: this.region,
      // forcePathStyle helps with R2 and most S3-compatible providers.
      ...(endpointUrl ? { endpoint: endpointUrl, forcePathStyle: true } : {}),
    });
  }

  async listResources() {
    const out = [];
    let token;
    do {
      const res = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: this.prefix || undefined,
        ContinuationToken: token,
      }));
      for (const obj of res.Contents || []) {
        if (!obj.Key || obj.Key.endsWith('/')) continue; // skip "folder" markers
        const name = obj.Key.split('/').pop();
        if (!name || name.startsWith('.') || name.toLowerCase() === 'readme.md') continue;
        const ext = path.extname(name).toLowerCase();
        out.push({
          id: obj.Key, // the S3 key is the stable id
          name,
          mimeType: MIME_BY_EXT[ext] || 'application/octet-stream',
          checksum: (obj.ETag || '').replace(/"/g, '') || String(obj.LastModified),
        });
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return out;
  }

  async fetchResource(ref) {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: ref.id }));
    const buffer = await streamToBuffer(res.Body);
    const ext = path.extname(ref.name).toLowerCase();
    if (TEXT_EXTS.has(ext)) return { ...ref, text: buffer.toString('utf8') };
    return { ...ref, buffer };
  }
}

module.exports = { S3Connector };
