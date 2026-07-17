const fs = require('fs');
const path = require('path');
const {
  UPLOAD_DIR,
  UPLOAD_PREFIX,
  ensureUploadDir,
  uploadFileExists,
} = require('../config/uploads');

ensureUploadDir();

function localUrl(filename) {
  return `${UPLOAD_PREFIX}${filename}`;
}

module.exports = {
  type: 'local',
  useMemoryUpload: false,

  getPublicUrl(filename) {
    return localUrl(filename);
  },

  isManagedUrl(url) {
    return typeof url === 'string' && url.startsWith(UPLOAD_PREFIX);
  },

  async saveFromDisk(file) {
    return {
      url: localUrl(file.filename),
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  },

  async delete(filename) {
    const filePath = path.join(UPLOAD_DIR, filename);
    try {
      await fs.promises.unlink(filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  },

  exists(urlOrFilename) {
    return uploadFileExists(urlOrFilename);
  },
};
