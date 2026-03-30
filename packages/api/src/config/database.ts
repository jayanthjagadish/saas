import { Sequelize } from 'sequelize';
import { config } from './index.js';

const sequelize = new Sequelize(
  config.database.name,
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
