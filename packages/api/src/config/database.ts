import { Sequelize } from 'sequelize';
import { config } from './index.js';

// When running under the Playwright test suite, each worker declares TEST_DB_NAME so
// the API server connects to the correct isolated database.  Fall back to the
// standard DB_NAME / config value for all non-test environments.
const dbName =
  process.env.NODE_ENV === 'test' && process.env.TEST_DB_NAME
    ? process.env.TEST_DB_NAME
    : config.database.name;

const sequelize = new Sequelize(
  dbName,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'mysql',
    logging: config.logging.level === 'debug' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

export async function initializeDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.');
    await sequelize.sync();
    console.log('Database synchronized.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}

export default sequelize;
