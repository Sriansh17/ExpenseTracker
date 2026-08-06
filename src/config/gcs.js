const { Storage } = require('@google-cloud/storage');
const { env } = require('./env');

const storage = new Storage(env.gcsProjectId ? { projectId: env.gcsProjectId } : undefined);
const bucket = storage.bucket(env.gcsBucket);

module.exports = { storage, bucket };
