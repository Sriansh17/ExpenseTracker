const Joi = require('joi');

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
  JWT_SECRET: Joi.string().min(32).required(),
  GCS_BUCKET: Joi.string().min(1).required(),
  GCS_PROJECT_ID: Joi.string().optional(),
  CORS_ORIGIN: Joi.string().default('*')
}).unknown(true);

function loadEnv(source = process.env) {
  const { error, value } = schema.validate(source, { abortEarly: false, convert: true });
  if (error) {
    throw new Error(`Invalid environment configuration: ${error.details.map((d) => d.message).join('; ')}`);
  }
  return {
    nodeEnv: value.NODE_ENV,
    port: value.PORT,
    databaseUrl: value.DATABASE_URL,
    jwtSecret: value.JWT_SECRET,
    gcsBucket: value.GCS_BUCKET,
    gcsProjectId: value.GCS_PROJECT_ID,
    corsOrigin: value.CORS_ORIGIN
  };
}

const env = loadEnv();
module.exports = { env, loadEnv };
