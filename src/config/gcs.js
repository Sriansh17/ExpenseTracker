const { env } = require('./env');

// In production this connects to Google Cloud Storage.
// Locally we provide a stub that always reports "up".
let bucket;

try {
  const { Storage } = require('@google-cloud/storage');
  const storage = new Storage({ projectId: env.gcsProjectId });
  bucket = storage.bucket(env.gcsBucket);
} catch (_) {
  // If GCS isn't configured properly (local dev), use a stub
  bucket = {
    exists: async () => [true],
    name: env.gcsBucket || 'local-dev-bucket',
  };
}

module.exports = { bucket };
