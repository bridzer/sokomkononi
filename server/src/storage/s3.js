const path = require('path');
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { UPLOAD_PREFIX } = require('../config/uploads');

function envOr(...names) {
  for (const name of names) {
    const value = (process.env[name] || '').trim();
    if (value) return value;
  }
  return '';
}

function required(...names) {
  const value = envOr(...names);
  if (!value) {
    throw new Error(`Missing required env var for S3 storage: ${names[0]}`);
  }
  return value;
}

let client;
let bucket;
let publicBaseUrl;

function resolveForcePathStyle() {
  if (process.env.S3_FORCE_PATH_STYLE === 'true') return true;
  if (process.env.S3_FORCE_PATH_STYLE === 'false') return false;
  const urlStyle = envOr('AWS_S3_URL_STYLE').toLowerCase();
  if (urlStyle === 'path') return true;
  if (urlStyle === 'virtual') return false;
  // Railway's current default is virtual-hosted style.
  return false;
}

function resolvePublicBaseUrl() {
  const explicit = envOr('S3_PUBLIC_BASE_URL').replace(/\/+$/, '');
  if (explicit) return explicit;

  const appBase = envOr('APP_BASE_URL', 'CLIENT_URL').replace(/\/+$/, '');
  if (appBase) {
    return `${appBase}${UPLOAD_PREFIX.replace(/\/+$/, '')}`;
  }

  return '';
}

function getClient() {
  if (client) return client;

  bucket = required('S3_BUCKET', 'AWS_S3_BUCKET_NAME', 'BUCKET');
  const region = envOr('S3_REGION', 'AWS_DEFAULT_REGION', 'REGION') || 'auto';
  const endpoint = envOr('S3_ENDPOINT', 'AWS_ENDPOINT_URL', 'ENDPOINT');

  publicBaseUrl = resolvePublicBaseUrl();
  if (!publicBaseUrl) {
    console.warn(
      '[storage:s3] S3_PUBLIC_BASE_URL / APP_BASE_URL not set — image URLs will use /uploads/ paths'
    );
  }

  client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    forcePathStyle: resolveForcePathStyle(),
    credentials: {
      accessKeyId: required('S3_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID', 'ACCESS_KEY_ID'),
      secretAccessKey: required(
        'S3_SECRET_ACCESS_KEY',
        'AWS_SECRET_ACCESS_KEY',
        'SECRET_ACCESS_KEY'
      ),
    },
  });

  return client;
}

function publicUrl(key) {
  getClient();
  if (publicBaseUrl) {
    return `${publicBaseUrl}/${key}`;
  }
  return `${UPLOAD_PREFIX}${key}`;
}

function objectKey(filename) {
  return path.basename(filename);
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
    if (url.startsWith(UPLOAD_PREFIX)) return true;
    return publicBaseUrl ? url.startsWith(`${publicBaseUrl}/`) : false;
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
    const key = objectKey(filename);

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
    const key = objectKey(filename);
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
  },

  async readObject(filename) {
    const s3 = getClient();
    const key = objectKey(filename);
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    return {
      body: result.Body,
      contentType: result.ContentType || 'application/octet-stream',
      contentLength: result.ContentLength,
    };
  },

  async headObject(filename) {
    const s3 = getClient();
    const key = objectKey(filename);
    return s3.send(
      new HeadObjectCommand({
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
