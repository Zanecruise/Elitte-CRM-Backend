const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL && !process.env.LOCAL_DATABASE_URL) {
  dotenv.config();
}

const pickDatabaseUrl = () => {
  const normalize = (value) =>
    typeof value === 'string' ? value.trim() : '';

  const env = normalize(process.env.NODE_ENV).toLowerCase();
  const isProdEnv = env === 'production' || env === 'prod';
  const isCloudRun =
    Boolean(process.env.K_SERVICE) ||
    Boolean(process.env.CLOUD_RUN_JOB) ||
    Boolean(process.env.GOOGLE_CLOUD_PROJECT);

  const useProductionUrl = isProdEnv || isCloudRun;

  const databaseUrl = normalize(
    useProductionUrl
      ? process.env.DATABASE_URL
      : process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL
  );

  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL/LOCAL_DATABASE_URL não configurado(s). Defina as variáveis de ambiente antes de iniciar o servidor.'
    );
  }

  return databaseUrl;
};

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: pickDatabaseUrl(),
    },
  },
});

module.exports = prisma;
