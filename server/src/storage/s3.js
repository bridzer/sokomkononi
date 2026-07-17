const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { UPLOAD_PREFIX } = require('../config/uploads');

function required(name) {
  const value = (process.env[name] || '').trim();
  if (!value) {
    throw new Error(`Missing required env var for S3 storage: ${name}`);
  }
  return value;
}

let client;
let bucket;
let publicBaseUrl;

function getClient() {
  if (client) return client;

  bucket = required('S3_BUCKET');
  const region = (process.env.S3_REGION || 'auto').trim();
  const endpoint = (process.env.S3_ENDPOINT || '').trim();

  publicBaseUrl = (process.env.S3_PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
  if (!publicBaseUrl && endpoint) {
    // R2 / custom endpoints need an explicit public URL
    console.warn(
      '[storage:s3] S3_PUBLIC_BASE_URL is not set — falling back to endpoint/bucket URLs (may not be public)'
    );
    publicBaseUrl = `${endpoint.replace(/\/+$/, '')}/${bucket}`;
  }

  client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle: Boolean(process.env.S3_FORCE_PATH_STYLE === 'true'),
    credentials: {
      accessKeyId: required('S3_ACCESS_KEY_ID'),
      secretAccessKey: required('S3_SECRET_ACCESS_KEY'),
    },
  });

  return client;
}

function publicUrl(key) {
  getClient();
  return `${publicBaseUrl}/${key}`;
}

module.exports = {
  type: 's3',
  useMemoryUpload: true,

  getPublicUrl(key) {
    return publicUrl(key);
  },

  isManagedUrl(url) {
    if (typeof url !== 'string') return false;
    getClient();
    return url.startsWith(publicBaseUrl + '/') || url.startsWith(UPLOAD_PREFIX);
  },

  async saveFromDisk(file) {
    return this.saveFromBuffer({
      buffer: file.buffer,
      filename: file.filename || file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
  },

  async saveFromBuffer({ buffer, filename, mimetype, size }) {
    const s3 = getClient();
    const key = path.basename(filename);

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype || 'application/octet-stream',
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );

    const url = publicUrl(key);
    console.log(`[storage:s3] uploaded ${key} (${size || buffer.length} bytes) -> ${url}`);

    return {
      url,
      filename: key,
      size: size || buffer.length,
      mimetype,
    };
  },

  async delete(filename) {
    const s3 = getClient();
    const key = path.basename(filename);
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  },

  exists(_urlOrFilename) {
    // External object storage — assume URL in DB is valid
    return true;
  },
};
